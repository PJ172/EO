import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFactoryDto,
  UpdateFactoryDto,
  FactoryQueryDto,
} from './dto/factory.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FactoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFactoryDto, userId?: string) {
    try {
      return await this.prisma.factory.create({
        data: {
          ...dto,
          createdById: userId,
          updatedById: userId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Mã nhà máy đã tồn tại');
      }
      throw error;
    }
  }

  async findAll(
    query: FactoryQueryDto & {
      page?: number;
      limit?: number;
      isDeleted?: boolean;
      excludeFromFilters?: string;
      companyId?: string;
    },
  ) {
    const {
      search,
      status,
      sort,
      order,
      page = 1,
      limit = 50,
      isDeleted = false,
      excludeFromFilters,
      companyId,
    } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.FactoryWhereInput = {
      deletedAt: isDeleted ? { not: null } : null,
    };

    if (status) {
      where.status = status;
    }

    if (excludeFromFilters !== undefined) {
      const isExclude = excludeFromFilters === 'true';
      where.excludeFromFilters = isExclude;
      
      if (!isExclude) {
        where.AND = [
          {
            OR: [
              { company: null },
              { company: { excludeFromFilters: false } }
            ]
          }
        ];
      }
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sort) {
      if (sort === 'createdBy') {
        orderBy.createdBy = { username: order || 'asc' };
      } else if (sort === 'updatedBy') {
        orderBy.updatedBy = { username: order || 'asc' };
      } else {
        orderBy[sort] = order || 'asc';
      }
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.factory.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          createdBy: { select: { username: true, email: true } },
          updatedBy: { select: { username: true, email: true } },
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
          _count: { select: { employees: { where: { deletedAt: null, employmentStatus: { not: 'RESIGNED' } } } } },
        },
        orderBy,
        skip,
        take: Number(limit),
      }),
      this.prisma.factory.count({ where }),
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
    const factory = await this.prisma.factory.findUnique({
      where: { id },
      include: {
        createdBy: { select: { username: true, email: true } },
        updatedBy: { select: { username: true, email: true } },
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
      },
    });
    if (!factory) throw new NotFoundException('Factory not found');
    return factory;
  }

  async update(id: string, dto: UpdateFactoryDto, userId?: string) {
    await this.findOne(id);
    return this.prisma.factory.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
      },
    });
  }

  async remove(id: string, userId?: string) {
    const item = await this.findOne(id);
    const { v4: uuidv4 } = await import('uuid');
    const batchId = uuidv4();
    const now = new Date();

    return this.prisma.factory.update({
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
    const factory = await this.prisma.factory.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!factory) throw new NotFoundException('Factory not found');
    if (!factory.deletedAt)
      throw new ConflictException('Factory is not deleted');

    const originalCode = factory.code.replace(/_DELETED_\d+$/, '');

    const existingActive = await this.prisma.factory.findFirst({
      where: { code: originalCode, deletedAt: null },
    });

    if (existingActive) {
      throw new ConflictException(
        'Cannot restore: A factory with the original code already exists',
      );
    }

    return this.prisma.factory.update({
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
    const factory = await this.prisma.factory.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!factory) throw new NotFoundException('Factory not found');
    if (!factory.deletedAt)
      throw new ConflictException(
        'Factory is not deleted. Please soft-delete it first.',
      );

    return this.prisma.factory.delete({ where: { id } });
  }
}
