import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  // Auto-generate code: DM00001..DM99999
  private async generateCode(): Promise<string> {
    const last = await this.prisma.category.findFirst({
      where: { code: { startsWith: 'DM' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const nextSeq = last ? parseInt(last.code.slice(2), 10) + 1 : 1;
    if (nextSeq > 99999) throw new ConflictException('Đã đạt giới hạn mã danh mục (DM99999)');
    return `DM${nextSeq.toString().padStart(5, '0')}`;
  }

  async findAll(params: {
    search?: string;
    status?: string;
    type?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const { search, status, type, sortBy = 'createdAt', order = 'desc', page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (type) where.type = { contains: type, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          createdBy: { select: { id: true, username: true } },
          updatedBy: { select: { id: true, username: true } },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const item = await this.prisma.category.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, username: true } },
        updatedBy: { select: { id: true, username: true } },
      },
    });
    if (!item) throw new NotFoundException('Không tìm thấy danh mục');
    return item;
  }

  async create(dto: CreateCategoryDto, userId?: string) {
    const code = await this.generateCode();
    return this.prisma.category.create({
      data: {
        code,
        name: dto.name,
        type: dto.type,
        status: dto.status || 'ACTIVE',
        description: dto.description,
        note: dto.note,
        createdById: userId,
        updatedById: userId,
      },
      include: {
        createdBy: { select: { id: true, username: true } },
        updatedBy: { select: { id: true, username: true } },
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto, userId?: string) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        status: dto.status,
        description: dto.description,
        note: dto.note,
        updatedById: userId,
      },
      include: {
        createdBy: { select: { id: true, username: true } },
        updatedBy: { select: { id: true, username: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  async bulkDelete(ids: string[]) {
    let success = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        await this.prisma.category.delete({ where: { id } });
        success++;
      } catch {
        errors.push(id);
      }
    }
    return { success, failed: errors.length, errors };
  }
}
