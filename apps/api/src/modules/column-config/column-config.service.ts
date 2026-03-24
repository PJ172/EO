import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertColumnConfigDto } from './column-config.dto';

@Injectable()
export class ColumnConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * Upsert a column config (admin only).
   * Uses unique constraint [moduleKey, applyTo, targetId] for upsert.
   */
  async upsert(dto: UpsertColumnConfigDto, userId: string) {
    const { moduleKey, columns, applyTo, targetId, name, order } = dto;
    const resolvedTargetId = targetId || '';

    return this.prisma.tableColumnConfig.upsert({
      where: {
        moduleKey_applyTo_targetId: {
          moduleKey,
          applyTo,
          targetId: resolvedTargetId,
        },
      },
      create: {
        moduleKey,
        columns: columns as any,
        name,
        applyTo,
        order: order ?? 0,
        targetId: resolvedTargetId,
        createdById: userId,
        updatedById: userId,
      },
      update: {
        columns: columns as any,
        name,
        ...(order !== undefined && { order }),
        updatedById: userId,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update a column config by ID.
   * Throws if unique constraint is violated.
   */
  async update(id: string, dto: UpsertColumnConfigDto, userId: string) {
    const { moduleKey, columns, applyTo, targetId, name, order } = dto;
    const resolvedTargetId = targetId || '';

    try {
      return await this.prisma.tableColumnConfig.update({
        where: { id },
        data: {
          moduleKey,
          applyTo,
          targetId: resolvedTargetId,
          columns: columns as any,
          name,
          ...(order !== undefined && { order }),
          updatedById: userId,
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error(
          'Đã tồn tại cấu hình cho đối tượng này (Trùng lặp phân quyền).',
        );
      }
      throw error;
    }
  }

  /**
   * Get the effective column config for a user on a specific module.
   * Priority: USER > ROLE > ALL > null (default)
   */
  async getConfig(moduleKey: string, userId: string, userRoleIds: string[]) {
    // 1. Check for user-specific config
    const userConfig = await this.prisma.tableColumnConfig.findFirst({
      where: {
        moduleKey,
        applyTo: 'USER',
        targetId: userId,
      },
    });
    if (userConfig) return userConfig;

    // 2. Check for role-specific configs (pick the first matching role)
    if (userRoleIds.length > 0) {
      const roleConfig = await this.prisma.tableColumnConfig.findFirst({
        where: {
          moduleKey,
          applyTo: 'ROLE',
          targetId: { in: userRoleIds },
        },
        orderBy: { updatedAt: 'desc' },
      });
      if (roleConfig) return roleConfig;
    }

    // 3. Check for ALL config
    const allConfig = await this.prisma.tableColumnConfig.findFirst({
      where: {
        moduleKey,
        applyTo: 'ALL',
      },
    });

    return allConfig || null;
  }

  /**
   * Get all configs for a module (admin view).
   */
  async getAllConfigs(moduleKey: string) {
    return this.prisma.tableColumnConfig.findMany({
      where: { moduleKey },
      include: {
        createdBy: { select: { id: true, username: true, email: true } },
        updatedBy: { select: { id: true, username: true, email: true } },
      },
      orderBy: [{ order: 'asc' }, { applyTo: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  /**
   * Delete a config by ID.
   */
  async deleteConfig(id: string) {
    return this.prisma.tableColumnConfig.delete({
      where: { id },
    });
  }

  /**
   * Bulk reorder configs.
   */
  async reorderConfigs(items: { id: string; order: number }[]) {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.tableColumnConfig.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );
  }
}
