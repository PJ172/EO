import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface SectionQueryDto {
  search?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  departmentId?: string;
  page?: number;
  limit?: number;
  isDeleted?: boolean;
  excludeFromFilters?: string;
}

export interface CreateSectionDto {
  code: string;
  name: string;
  departmentId?: string;
  managerEmployeeId?: string;
  note?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  showOnOrgChart?: boolean;
}

export type UpdateSectionDto = Partial<CreateSectionDto>;

@Injectable()
export class SectionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSectionDto, userId?: string) {
    const code = dto.code?.toUpperCase().trim();
    if (code && !/^BP\d{5}$/.test(code)) {
      throw new ConflictException(
        'Mã bộ phận phải có định dạng BP + 5 chữ số (VD: BP00001)',
      );
    }
    try {
      return await this.prisma.section.create({
        data: {
          ...dto,
          code,
          name: dto.name ? dto.name.toUpperCase().trim() : dto.name,
          createdById: userId,
          updatedById: userId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Mã bộ phận đã tồn tại');
      }
      throw error;
    }
  }

  async findAll(query: SectionQueryDto) {
    const {
      search,
      status,
      sort,
      order,
      departmentId,
      page = 1,
      limit = 50,
      isDeleted = false,
      excludeFromFilters,
    } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: Prisma.SectionWhereInput = {
      deletedAt: isDeleted ? { not: null } : null,
    };
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status as any;
    if (excludeFromFilters !== undefined) {
      where.excludeFromFilters = excludeFromFilters === 'true';
    }
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    const orderBy: any = sort
      ? sort === 'department'
        ? { department: { name: order || 'asc' } }
        : sort === 'createdBy'
          ? { createdBy: { username: order || 'asc' } }
          : { [sort]: order || 'asc' }
      : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.section.findMany({
        where,
        include: {
          department: { select: { id: true, name: true, code: true } },
          manager: { 
            where: { deletedAt: null },
            select: { id: true, fullName: true, avatar: true } 
          },
          createdBy: { select: { id: true, username: true, email: true } },
          updatedBy: { select: { id: true, username: true, email: true } },
          _count: { select: { employees: { where: { deletedAt: null, employmentStatus: { not: 'RESIGNED' } } } } },
        },
        orderBy,
        skip,
        take: Number(limit),
      }),
      this.prisma.section.count({ where }),
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
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, code: true } },
        manager: { 
          where: { deletedAt: null },
          select: { id: true, fullName: true, avatar: true } 
        },
        createdBy: { select: { id: true, username: true, email: true } },
        updatedBy: { select: { id: true, username: true, email: true } },
        _count: { select: { employees: { where: { deletedAt: null, employmentStatus: { not: 'RESIGNED' } } } } },
      },
    });
    if (!section) throw new NotFoundException('Bộ phận không tồn tại');
    return section;
  }

  async update(id: string, dto: UpdateSectionDto, userId?: string) {
    await this.findOne(id);
    const code = dto.code?.toUpperCase().trim();
    if (code && !/^BP\d{5}$/.test(code)) {
      throw new ConflictException(
        'Mã bộ phận phải có định dạng BP + 5 chữ số (VD: BP00001)',
      );
    }
    try {
      return await this.prisma.section.update({
        where: { id },
        data: {
          ...dto,
          code,
          name: dto.name ? dto.name.toUpperCase().trim() : dto.name,
          updatedById: userId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Mã bộ phận đã tồn tại');
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string) {
    const item = await this.findOne(id);
    const { v4: uuidv4 } = await import('uuid');
    const batchId = uuidv4();
    const now = new Date();
    return this.prisma.section.update({
      where: { id },
      data: {
        code: `${item.code}_DELETED_${now.getTime()}`,
        deletedAt: now,
        deletedById: userId || null,
        deletedBatchId: batchId,
      },
    });
  }

  async restore(id: string) {
    const section = await this.prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('Bộ phận không tồn tại');
    if (!section.deletedAt) throw new ConflictException('Bộ phận chưa bị xóa');
    const originalCode = section.code.replace(/_DELETED_\d+$/, '');
    const existing = await this.prisma.section.findFirst({
      where: { code: originalCode, deletedAt: null },
    });
    if (existing)
      throw new ConflictException('Không thể khôi phục: mã bộ phận đã tồn tại');
    return this.prisma.section.update({
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
    const section = await this.prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('Bộ phận không tồn tại');
    if (!section.deletedAt) throw new ConflictException('Hãy xóa mềm trước');
    return this.prisma.section.delete({ where: { id } });
  }
}
