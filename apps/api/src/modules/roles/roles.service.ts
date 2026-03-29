import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExcelService, ExcelColumn } from '../../shared/excel.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  UpdatePermissionsDto,
} from './dto/roles.dto';

// Vietnamese translations - synced with frontend
const MODULE_LABELS: Record<string, string> = {
  ADMIN: 'Hệ thống',
  HR: 'Nhân viên',
  ORG: 'Tổ chức',
  DOCUMENTS: 'Tài liệu',
  MEETING: 'Phòng họp',
  CAR: 'Đặt xe',
  NEWS: 'Tin tức',
  TASKS: 'Công việc',
  IT_ASSETS: 'Thiết bị Công nghệ Thông tin',
  TICKET: 'IT Ticket',
  WORKFLOW: 'Quy trình IT Ticket',
};

const PERMISSION_LABELS: Record<string, string> = {
  EMPLOYEE_READ: 'Xem nhân viên',
  EMPLOYEE_CREATE: 'Tạo nhân viên',
  EMPLOYEE_UPDATE: 'Sửa nhân viên',
  EMPLOYEE_DELETE: 'Xóa nhân viên',
  EMPLOYEE_UPLOAD_FILE: 'Upload hồ sơ',
  DEPARTMENT_READ: 'Xem phòng ban',
  DEPARTMENT_MANAGE: 'Quản lý phòng ban',
  ORGCHART_VIEW: 'Xem sơ đồ tổ chức',
  ORGCHART_MANAGE: 'Quản lý sơ đồ tổ chức',
  DOCUMENT_READ: 'Xem tài liệu',
  DOCUMENT_CREATE: 'Tạo tài liệu',
  DOCUMENT_UPDATE: 'Cập nhật tài liệu',
  DOCUMENT_APPROVE: 'Phê duyệt tài liệu',
  ROOM_VIEW: 'Xem phòng họp',
  ROOM_BOOK: 'Đặt phòng họp',
  ROOM_MANAGE: 'Quản lý phòng họp',
  ROOM_CREATE: 'Thêm phòng họp',
  ROOM_UPDATE: 'Sửa phòng họp',
  ROOM_DELETE: 'Xóa phòng họp',
  USER_ROLE_MANAGE: 'Quản lý quyền',
  AUDITLOG_VIEW: 'Xem nhật ký hệ thống',
  NEWS_VIEW: 'Xem tin tức',
  NEWS_READ: 'Xem tin tức',
  NEWS_CREATE: 'Đăng tin tức',
  NEWS_APPROVE: 'Duyệt tin tức',
  NEWS_MANAGE: 'Quản lý tin tức',
  TASK_VIEW: 'Xem công việc',
  TASK_READ: 'Xem công việc',
  TASK_CREATE: 'Giao công việc',
  TASK_MANAGE: 'Quản lý công việc',
  CAR_VIEW: 'Xem lịch xe',
  CAR_READ: 'Xem lịch xe',
  CAR_BOOK: 'Đặt xe công tác',
  CAR_MANAGE: 'Quản lý điều xe',
  ASSET_VIEW: 'Xem thiết bị CNTT',
  ASSET_CREATE: 'Thêm thiết bị CNTT',
  ASSET_UPDATE: 'Sửa thiết bị CNTT',
  ASSET_DELETE: 'Xóa thiết bị CNTT',
  ASSET_ASSIGN: 'Cấp phát thiết bị',
  TICKET_VIEW: 'Xem IT Ticket',
  TICKET_CREATE: 'Tạo IT Ticket',
  TICKET_MANAGE: 'Quản lý IT Ticket',
  TICKET_CLOSE: 'Đóng IT Ticket',
  SETTINGS_VIEW: 'Xem cài đặt',
  SETTINGS_MANAGE: 'Quản lý cài đặt',
};

const ROLE_EXCEL_COLUMNS: ExcelColumn[] = [
  { header: 'Mã vai trò', key: 'code', width: 20 },
  { header: 'Tên vai trò', key: 'name', width: 30 },
  { header: 'Mô tả', key: 'description', width: 40 },
  { header: 'Số quyền', key: 'permissionsCount', width: 12 },
  { header: 'Số users', key: 'usersCount', width: 12 },
];

