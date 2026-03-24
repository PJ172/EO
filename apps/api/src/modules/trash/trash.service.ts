import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export type TrashModule =
  | 'employees'
  | 'departments'
  | 'users'
  | 'jobTitles'
  | 'factories'
  | 'documents'
  | 'projects'
  | 'newsArticles'
  | 'itAssets'
  | 'tickets'
  | 'roles'
  | 'tasks'
  | 'files'
  | 'kpi'
  | 'companies'
  | 'divisions'
  | 'sections';

// ─────────────────────────────────────────────────────────
// REGISTRY CONFIG INTERFACE
// ─────────────────────────────────────────────────────────

interface TrashModuleConfig {
  /** Vietnamese display label */
  label: string;
  /** Prisma model accessor name on this.prisma (cast via any) */
  model: string;
  /** Field used as display name in toasts / error messages */
  nameField: string;
  /** Field used for uniqueness code (if the module suffixes code on soft-delete) */
  codeField?: string;
  /** Fields to include when listing trash items */
  include?: Record<string, any>;
  /** Map raw Prisma row → standardised TrashItem shape */
  mapItem: (row: any) => {
    id: string;
    module: TrashModule;
    name: string;
    code?: string;
    extraInfo?: string;
    deletedAt: Date | null;
    deletedBy?: string;
    deletedBatchId?: string | null;
  };
  /**
   * Optional pre-delete hook for hard-delete (e.g. cascade relations).
   * Called BEFORE the main model.delete().
   */
  preHardDelete?: (prisma: PrismaService, id: string) => Promise<void>;
  /**
   * Optional pre-empty hook for emptyTrash (e.g. cascade relations).
   * Called BEFORE the main model.deleteMany().
   */
  preEmpty?: (prisma: PrismaService) => Promise<void>;
}

// ─────────────────────────────────────────────────────────
// REGISTRY
// ─────────────────────────────────────────────────────────

function getVietnameseModuleName(tableName: string): string {
  const map: Record<string, string> = {
    users: 'Tài khoản',
    employees: 'Nhân viên',
    departments: 'Phòng ban',
    jobTitles: 'Chức vụ',
    factories: 'Nhà máy',
    documents: 'Tài liệu',
    projects: 'Dự án',
    newsArticles: 'Bảng tin',
    iTAssets: 'Tài sản IT',
    tickets: 'Phiếu hỗ trợ IT',
    roles: 'Vai trò',
    tasks: 'Công việc',
    files: 'Tệp đính kèm',
    employeeKPIs: 'KPI',
  };
  return map[tableName] || tableName;
}

