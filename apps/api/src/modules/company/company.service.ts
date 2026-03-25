import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CompanyQueryDto {
  search?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  isDeleted?: boolean;
  excludeFromFilters?: string;
}

export interface CreateCompanyDto {
  code: string;
  name: string;
  address?: string;
  note?: string;
  managerEmployeeId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  showOnOrgChart?: boolean;
}

export type UpdateCompanyDto = Partial<CreateCompanyDto>;

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompanyDto, userId?: string) {
    const code = dto.code?.toUpperCase().trim();
    if (code && !/^CT\d{5}$/.test(code)) {
      throw new ConflictException(
        'Mã công ty phải có định dạng CT + 5 chữ số (VD: CT00001)',
      );
    }
    try {
      return await this.prisma.company.create({
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
        throw new ConflictException('Mã công ty đã tồn tại');
      }
      throw error;
    }
  }

  async findAll(query: CompanyQueryDto) {
    const {
      search,
      status,
      sort,
      order,
      page = 1,
      limit = 50,
      isDeleted = false,
      excludeFromFilters,
    } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: Prisma.CompanyWhereInput = {
      deletedAt: isDeleted ? { not: null } : null,
    };
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
      ? sort === 'createdBy'
        ? { createdBy: { username: order || 'asc' } }
        : sort === 'updatedBy'
          ? { updatedBy: { username: order || 'asc' } }
          : { [sort]: order || 'asc' }
      : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: {
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
          _count: { select: { employees: { where: { deletedAt: null, employmentStatus: { not: 'RESIGNED' } } }, factories: { where: { deletedAt: null } } } },
        },
        orderBy,
        skip,
        take: Number(limit),
      }),
      this.prisma.company.count({ where }),
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
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
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
        factories: {
          where: { deletedAt: null },
          select: { id: true, name: true, code: true },
        },
        _count: { select: { employees: { where: { deletedAt: null, employmentStatus: { not: 'RESIGNED' } } } } },
      },
    });
    if (!company) throw new NotFoundException('Công ty không tồn tại');
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, userId?: string) {
    await this.findOne(id);
    const code = dto.code?.toUpperCase().trim();
    if (code && !/^CT\d{5}$/.test(code)) {
      throw new ConflictException(
        'Mã công ty phải có định dạng CT + 5 chữ số (VD: CT00001)',
      );
    }
    try {
      return await this.prisma.company.update({
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
        throw new ConflictException('Mã công ty đã tồn tại');
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string) {
    const item = await this.findOne(id);
    const { v4: uuidv4 } = await import('uuid');
    const batchId = uuidv4();
    const now = new Date();
    return this.prisma.company.update({
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
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Công ty không tồn tại');
    if (!company.deletedAt) throw new ConflictException('Công ty chưa bị xóa');
    const originalCode = company.code.replace(/_DELETED_\d+$/, '');
    const existing = await this.prisma.company.findFirst({
      where: { code: originalCode, deletedAt: null },
    });
    if (existing)
      throw new ConflictException('Không thể khôi phục: mã công ty đã tồn tại');
    return this.prisma.company.update({
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
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Công ty không tồn tại');
    if (!company.deletedAt) throw new ConflictException('Hãy xóa mềm trước');
    return this.prisma.company.delete({ where: { id } });
  }
}
