import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-generate code = prefix(2) + seq(5) padded
   * e.g. NM → NM00001, NM00002...
   */
  private async generateCode(prefix: string): Promise<string> {
    const p = prefix.toUpperCase();
    const last = await this.prisma.location.findFirst({
      where: { code: { startsWith: p } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const nextSeq = last ? parseInt(last.code.slice(2), 10) + 1 : 1;
    if (nextSeq > 99999) throw new ConflictException(`Đã đạt giới hạn mã vị trí cho prefix ${p}`);
    return `${p}${nextSeq.toString().padStart(5, '0')}`;
  }

  async findAll(params: {
    search?: string;
    status?: string;
    prefix?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const { search, status, prefix, sortBy = 'createdAt', order = 'desc', page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { detail: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (prefix) where.prefix = prefix.toUpperCase();

    const [data, total] = await Promise.all([
      this.prisma.location.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          createdBy: { select: { id: true, username: true } },
          updatedBy: { select: { id: true, username: true } },
        },
      }),
      this.prisma.location.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const item = await this.prisma.location.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, username: true } },
        updatedBy: { select: { id: true, username: true } },
      },
    });
    if (!item) throw new NotFoundException('Không tìm thấy vị trí');
    return item;
  }

  async create(dto: CreateLocationDto, userId?: string) {
    const code = await this.generateCode(dto.prefix);
    return this.prisma.location.create({
      data: {
        code,
        prefix: dto.prefix.toUpperCase(),
        name: dto.name,
        detail: dto.detail,
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

  async update(id: string, dto: UpdateLocationDto, userId?: string) {
    await this.findOne(id);
    return this.prisma.location.update({
      where: { id },
      data: {
        name: dto.name,
        detail: dto.detail,
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
    await this.prisma.location.delete({ where: { id } });
    return { success: true };
  }

  async bulkDelete(ids: string[]) {
    let success = 0;
    const errors: string[] = [];
    for (const id of ids) {
      try {
        await this.prisma.location.delete({ where: { id } });
        success++;
      } catch {
        errors.push(id);
      }
    }
    return { success, failed: errors.length, errors };
  }
}