const REGISTRY: Record<TrashModule, TrashModuleConfig> = {
  employees: {
    label: 'Nhân viên',
    model: 'employee',
    nameField: 'fullName',
    codeField: 'employeeCode',
    include: {
      department: { select: { name: true } },
      deletedBy: { select: { username: true } },
    },
    mapItem: (row) => ({
      id: row.id,
      module: 'employees',
      name: row.fullName,
      code: row.employeeCode,
      extraInfo: row.department?.name || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  departments: {
    label: 'Phòng ban',
    model: 'department',
    nameField: 'name',
    codeField: 'code',
    include: {
      division: { select: { name: true } },
      deletedBy: { select: { username: true } },
    },
    mapItem: (row) => ({
      id: row.id,
      module: 'departments',
      name: row.name,
      code: row.code,
      extraInfo: row.division?.name || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  users: {
    label: 'Tài khoản',
    model: 'user',
    nameField: 'username',
    codeField: 'username',
    include: {
      employee: { select: { fullName: true } },
      deletedByUser: { select: { username: true } },
    },
    mapItem: (row) => ({
      id: row.id,
      module: 'users',
      name: row.username,
      code: row.username,
      extraInfo: row.employee?.fullName || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedByUser?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
    preHardDelete: async (prisma, id) => {
      await prisma.employee.updateMany({
        where: { userId: id },
        data: { userId: null },
      });
    },
  },

  jobTitles: {
    label: 'Chức vụ',
    model: 'jobTitle',
    nameField: 'name',
    codeField: 'code',
    include: { deletedBy: { select: { username: true } } },
    mapItem: (row) => ({
      id: row.id,
      module: 'jobTitles',
      name: row.name,
      code: row.code,
      extraInfo: '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  factories: {
    label: 'Nhà máy',
    model: 'factory',
    nameField: 'name',
    codeField: 'code',
    include: { deletedBy: { select: { username: true } } },
    mapItem: (row) => ({
      id: row.id,
      module: 'factories',
      name: row.name,
      code: row.code,
      extraInfo: row.address || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  documents: {
    label: 'Tài liệu',
    model: 'document',
    nameField: 'title',
    include: { deletedBy: { select: { username: true } } },
    mapItem: (row) => ({
      id: row.id,
      module: 'documents',
      name: row.title,
      extraInfo: row.type || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  projects: {
    label: 'Dự án',
    model: 'project',
    nameField: 'name',
    codeField: 'code',
    include: { deletedBy: { select: { username: true } } },
    mapItem: (row) => ({
      id: row.id,
      module: 'projects',
      name: row.name,
      code: row.code,
      extraInfo: row.status || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  newsArticles: {
    label: 'Bảng tin',
    model: 'newsArticle',
    nameField: 'title',
    include: {
      category: { select: { name: true } },
      deletedBy: { select: { username: true } },
    },
    mapItem: (row) => ({
      id: row.id,
      module: 'newsArticles',
      name: row.title,
      extraInfo: row.category?.name || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  itAssets: {
    label: 'Tài sản IT',
    model: 'iTAsset',
    nameField: 'name',
    codeField: 'code',
    include: {
      category: { select: { name: true } },
      deletedBy: { select: { username: true } },
    },
    mapItem: (row) => ({
      id: row.id,
      module: 'itAssets',
      name: row.name,
      code: row.code,
      extraInfo: row.category?.name || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  tickets: {
    label: 'Phiếu hỗ trợ IT',
    model: 'ticket',
    nameField: 'title',
    codeField: 'code',
    include: {
      category: { select: { name: true } },
      deletedBy: { select: { username: true } },
    },
    mapItem: (row) => ({
      id: row.id,
      module: 'tickets',
      name: row.title,
      code: row.code,
      extraInfo: row.category?.name || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  roles: {
    label: 'Vai trò',
    model: 'role',
    nameField: 'name',
    codeField: 'code',
    include: { deletedBy: { select: { username: true } } },
    mapItem: (row) => ({
      id: row.id,
      module: 'roles',
      name: row.name,
      code: row.code,
      extraInfo: '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
    preHardDelete: async (prisma, id) => {
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await prisma.userRole.deleteMany({ where: { roleId: id } });
    },
    preEmpty: async (prisma) => {
      const deletedRoles = await prisma.role.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true },
      });
      for (const r of deletedRoles) {
        await prisma.rolePermission.deleteMany({ where: { roleId: r.id } });
        await prisma.userRole.deleteMany({ where: { roleId: r.id } });
      }
    },
  },

  tasks: {
    label: 'Công việc',
    model: 'task',
    nameField: 'title',
    include: { deletedBy: { select: { username: true } } },
    mapItem: (row) => ({
      id: row.id,
      module: 'tasks',
      name: row.title,
      extraInfo: row.status || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  files: {
    label: 'Tệp đính kèm',
    model: 'file',
    nameField: 'originalName',
    include: { deletedBy: { select: { username: true } } },
    mapItem: (row) => ({
      id: row.id,
      module: 'files',
      name: row.originalName,
      extraInfo: row.mimeType || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  kpi: {
    label: 'KPI',
    model: 'employeeKPI',
    nameField: 'title',
    include: { deletedBy: { select: { username: true } } },
    mapItem: (row) => ({
      id: row.id,
      module: 'kpi',
      name: row.title || 'KPI',
      extraInfo: '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  companies: {
    label: 'Công ty',
    model: 'company',
    nameField: 'name',
    codeField: 'code',
    include: { deletedBy: { select: { username: true } } },
    mapItem: (row) => ({
      id: row.id,
      module: 'companies',
      name: row.name,
      code: row.code,
      extraInfo: row.address || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  divisions: {
    label: 'Khối',
    model: 'division',
    nameField: 'name',
    codeField: 'code',
    include: {
      factory: { select: { name: true } },
      deletedBy: { select: { username: true } },
    },
    mapItem: (row) => ({
      id: row.id,
      module: 'divisions',
      name: row.name,
      code: row.code,
      extraInfo: row.factory?.name || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },

  sections: {
    label: 'Bộ phận',
    model: 'section',
    nameField: 'name',
    codeField: 'code',
    include: {
      department: { select: { name: true } },
      deletedBy: { select: { username: true } },
    },
    mapItem: (row) => ({
      id: row.id,
      module: 'sections',
      name: row.name,
      code: row.code,
      extraInfo: row.department?.name || '',
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy?.username || '',
      deletedBatchId: row.deletedBatchId,
    }),
  },
};

// ─────────────────────────────────────────────────────────
// HELPER: get Prisma delegate from model name
// ─────────────────────────────────────────────────────────

function delegate(prisma: PrismaService, model: string): any {
  return (prisma as any)[model];
}

// ─────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────

@Injectable()
export class TrashService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List trash items for a module ───
  async getTrashItems(
    module: TrashModule,
    page = 1,
    limit = 20,
    search?: string,
    sortBy: 'deletedAt' | 'name' = 'deletedAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const config = REGISTRY[module];
    if (!config)
      throw new BadRequestException(
        `Module "${module}" không hỗ trợ Thùng rác`,
      );

    const skip = (page - 1) * limit;
    const where: any = { deletedAt: { not: null } };

    if (search) {
      where[config.nameField] = { contains: search, mode: 'insensitive' };
    }

    const orderBy: any =
      sortBy === 'name'
        ? { [config.nameField]: sortOrder }
        : { deletedAt: sortOrder };

    const [rows, total] = await Promise.all([
      delegate(this.prisma, config.model).findMany({
        where,
        include: config.include,
        orderBy,
        skip,
        take: limit,
      }),
      delegate(this.prisma, config.model).count({ where }),
    ]);

    return {
      data: rows.map(config.mapItem),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Get trash summary (counts per module) ───
  async getTrashSummary() {
    const modules = Object.keys(REGISTRY) as TrashModule[];

    const counts = await Promise.all(
      modules.map((m) =>
        delegate(this.prisma, REGISTRY[m].model).count({
          where: { deletedAt: { not: null } },
        }),
      ),
    );

    const result: Record<string, { count: number; label: string }> = {};
    let total = 0;
    modules.forEach((m, i) => {
      result[m] = { count: counts[i], label: REGISTRY[m].label };
      total += counts[i];
    });

    return { ...result, total };
  }

  // ─── Get raw detail of a trash item for Preview/Audit ───
  async getTrashItemDetail(module: TrashModule, id: string) {
    const config = REGISTRY[module];
    if (!config)
      throw new BadRequestException(`Module "${module}" không hỗ trợ`);

    const item = await delegate(this.prisma, config.model).findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!item)
      throw new NotFoundException('Không tìm thấy dữ liệu trong thùng rác');
    return item;
  }

  // ─── Restore a single item ───
  async restoreItem(module: TrashModule, id: string) {
    const config = REGISTRY[module];
    if (!config)
      throw new BadRequestException(`Module "${module}" không hỗ trợ`);

    const model = delegate(this.prisma, config.model);
    const item = await model.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!item)
      throw new NotFoundException(`Không tìm thấy mục trong Thùng rác`);

    const updateData: any = {
      deletedAt: null,
      deletedById: null,
      deletedBatchId: null,
    };

    // Restore code suffix if applicable
    if (config.codeField) {
      const field = config.codeField;
      const original = (item[field] as string).split('_DELETED_')[0];
      const conflict = await model.findFirst({
        where: { [field]: original, deletedAt: null },
      });
      if (conflict) {
        throw new BadRequestException(
          `Không thể khôi phục: ${config.label} với mã "${original}" đang được sử dụng.`,
        );
      }
      updateData[field] = original;
    }

    await model.update({ where: { id }, data: updateData });
    return {
      message: `Đã khôi phục ${config.label} "${item[config.nameField]}"`,
    };
  }

  // ─── Restore a batch (cascade restore) ───
  async restoreBatch(batchId: string) {
    const results = { restored: 0, conflicts: [] as string[] };
    const modules = Object.keys(REGISTRY) as TrashModule[];

    for (const m of modules) {
      const config = REGISTRY[m];
      const model = delegate(this.prisma, config.model);
      const items = await model.findMany({
        where: { deletedBatchId: batchId, deletedAt: { not: null } },
      });

      if (!items || items.length === 0) continue;

      if (!config.codeField) {
        const ids = items.map((i: any) => i.id);
        const { count } = await model.updateMany({
          where: { id: { in: ids } },
          data: { deletedAt: null, deletedById: null, deletedBatchId: null },
        });
        results.restored += count;
        continue;
      }

      const field = config.codeField;
      const restoreCandidates = items.map((i: any) => ({
        id: i.id,
        originalCode: (i[field] as string).split('_DELETED_')[0],
        name: i[config.nameField],
      }));

      // Batch check for existing codes
      const existingCodesRows = await model.findMany({
        where: {
          [field]: { in: restoreCandidates.map((c: any) => c.originalCode) },
          deletedAt: null,
        },
        select: { [field]: true },
      });
      const existingCodesSet = new Set(
        existingCodesRows.map((r: any) => r[field]),
      );

      const validToRestore = [];
      for (const item of restoreCandidates) {
        if (existingCodesSet.has(item.originalCode)) {
          results.conflicts.push(
            `${config.label} "${item.name}" (mã ${item.originalCode}) bị trùng`,
          );
        } else {
          validToRestore.push(item);
        }
      }

      if (validToRestore.length > 0) {
        // We still need individual updates because each item might have a different originalCode
        // But with indexes, these will be very fast.
        await Promise.all(
          validToRestore.map((item) =>
            model.update({
              where: { id: item.id },
              data: {
                [field]: item.originalCode,
                deletedAt: null,
                deletedById: null,
                deletedBatchId: null,
              },
            }),
          ),
        );
        results.restored += validToRestore.length;
      }
    }

    return {
      message: `Đã khôi phục ${results.restored} mục`,
      restored: results.restored,
      conflicts: results.conflicts,
    };
  }

  // ─── Hard-delete a single item (permanent) ───
  async hardDeleteItem(module: TrashModule, id: string, actorId?: string) {
    const config = REGISTRY[module];
    if (!config)
      throw new BadRequestException(`Module "${module}" không hỗ trợ`);

    if (module === 'users' && id === actorId) {
      throw new BadRequestException(
        'Bạn không thể xóa vĩnh viễn tài khoản đang đăng nhập.',
      );
    }

    if (config.preHardDelete) {
      await config.preHardDelete(this.prisma, id);
    }

    try {
      await delegate(this.prisma, config.model).delete({ where: { id } });
    } catch (error: any) {
      if (
        error.code === 'P2003' ||
        error.message?.toLowerCase().includes('foreign key constraint')
      ) {
        const tableMatch = error.message.match(
          /is referenced from table "([^"]+)"/,
        );
        const tableName = tableMatch ? tableMatch[1] : 'không xác định';
        throw new BadRequestException(
          `Không thể xóa vĩnh viễn: dữ liệu của ${config.label} này còn được tham chiếu ở phân hệ [${getVietnameseModuleName(tableName)}].`,
        );
      }
      throw error;
    }

    return { message: 'Đã xóa vĩnh viễn' };
  }

  // ─── Empty trash for a module (or all) ───
  async emptyTrash(module?: TrashModule, actorId?: string) {
    const results: Record<string, number> = {};
    const modules = module
      ? [module]
      : (Object.keys(REGISTRY) as TrashModule[]);

    await Promise.all(
      modules.map(async (m) => {
        const config = REGISTRY[m];
        const model = delegate(this.prisma, config.model);

        if (config.preEmpty) {
          await config.preEmpty(this.prisma);
        }

        if (m === 'users') {
          // Special case: never delete caller's own account
          const toDelete = await model.findMany({
            where: { deletedAt: { not: null } },
            select: { id: true },
          });
          let ids = toDelete.map((u: any) => u.id);
          if (actorId) ids = ids.filter((id: string) => id !== actorId);

          if (ids.length > 0) {
            await this.prisma.employee.updateMany({
              where: { userId: { in: ids } },
              data: { userId: null },
            });
            try {
              const { count } = await model.deleteMany({
                where: { id: { in: ids } },
              });
              results[m] = count;
            } catch (error: any) {
              if (error.code === 'P2003') {
                const tableMatch = error.message.match(
                  /is referenced from table "([^"]+)"/,
                );
                const name = tableMatch
                  ? getVietnameseModuleName(tableMatch[1])
                  : 'không xác định';
                throw new BadRequestException(
                  `Không thể dọn dẹp Tài khoản: còn dữ liệu ràng buộc ở phân hệ [${name}].`,
                );
              }
              throw error;
            }
          } else {
            results[m] = 0;
          }
        } else {
          try {
            const { count } = await model.deleteMany({
              where: { deletedAt: { not: null } },
            });
            results[m] = count;
          } catch (e) {
            results[m] = 0;
          }
        }
      }),
    );

    const total = Object.values(results).reduce((a, b) => a + b, 0);
    return {
      message: `Đã dọn sạch ${total} mục từ Thùng rác`,
      details: results,
    };
  }

  // ─── CronJob: Clean up expired items (> N days) ───
  async cleanupExpired(retentionDays = 30) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - retentionDays);

    const modules = Object.keys(REGISTRY) as TrashModule[];
    const counts: Record<string, number> = {};
    let total = 0;

    await Promise.all(
      modules.map(async (m) => {
        const { count } = await delegate(
          this.prisma,
          REGISTRY[m].model,
        ).deleteMany({
          where: { deletedAt: { not: null, lt: threshold } },
        });
        counts[m] = count;
        total += count;
      }),
    );

    return {
      message: `Đã dọn dẹp ${total} mục quá hạn ${retentionDays} ngày`,
      details: counts,
    };
  }
}