const ROLE_IMPORT_COLUMNS: ExcelColumn[] = [
  { header: 'Mã vai trò (*)', key: 'code', width: 20 },
  { header: 'Tên vai trò (*)', key: 'name', width: 30 },
  { header: 'Mô tả', key: 'description', width: 40 },
  {
    header: 'Mã Quyền (cách nhau bằng dấu phẩy) (*)',
    key: 'permissions',
    width: 50,
  },
];

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private excelService: ExcelService,
  ) {}

  async findAllRoles(isDeleted = false) {
    const roles = await this.prisma.role.findMany({
      where: { deletedAt: isDeleted ? { not: null } : null },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      permissionsCount: role.permissions.length,
      usersCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission),
    }));
  }

  async findOneRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) return null;

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      permissionsCount: role.permissions.length,
      usersCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  async createRole(dto: CreateRoleDto) {
    const role = await this.prisma.role.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
      },
    });

    if (dto.permissionIds && dto.permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    return this.findOneRole(role.id);
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    await this.prisma.role.update({
      where: { id },
      data: dto,
    });

    return this.findOneRole(id);
  }

  async updatePermissions(id: string, dto: UpdatePermissionsDto) {
    // Remove existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: id },
    });

    // Add new permissions
    if (dto.permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
      });
    }

    return this.findOneRole(id);
  }

  async deleteRole(id: string, userId?: string) {
    const role = await this.findOneRole(id);
    if (!role) throw new Error('Không tìm thấy vai trò');
    const now = new Date();
    await this.prisma.role.update({
      where: { id },
      data: {
        code: `${role.code}_DELETED_${now.getTime()}`,
        deletedAt: now,
        deletedById: userId || null,
        deletedBatchId: null,
      },
    });
    return { success: true };
  }

  async restoreRole(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new Error('Không tìm thấy vai trò');
    if (!role.deletedAt) throw new Error('Vai trò chưa bị xóa');

    const originalCode = role.code.replace(/_DELETED_\d+$/, '');

    return this.prisma.role.update({
      where: { id },
      data: {
        code: originalCode,
        deletedAt: null,
        deletedById: null,
        deletedBatchId: null,
      },
    });
  }

  async forceDeleteRole(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new Error('Không tìm thấy vai trò');
    if (!role.deletedAt) throw new Error('Vai trò chưa bị xóa mềm');

    return this.prisma.role.delete({ where: { id } });
  }

  // Permissions
  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async getPermissionsByModule() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });

    // Group by module
    const grouped: Record<string, typeof permissions> = {};
    for (const perm of permissions) {
      const module = perm.module || 'OTHER';
      if (!grouped[module]) grouped[module] = [];
      grouped[module].push(perm);
    }

    return grouped;
  }

  // ===================== EXCEL EXPORT/IMPORT =====================

  async exportToExcel(): Promise<Buffer> {
    // Fetch roles with permissions
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: { code: 'asc' },
    });

    // Fetch all permissions grouped by module
    const allPermissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });

    // ========== SHEET 1: Roles List ==========
    const rolesData = roles.map((r) => ({
      code: r.code,
      name: r.name,
      description: r.description || '',
      permissionsCount: r.permissions.length,
      usersCount: r._count.users,
    }));

    // ========== SHEET 2: Permission Matrix ==========
    // Columns: Module, Permission, Role1, Role2, Role3, ...
    const matrixColumns: { header: string; key: string; width: number }[] = [
      { header: 'Module', key: 'module', width: 15 },
      { header: 'Mã quyền', key: 'code', width: 25 },
      { header: 'Tên quyền', key: 'permName', width: 35 },
    ];

    // Add role columns
    roles.forEach((role: any) => {
      matrixColumns.push({
        header: role.name,
        key: role.code,
        width: 12,
      });
    });

    // Build matrix data with Vietnamese labels
    const matrixData = allPermissions.map((perm: any) => {
      const row: Record<string, any> = {
        module: MODULE_LABELS[perm.module || 'OTHER'] || perm.module || 'Khác',
        code: perm.code,
        permName: PERMISSION_LABELS[perm.code] || perm.description || perm.code,
      };

      // Check each role
      roles.forEach((role: any) => {
        const hasPermission = role.permissions.some(
          (rp: any) => rp.permission.id === perm.id,
        );
        row[role.code] = hasPermission ? '✓' : '';
      });

      return row;
    });

    // Use multi-sheet export
    return this.excelService.exportMultiSheetExcel([
      {
        sheetName: 'Danh sách Roles',
        columns: ROLE_EXCEL_COLUMNS,
        data: rolesData,
      },
      {
        sheetName: 'Ma trận quyền',
        columns: matrixColumns,
        data: matrixData,
      },
    ]);
  }

  async getExcelTemplate(): Promise<Buffer> {
    const exampleData = [
      {
        code: 'MANAGER',
        name: 'Quản lý',
        description: 'Quản lý phòng ban',
        permissions: 'USER_READ, USER_CREATE, DEPT_READ',
      },
    ];

    return this.excelService.createTemplate(
      ROLE_IMPORT_COLUMNS,
      exampleData,
      'Roles Template',
    );
  }

  async importFromExcel(
    buffer: Buffer,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    // Use ROLE_IMPORT_COLUMNS so header mapper properly maps Vietnamese labels
    const columns = ROLE_IMPORT_COLUMNS;

    // Get permissions for mapping
    const allPermissions = await this.prisma.permission.findMany();
    const permMap = new Map(
      allPermissions.map((p: any) => [p.code.toUpperCase(), p.id]),
    );

    const parseResult = await this.excelService.parseExcel<any>(
      buffer,
      columns,
    );
    const results = { success: 0, failed: 0, errors: [] as string[] };

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of parseResult.success) {
          try {
            if (!row.code || !row.name) {
              throw new Error('Thiếu thông tin bắt buộc (code, name)');
            }

            // Check existing
            const existing = await tx.role.findUnique({
              where: { code: row.code },
            });
            if (existing) {
              throw new Error(`Mã role đã tồn tại: ${row.code}`);
            }

            // Create role
            const newRole = await tx.role.create({
              data: {
                code: row.code,
                name: row.name,
                description: row.description || null,
              },
            });

            // Assign permissions
            if (row.permissions) {
              const permCodes = row.permissions
                .split(/[,;]/)
                .map((p: string) => p.trim().toUpperCase());
              const permIds = permCodes
                .map((code: string) => permMap.get(code))
                .filter(Boolean) as string[];

              if (permIds.length > 0) {
                await tx.rolePermission.createMany({
                  data: permIds.map((permissionId) => ({
                    roleId: newRole.id,
                    permissionId,
                  })),
                });
              }
            }

            results.success++;
          } catch (err: any) {
            results.failed++;
            results.errors.push(
              `Dòng ${row.code || 'Không rõ'}: ${err.message}`,
            );
            throw new BadRequestException(
              `Import thất bại tại dòng ${row.code || 'Không rõ'}. Hoàn tác toàn bộ dữ liệu... Chi tiết: ${err.message}`,
            );
          }
        }
      });
    } catch (transactionError: any) {
      throw transactionError;
    }

    for (const fail of parseResult.failed) {
      results.failed++;
      results.errors.push(`Dòng ${fail.row}: ${fail.error}`);
    }

    return results;
  }
}
