import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobPositionDto, UpdateJobPositionDto } from './job-position.dto';

@Injectable()
export class JobPositionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }) {
    const { search, status, page = 1, limit = 50, sortBy = 'code', order = 'asc' } = params;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.jobPosition.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          createdBy: { select: { id: true, username: true } },
        },
      }),
      this.prisma.jobPosition.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.jobPosition.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: { id: true, username: true } },
        updatedBy: { select: { id: true, username: true } },
      },
    });
    if (!record) throw new NotFoundException('Không tìm thấy vị trí công việc');
    return record;
  }

  async create(dto: CreateJobPositionDto, userId: string) {
    const exists = await this.prisma.jobPosition.findFirst({ where: { code: dto.code, deletedAt: null } });
    if (exists) throw new ConflictException(`Mã ${dto.code} đã tồn tại`);
    return this.prisma.jobPosition.create({
      data: { ...dto, createdById: userId, updatedById: userId } as any,
    });
  }

  async update(id: string, dto: UpdateJobPositionDto, userId: string) {
    await this.findOne(id);
    return this.prisma.jobPosition.update({
      where: { id },
      data: { ...dto, updatedById: userId } as any,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    return this.prisma.jobPosition.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId },
    });
  }

  async bulkUpdateOrgChart(showOnOrgChart: boolean, userId: string) {
    return this.prisma.jobPosition.updateMany({
      where: { deletedAt: null },
      data: { showOnOrgChart, updatedById: userId },
    });
  }

  async getStats() {
    const [total, active] = await Promise.all([
      this.prisma.jobPosition.count({ where: { deletedAt: null } }),
      this.prisma.jobPosition.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
    ]);
    return { total, active, inactive: total - active };
  }
}
