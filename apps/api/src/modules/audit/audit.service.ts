import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Action } from './audit.enums';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    actorUserId?: string;
    action: Action;
    entityType: string;
    entityId: string;
    ip?: string;
    userAgent?: string;
    computerName?: string;
    beforeJson?: any;
    afterJson?: any;
  }) {
    // Convert string action to Prisma Enum if needed or ensure types match
    const actionEnum = data.action as unknown as AuditAction;

    return this.prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId,
        action: actionEnum,
        entityType: data.entityType,
        entityId: data.entityId,
        ip: data.ip,
        userAgent: data.userAgent,
        computerName: data.computerName,
        beforeJson: data.beforeJson ?? undefined,
        afterJson: data.afterJson ?? undefined,
      },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 20,
      userId,
      action,
      entityType,
      from,
      to,
      sortBy = 'createdAt',
      order = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) {
      where.actorUserId = userId;
    }

    if (action) {
      const actions = action.split(',').filter(Boolean) as AuditAction[];
      if (actions.length > 0) {
        where.action = { in: actions };
      }
    }

    if (entityType) {
      const types = entityType.split(',').filter(Boolean);
      if (types.length > 0) {
        where.entityType = { in: types };
      }
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    // Handle sorting relation fields like actor.username
    let orderBy: any = {};
    if (sortBy === 'actor.username') {
      orderBy = { actor: { username: order } };
    } else {
      orderBy = { [sortBy]: order };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy,
      }),
      this.prisma.auditLog.count({ where }),
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
}
