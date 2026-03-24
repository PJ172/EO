import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Định nghĩa union type cho VisibilityTargetType để dự phòng trường hợp Prisma Client chưa cập nhật kịp
 */
export type VisibilityTargetType =
  | 'USER'
  | 'DEPT'
  | 'DIV'
  | 'FACT'
  | 'COMP'
  | 'ROLE'
  | 'GLOBAL';

@Injectable()
export class UIConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * Tính toán quyền hiển thị thực tế cho một người dùng dựa trên phân cấp:
   * Cá nhân (USER) > Phòng ban (DEPT) > Khối (DIV) > Nhà máy (FACT) > Công ty (COMP) > Toàn hệ thống (GLOBAL)
   */
  async getEffectiveVisibility(userId: string) {
    // 1. Lấy thông tin tổ chức của User
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          select: { roleId: true },
        },
        employee: {
          select: {
            departmentId: true,
            divisionId: true,
            factoryId: true,
            companyId: true,
          },
        },
      },
    });

    if (!user) return [];

    const emp = user.employee;

    // 2. Lấy tất cả cấu hình hiển thị có thể ảnh hưởng đến user này
    // Sử dụng ép kiểu (this.prisma as any) để tránh lỗi Property không tồn tại khi IDE lag
    const configs = await (this.prisma as any).moduleVisibilityConfig.findMany({
      where: {
        OR: [
          { targetType: 'GLOBAL' },
          { targetType: 'COMP', targetId: emp?.companyId || 'NONE' },
          { targetType: 'FACT', targetId: emp?.factoryId || 'NONE' },
          { targetType: 'DIV', targetId: emp?.divisionId || 'NONE' },
          {
            targetType: 'ROLE',
            targetId: { in: user.roles.map((r) => r.roleId) },
          },
          { targetType: 'DEPT', targetId: emp?.departmentId || 'NONE' },
          { targetType: 'USER', targetId: userId },
        ],
      },
      select: {
        moduleCode: true,
        targetType: true,
        isVisible: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 3. Giải quyết ưu tiên (Priority Resolution)
    const priorityMap: Record<VisibilityTargetType, number> = {
      USER: 6,
      DEPT: 5,
      ROLE: 4,
      DIV: 3,
      FACT: 2,
      COMP: 1,
      GLOBAL: 0,
    };

    const visibilityMap = new Map<
      string,
      { isVisible: boolean; priority: number }
    >();

    configs.forEach((config: any) => {
      const currentPriority =
        priorityMap[config.targetType as VisibilityTargetType];
      const existing = visibilityMap.get(config.moduleCode);

      if (!existing || currentPriority > existing.priority) {
        visibilityMap.set(config.moduleCode, {
          isVisible: config.isVisible,
          priority: currentPriority,
        });
      }
    });

    // Chuyển đổi sang format đơn giản cho Frontend
    return Array.from(visibilityMap.entries()).map(([moduleCode, data]) => ({
      moduleCode,
      isVisible: data.isVisible,
    }));
  }

  /**
   * Lấy cấu hình tường minh cho một đối tượng (Dùng cho Tab Quản trị)
   */
  async getTargetConfigs(
    targetType: VisibilityTargetType,
    targetId: string | null,
  ) {
    const configs = await (this.prisma as any).moduleVisibilityConfig.findMany({
      where: {
        targetType,
        targetId: targetId || null,
      },
      select: {
        moduleCode: true,
        isVisible: true,
      },
    });
    return configs;
  }

  /**
   * Lấy tất cả cấu hình hiển thị đã lưu (Dùng cho Tab Đã lưu/History của Admin)
   * Nhóm theo targetType và targetId
   */
  async getAllSavedConfigs() {
    const rawConfigs = await (
      this.prisma as any
    ).moduleVisibilityConfig.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        updatedBy: {
          select: {
            username: true,
            employee: { select: { fullName: true } },
          },
        },
      },
    });

    // Nhóm lại theo (targetType, targetId) để hiển thị trong Tab Đã lưu
    const grouped = new Map<string, any>();

    rawConfigs.forEach((c: any) => {
      const key = `${c.targetType}_${c.targetId || 'GLOBAL'}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          targetType: c.targetType,
          targetId: c.targetId,
          name: c.name,
          updatedAt: c.updatedAt,
          updatedBy: c.updatedBy,
          modules: [],
        });
      }
      grouped.get(key).modules.push({
        moduleCode: c.moduleCode,
        isVisible: c.isVisible,
      });
    });

    return Array.from(grouped.values());
  }

  /**
   * Thiết lập cấu hình hiển thị cho một đối tượng cụ thể (Admin dùng)
   */
  async setVisibilityConfig(data: {
    moduleCode: string;
    targetType: VisibilityTargetType;
    targetId?: string;
    isVisible: boolean;
    name?: string;
    updatedById?: string;
  }) {
    const existing = await (
      this.prisma as any
    ).moduleVisibilityConfig.findFirst({
      where: {
        moduleCode: data.moduleCode,
        targetType: data.targetType,
        targetId: data.targetId || null,
      },
    });

    if (existing) {
      return (this.prisma as any).moduleVisibilityConfig.update({
        where: { id: existing.id },
        data: {
          isVisible: data.isVisible,
          name: data.name,
          updatedById: data.updatedById,
        },
      });
    }

    return (this.prisma as any).moduleVisibilityConfig.create({
      data: {
        moduleCode: data.moduleCode,
        targetType: data.targetType,
        targetId: data.targetId || null,
        isVisible: data.isVisible,
        name: data.name,
        updatedById: data.updatedById,
      },
    });
  }

  /**
   * Thiết lập hàng loạt (Batch update) cho một Target cụ thể
   */
  async bulkUpdateVisibility(
    targetType: VisibilityTargetType,
    targetId: string | null,
    configs: { moduleCode: string; isVisible: boolean }[],
    name?: string,
    updatedById?: string,
  ) {
    const operations = configs.map(async (config) => {
      const existing = await (
        this.prisma as any
      ).moduleVisibilityConfig.findFirst({
        where: {
          moduleCode: config.moduleCode,
          targetType,
          targetId: targetId || null,
        },
      });

      if (existing) {
        return (this.prisma as any).moduleVisibilityConfig.update({
          where: { id: existing.id },
          data: { isVisible: config.isVisible, name, updatedById },
        });
      }

      return (this.prisma as any).moduleVisibilityConfig.create({
        data: {
          moduleCode: config.moduleCode,
          targetType,
          targetId: targetId || null,
          isVisible: config.isVisible,
          name,
          updatedById,
        },
      });
    });
    return Promise.all(operations);
  }

  /**
   * Xóa toàn bộ cấu hình hiển thị của một đối tượng
   */
  async deleteTargetConfigs(
    targetType: VisibilityTargetType,
    targetId: string | null,
  ) {
    return (this.prisma as any).moduleVisibilityConfig.deleteMany({
      where: {
        targetType,
        targetId: targetId || null,
      },
    });
  }
}
