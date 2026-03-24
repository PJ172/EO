import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface DivisionQueryDto {
  search?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  factoryId?: string;
  page?: number;
  limit?: number;
  isDeleted?: boolean;
  excludeFromFilters?: string;
}

export interface CreateDivisionDto {
  code: string;
  name: string;
  factoryId?: string;
  note?: string;
  managerEmployeeId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export type UpdateDivisionDto = Partial<CreateDivisionDto>;

@Injectable()
export class DivisionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDivisionDto, userId?: string) {
    const code = dto.code?.toUpperCase().trim();
    if (code && !/^KH\d{5}$/.test(code)) {
      throw new ConflictException(
        'Mã khối phải có định dạng KH + 5 chữ số (VD: KH00001)',
      );
    }
    try {
      return await this.prisma.division.create({
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
        throw new ConflictException('Mã khối đã tồn tại');
      }
      throw error;
    }
  }

  async findAll(query: DivisionQueryDto) {
    const {
      search,
      status,
      sort,
      order,
      factoryId,
      page = 1,
      limit = 50,
      isDeleted = false,
      excludeFromFilters,
    } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: Prisma.DivisionWhereInput = {
      deletedAt: isDeleted ? { not: null } : null,
    };
    if (factoryId) where.factoryId = factoryId;
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
      ? sort === 'factory'
        ? { factory: { name: order || 'asc' } }
        : sort === 'createdBy'
          ? { createdBy: { username: order || 'asc' } }
          : { [sort]: order || 'asc' }
      : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.division.findMany({
        where,
        include: {
          factory: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, username: true, email: true } },
          updatedBy: { select: { id: true, username: true, email: true } },
          manager: { 
            where: { deletedAt: null },
            select: { 
              id: true, 
              fullName: true, 
              avatar: true,
              employeeCode: true,
              jobTitle: { select: { id: true, name: true } }
            } 
          },
          _count: { select: { employees: true, departments: true } },
        },
        orderBy,
        skip,
        take: Number(limit),
      }),
      this.prisma.division.count({ where }),
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
    const division = await this.prisma.division.findUnique({
      where: { id },
      include: {
        factory: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, username: true, email: true } },
        updatedBy: { select: { id: true, username: true, email: true } },
        manager: { 
          where: { deletedAt: null },
          select: { 
            id: true, 
            fullName: true, 
            avatar: true,
            employeeCode: true,
            jobTitle: { select: { id: true, name: true } }
          } 
        },
        departments: {
          where: { deletedAt: null },
          select: { id: true, name: true, code: true },
        },
        _count: { select: { employees: true } },
      },
    });
    if (!division) throw new NotFoundException('Khối không tồn tại');
    return division;
  }

  async update(id: string, dto: UpdateDivisionDto, userId?: string) {
    await this.findOne(id);
    const code = dto.code?.toUpperCase().trim();
    if (code && !/^KH\d{5}$/.test(code)) {
      throw new ConflictException(
        'Mã khối phải có định dạng KH + 5 chữ số (VD: KH00001)',
      );
    }
    try {
      return await this.prisma.division.update({
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
        throw new ConflictException('Mã khối đã tồn tại');
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string) {
    const item = await this.findOne(id);
    const { v4: uuidv4 } = await import('uuid');
    const batchId = uuidv4();
    const now = new Date();
    return this.prisma.division.update({
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
    const division = await this.prisma.division.findUnique({ where: { id } });
    if (!division) throw new NotFoundException('Khối không tồn tại');
    if (!division.deletedAt) throw new ConflictException('Khối chưa bị xóa');
    const originalCode = division.code.replace(/_DELETED_\d+$/, '');
    const existing = await this.prisma.division.findFirst({
      where: { code: originalCode, deletedAt: null },
    });
    if (existing)
      throw new ConflictException('Không thể khôi phục: mã khối đã tồn tại');
    return this.prisma.division.update({
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
    const division = await this.prisma.division.findUnique({ where: { id } });
    if (!division) throw new NotFoundException('Khối không tồn tại');
    if (!division.deletedAt) throw new ConflictException('Hãy xóa mềm trước');
    return this.prisma.division.delete({ where: { id } });
  }
}
