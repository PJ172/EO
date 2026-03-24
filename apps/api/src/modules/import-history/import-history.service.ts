import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LogImportParams {
  moduleKey: string;
  moduleType?: string;
  fileName: string;
  totalRows: number;
  success: number;
  failed: number;
  errors: string[];
  userId?: string;
}

@Injectable()
export class ImportHistoryService {
  // Use (this.prisma as any) until prisma generate can re-run after dev server restart
  constructor(private prisma: PrismaService) {}

  async log(params: LogImportParams) {
    const {
      moduleKey,
      moduleType,
      fileName,
      totalRows,
      success,
      failed,
      errors,
      userId,
    } = params;
    const status =
      failed === 0 ? 'COMPLETED' : success === 0 ? 'FAILED' : 'PARTIAL';

    try {
      return await (this.prisma as any).importHistory.create({
        data: {
          moduleKey,
          moduleType: moduleType ?? null,
          fileName,
          totalRows,
          success,
          failed,
          errors: errors.slice(0, 50),
          status,
          userId: userId ?? null,
        },
      });
    } catch (e) {
      // Non-fatal: logging failure should not break import
      console.warn('[ImportHistory] Failed to log import:', e?.message);
    }
  }

  async findAll(params: {
    moduleKey?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const { moduleKey, userId, page = 1, limit = 20 } = params;
    const where: any = {};
    if (moduleKey) where.moduleKey = moduleKey;
    if (userId) where.userId = userId;

    const db = this.prisma as any;
    const [data, total] = await Promise.all([
      db.importHistory.findMany({
        where,
        include: { user: { select: { username: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.importHistory.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async deleteOne(id: string) {
    return (this.prisma as any).importHistory.delete({ where: { id } });
  }
}
