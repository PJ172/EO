import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDocumentDto,
  CreateDocumentVersionDto,
} from './dto/create-document.dto';
import { DocumentStatus } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateDocumentDto) {
    // 1. Create Document
    // 2. Create Initial Version (v1)

    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          type: dto.type,
          title: dto.title,
          category: dto.category,
          tags: dto.tags || [],
          status: DocumentStatus.DRAFT,
          createdById: userId,
        },
      });

      const version = await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNo: 1,
          content: dto.content,
          fileId: dto.fileId,
          createdById: userId,
        },
      });

      // Update current version pointer
      const updatedDoc = await tx.document.update({
        where: { id: doc.id },
        data: { currentVersionId: version.id },
        include: { versions: true },
      });

      return updatedDoc;
    });
  }

  async findAll(isDeleted = false) {
    return this.prisma.document.findMany({
      where: { deletedAt: isDeleted ? { not: null } : null },
      orderBy: { updatedAt: 'desc' },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
      },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
        },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async addVersion(
    documentId: string,
    userId: string,
    dto: CreateDocumentVersionDto,
  ) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    // Find last version number
    const lastVersion = await this.prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNo: 'desc' },
    });

    const nextVersionNo = (lastVersion?.versionNo || 0) + 1;

    const newVersion = await this.prisma.documentVersion.create({
      data: {
        documentId,
        versionNo: nextVersionNo,
        content: dto.content,
        fileId: dto.fileId,
        effectiveDate: dto.effectiveDate,
        createdById: userId,
      },
    });

    // Update current version pointer
    await this.prisma.document.update({
      where: { id: documentId },
      data: { currentVersionId: newVersion.id },
    });

    return newVersion;
  }
  async submit(id: string, userId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status !== DocumentStatus.DRAFT) {
      throw new Error('Only DRAFT documents can be submitted');
    }

    return this.prisma.document.update({
      where: { id },
      data: { status: DocumentStatus.PENDING },
    });
  }

  async approve(id: string, userId: string) {
    // In real app: Check if userId is a valid approver (Manager)
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status !== DocumentStatus.PENDING) {
      throw new Error('Document is not pending approval');
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        status: DocumentStatus.APPROVED,
        // In real app, we might capture who approved it in a separate table or version
      },
    });
  }

  async reject(id: string, userId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status !== DocumentStatus.PENDING) {
      throw new Error('Document is not pending approval');
    }

    return this.prisma.document.update({
      where: { id },
      data: { status: DocumentStatus.REJECTED },
    });
  }

  async delete(id: string, userId?: string) {
    const doc = await this.findOne(id);
    const now = new Date();
    return this.prisma.document.update({
      where: { id },
      data: {
        deletedAt: now,
        deletedById: userId || null,
        deletedBatchId: null,
      },
    });
  }

  async restore(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (!doc.deletedAt) throw new Error('Document is not deleted');

    return this.prisma.document.update({
      where: { id },
      data: { deletedAt: null, deletedById: null, deletedBatchId: null },
    });
  }

  async forceDelete(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (!doc.deletedAt)
      throw new Error('Document is not deleted. Soft-delete first.');

    return this.prisma.document.delete({ where: { id } });
  }
}
