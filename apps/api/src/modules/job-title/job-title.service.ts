import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobTitleStatus } from '@prisma/client';
import { CreateJobTitleDto, UpdateJobTitleDto } from './job-title.dto';

@Injectable()
export class JobTitleService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    isDeleted?: boolean;
  }) {
    const {
      page = 1,
      limit = 50,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      isDeleted = false,
    } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: isDeleted ? { not: null } : null,
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.jobTitle.findMany({
        where,
        include: {
          _count: { select: { employees: true } },
          createdBy: { select: { id: true, username: true } },
          updatedBy: { select: { id: true, username: true } },
        },
        orderBy: (() => {
          switch (sortBy) {
            case 'createdBy':
              return { createdBy: { username: order } };
            case 'updatedBy':
              return { updatedBy: { username: order } };
            case 'employeeCount':
              return { employees: { _count: order } };
            default:
              return { [sortBy]: order };
          }
        })(),
        skip,
        take: Number(limit),
      }),
      this.prisma.jobTitle.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findOne(id: string) {
    const jobTitle = await this.prisma.jobTitle.findUnique({
      where: { id },
      include: {
        jobDescriptions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
        createdBy: { select: { id: true, username: true } },
        updatedBy: { select: { id: true, username: true } },
      },
    });
    if (!jobTitle) throw new NotFoundException('Job title not found');
    return jobTitle;
  }

  async create(dto: CreateJobTitleDto, user?: any) {
    const exists = await this.prisma.jobTitle.findUnique({
      where: { code: dto.code },
    });
    if (exists) throw new ConflictException('Job title code already exists');

    return this.prisma.jobTitle.create({
      data: {
        ...dto,
        status: (dto.status as JobTitleStatus) || undefined,
        createdById: user?.id,
        updatedById: user?.id,
      },
    });
  }

  async update(id: string, dto: UpdateJobTitleDto, user?: any) {
    await this.findOne(id);
    return this.prisma.jobTitle.update({
      where: { id },
      data: {
        ...dto,
        status: (dto.status as JobTitleStatus) || undefined,
        updatedById: user?.id,
      },
    });
  }

  async delete(id: string, userId?: string) {
    const item = await this.findOne(id);

    // Check usage
    const count = await this.prisma.employee.count({
      where: { jobTitleId: id, deletedAt: null },
    });
    if (count > 0)
      throw new ConflictException(
        `Cannot delete: Assigned to ${count} active employees`,
      );

    const { v4: uuidv4 } = await import('uuid');
    const batchId = uuidv4();
    const now = new Date();

    return this.prisma.jobTitle.update({
      where: { id },
      data: {
        code: `${item.code}_DELETED_${now.getTime()}`,
        deletedAt: now,
        deletedById: userId || null,
        deletedBatchId: batchId,
      },
    });
  }

  async bulkDelete(ids: string[], userId?: string) {
    if (!ids || ids.length === 0) return { success: 0, failed: 0, errors: [] };

    const results = { success: 0, failed: 0, errors: [] as string[] };
    for (const id of ids) {
      try {
        await this.delete(id, userId);
        results.success++;
      } catch (error: any) {
        results.failed++;
        const msg =
          error instanceof ConflictException ||
          error instanceof NotFoundException
            ? error.message
            : 'Lỗi hệ thống khi xóa';
        results.errors.push(`ID ${id}: ${msg}`);
      }
    }
    return results;
  }

  async restore(id: string) {
    const jobTitle = await this.prisma.jobTitle.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!jobTitle) {
      throw new NotFoundException('Job title not found');
    }

    if (!jobTitle.deletedAt) {
      throw new ConflictException('Job title is not deleted');
    }

    // Try to restore original code
    const originalCode = jobTitle.code.replace(/_DELETED_\d+$/, '');

    // Check if original code exists in active records
    const existingActive = await this.prisma.jobTitle.findFirst({
      where: {
        code: originalCode,
        deletedAt: null,
      },
    });

    if (existingActive) {
      throw new ConflictException(
        'Cannot restore: A job title with the original code already exists',
      );
    }

    return this.prisma.jobTitle.update({
      where: { id },
      data: {
        code: originalCode,
        deletedAt: null,
        deletedById: null,
        deletedBatchId: null,
      },
    });
  }

  async forceDelete(id: string) {
    const jobTitle = await this.prisma.jobTitle.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!jobTitle) {
      throw new NotFoundException('Job title not found');
    }

    if (!jobTitle.deletedAt) {
      throw new ConflictException(
        'Job title is not deleted. Please delete it first before forcing deletion.',
      );
    }

    // Prisma string IDs: JobTitle has employees relation, jobDescriptions relation.
    // Ensure you cascade delete job descriptions first unless configured in Prisma.
    // It's safer to delete child records if not cascaded, but assuming standard cascade or no restricted FKs for now.
    await this.prisma.jobDescription.deleteMany({
      where: { jobTitleId: id },
    });

    return this.prisma.jobTitle.delete({
      where: { id },
    });
  }
}
