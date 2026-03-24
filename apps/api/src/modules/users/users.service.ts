import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExcelService, ExcelColumn } from '../../shared/excel.service';
import * as bcrypt from 'bcrypt';
import {
  CreateUserDto,
  UpdateUserDto,
  AssignRolesDto,
  AssignBulkRolesDto,
  AssignPermissionsDto,
} from './dto/users.dto';

interface FindAllParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  isDeleted?: boolean;
}

// Excel columns definition for Users
const USER_EXCEL_COLUMNS: ExcelColumn[] = [
  { header: 'Username', key: 'username', width: 20 },
  { header: 'Email', key: 'email', width: 30 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Employee Code', key: 'employeeCode', width: 15 },
  { header: 'Employee Name', key: 'employeeName', width: 25 },
  { header: 'Roles', key: 'roles', width: 25 },
  { header: 'Created At', key: 'createdAt', width: 20 },
];

const USER_IMPORT_COLUMNS: ExcelColumn[] = [
  { header: 'username', key: 'username', width: 20 },
  { header: 'email', key: 'email', width: 30 },
  { header: 'password', key: 'password', width: 20 },
  { header: 'roles', key: 'roles', width: 25 },
];

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private excelService: ExcelService,
  ) {}

  async findAll(params: FindAllParams) {
    const {
      page,
      limit,
      search,
      status,
      sortBy = 'createdAt',
      order = 'desc',
      isDeleted = false,
    } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isDeleted) {
      // Explicitly define deletedAt at the root to bypass Prisma soft-delete middleware
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
      where.username = { not: { contains: '_DELETED_' } };
    }

    // ... (existing search logic checks)

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employee: { fullName: { contains: search, mode: 'insensitive' } } }, // Also search by employee name
      ];
    }

    if (status) {
      where.status = status;
    }

    const orderBy: any = {};
    if (sortBy === 'employee.fullName') {
      orderBy.employee = { fullName: order };
    } else if (sortBy === 'roles') {
      orderBy.username = order; // Fallback for roles since Prisma can't order array relations
    } else if (
      ['username', 'email', 'status', 'createdAt', 'updatedAt'].includes(sortBy)
    ) {
      orderBy[sortBy] = order;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          employee: {
            select: {
              id: true,
              fullName: true,
              employeeCode: true,
              avatar: true,
              department: { select: { id: true, name: true } },
            },
          },
          createdBy: {
            select: { username: true },
          },
          updatedBy: {
            select: { username: true },
          },
          roles: {
            select: {
              role: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  permissions: {
                    select: {
                      permission: {
                        select: {
                          id: true,
                          code: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          permissions: {
            select: {
              permission: {
                select: {
                  id: true,
                  code: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    // ... (transform logic)

    // Transform data to flatten roles and permissions
    const transformedData = data.map((user: any) => ({
      ...user,
      roles: user.roles.map((ur: any) => ur.role),
      permissions: user.permissions.map((up: any) => up.permission),
    }));

    return {
      data: transformedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            avatar: true,
            department: { select: { id: true, name: true } },
          },
        },
        createdBy: {
          select: { username: true, email: true },
        },
        updatedBy: {
          select: { username: true, email: true },
        },
        roles: {
          select: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        id: true,
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                code: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    return {
      ...user,
      roles: user.roles.map((ur: any) => ur.role),
      permissions: user.permissions.map((up: any) => up.permission),
    };
  }

  async create(dto: CreateUserDto, actorId?: string) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const data: any = {
      username: dto.username,
      email: dto.email,
      passwordHash: hashedPassword,
      status: 'ACTIVE',
      createdById: actorId,
      updatedById: actorId,
    };

    if (dto.employeeId) {
      data.employee = { connect: { id: dto.employeeId } };
    }

    const user = await this.prisma.user.create({
      data,
    });

    // Assign roles if provided
    if (dto.roleIds && dto.roleIds.length > 0) {
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({
          userId: user.id,
          roleId,
        })),
      });
    }

    // Assign individual permissions if provided
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      await this.prisma.userPermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          userId: user.id,
          permissionId,
        })),
      });
    }

    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string) {
    if (!actorId) {
      throw new UnauthorizedException('Không thể xác định người dùng hiện tại');
    }

    if (!dto.adminPassword) {
      throw new BadRequestException(
        'Vui lòng nhập mật khẩu quản trị viên để cập nhật dữ liệu',
      );
    }

    const admin = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!admin || !admin.passwordHash) {
      throw new UnauthorizedException('Không tìm thấy tài khoản quản trị viên');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.adminPassword,
      admin.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu quản trị viên không chính xác');
    }

    const updateData: any = {};
    if (dto.email) updateData.email = dto.email;
    if (dto.status) updateData.status = dto.status;
    if (actorId) updateData.updatedById = actorId;

    if (dto.employeeId !== undefined) {
      if (dto.employeeId === null) {
        updateData.employee = { disconnect: true };
      } else {
        updateData.employee = { connect: { id: dto.employeeId } };
      }
    }

    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (dto.roleIds !== undefined) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      if (dto.roleIds.length > 0) {
        await this.prisma.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
    }

    if (dto.permissionIds !== undefined) {
      await this.prisma.userPermission.deleteMany({ where: { userId: id } });
      if (dto.permissionIds.length > 0) {
        await this.prisma.userPermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            userId: id,
            permissionId,
          })),
        });
      }
    }

    return this.findOne(id);
  }

  async verifyAdminPassword(adminPassword: string, actorId?: string) {
    if (!actorId) {
      throw new UnauthorizedException('Không thể xác định người dùng hiện tại');
    }

    if (!adminPassword) {
      throw new BadRequestException('Vui lòng nhập mật khẩu quản trị viên');
    }

    const admin = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!admin || !admin.passwordHash) {
      throw new UnauthorizedException('Không tìm thấy tài khoản quản trị viên');
    }

    const isPasswordValid = await bcrypt.compare(
      adminPassword,
      admin.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu quản trị viên không chính xác');
    }

    return { success: true };
  }

  async resetPassword(id: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });

    return { success: true, message: 'Password reset successfully' };
  }

  async assignRoles(id: string, dto: AssignRolesDto) {
    // Remove existing roles
    await this.prisma.userRole.deleteMany({
      where: { userId: id },
    });

    // Assign new roles
    if (dto.roleIds.length > 0) {
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({
          userId: id,
          roleId,
        })),
      });
    }

    return this.findOne(id);
  }

  async assignBulkRoles(dto: AssignBulkRolesDto, actorId?: string) {
    if (!dto.userIds || dto.userIds.length === 0) {
      throw new BadRequestException('Danh sách user trống');
    }

    // Remove existing roles for these users
    await this.prisma.userRole.deleteMany({
      where: { userId: { in: dto.userIds } },
    });

    // Assign new roles if any
    if (dto.roleIds && dto.roleIds.length > 0) {
      const data: any[] = [];
      for (const userId of dto.userIds) {
        for (const roleId of dto.roleIds) {
          data.push({ userId, roleId });
        }
      }
      await this.prisma.userRole.createMany({
        data,
      });
    }

    return { success: true, count: dto.userIds.length };
  }

  async removeRole(userId: string, roleId: string) {
    await this.prisma.userRole.deleteMany({
      where: { userId, roleId },
    });

    return this.findOne(userId);
  }

  async assignPermissions(id: string, dto: AssignPermissionsDto) {
    // Remove existing permission overrides
    await this.prisma.userPermission.deleteMany({
      where: { userId: id },
    });

    // Assign new permission overrides
    if (dto.permissionIds.length > 0) {
      await this.prisma.userPermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          userId: id,
          permissionId,
        })),
      });
    }

    return this.findOne(id);
  }

  async delete(id: string, actorId?: string) {
    if (id === actorId) {
      throw new BadRequestException(
        'Bạn không thể tự xóa tài khoản của chính mình.',
      );
    }

    // Check for linked employee
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { employee: true },
    });

    try {
      // Instead of hard delete, we perform a soft delete
      const now = new Date();
      await this.prisma.user.update({
        where: { id },
        data: {
          username: `${user?.username}_DELETED_${now.getTime()}`,
          status: 'INACTIVE',
          deletedAt: now,
          deletedById: actorId || null,
        },
      });
      return { success: true };
    } catch (error: any) {
      console.error(`Failed to soft-delete user ${id}:`, error);

      // Prisma error P2003 = Foreign key constraint failed
      if (error.code === 'P2003') {
        const fieldName = error.meta?.field_name || 'dữ liệu liên quan';
        throw new BadRequestException(
          `Không thể xóa User này do ràng buộc dữ liệu (${fieldName}). Hãy Deactivate tài khoản thay vì xóa.`,
        );
      }
      throw error;
    }
  }

  async bulkDelete(ids: string[], actorId?: string) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Danh sách id rỗng');
    }

    if (actorId && ids.includes(actorId)) {
      throw new BadRequestException(
        'Bạn không thể tự đưa tài khoản của mình vào danh sách xóa.',
      );
    }

    try {
      const { v4: uuidv4 } = await import('uuid');
      const batchId = uuidv4();
      const now = new Date();

      await this.prisma.$transaction(async (tx) => {
        for (const id of ids) {
          const user = await tx.user.findUnique({ where: { id } });
          if (!user) continue;

          await tx.user.update({
            where: { id },
            data: {
              username: `${user.username}_DELETED_${now.getTime()}`,
              status: 'INACTIVE',
              deletedAt: now,
              deletedById: actorId || null,
              deletedBatchId: batchId,
            },
          });
        }
      });
      return { success: true, count: ids.length };
    } catch (error: any) {
      console.error(`Failed to bulk soft-delete users:`, error);
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Không thể xóa các tài khoản này do ràng buộc dữ liệu. Vui lòng kiểm tra lại.',
        );
      }
      throw error;
    }
  }

  async restore(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    if (!user.deletedAt) {
      throw new BadRequestException('Người dùng này chưa bị xóa');
    }

    // Try to restore original username
    let newUsername = user.username;
    if (newUsername.includes('_DELETED_')) {
      newUsername = newUsername.split('_DELETED_')[0];
    }

    // Check if the original username is now taken by an active user
    const existing = await this.prisma.user.findFirst({
      where: {
        username: { equals: newUsername, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Tên đăng nhập gốc "${newUsername}" đã được sử dụng bởi người dùng khác. Không thể khôi phục.`,
      );
    }

    // Check if email is taken by an active user
    if (user.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: { equals: user.email, mode: 'insensitive' },
          deletedAt: null,
          id: { not: id }, // exclude self
        },
      });
      if (existingEmail) {
        throw new BadRequestException(
          `Email "${user.email}" đã được sử dụng bởi người dùng khác. Không thể khôi phục.`,
        );
      }
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        username: newUsername,
        status: 'ACTIVE',
        deletedAt: null,
        deletedById: null,
        deletedBatchId: null,
      },
    });

    return { success: true };
  }

  async forceDelete(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    if (!user.deletedAt) {
      throw new BadRequestException(
        'Chỉ có thể xóa vĩnh viễn người dùng đã ở trong Thùng rác',
      );
    }

    try {
      // Manual cascade delete since there might be no DB-level cascade
      await this.prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userPermission.deleteMany({ where: { userId: id } });
        await tx.user.delete({ where: { id } });
      });

      return { success: true };
    } catch (error: any) {
      console.error(`Failed to force delete user ${id}:`, error);
      throw new BadRequestException(
        'Không thể xóa vĩnh viễn do lỗi ràng buộc dữ liệu. Vui lòng kiểm tra lại.',
      );
    }
  }

  // ===================== EXCEL EXPORT/IMPORT =====================

  async exportToExcel(): Promise<Buffer> {
    const users = await this.prisma.user.findMany({
      include: {
        employee: { select: { fullName: true, employeeCode: true } },
        roles: { include: { role: { select: { code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = users.map((u: any) => ({
      username: u.username,
      email: u.email,
      status: u.status,
      employeeCode: u.employee?.employeeCode || '',
      employeeName: u.employee?.fullName || '',
      roles: u.roles.map((r: any) => r.role.code).join(', '),
      createdAt: u.createdAt.toISOString().split('T')[0],
    }));

    return this.excelService.exportToExcel({
      sheetName: 'Users',
      columns: USER_EXCEL_COLUMNS,
      data,
    });
  }

  async getExcelTemplate(): Promise<Buffer> {
    const exampleData = [
      {
        username: 'user001',
        email: 'user001@company.com',
        password: 'Password@123',
        roles: 'USER, MANAGER',
      },
    ];

    return this.excelService.createTemplate(
      USER_IMPORT_COLUMNS,
      exampleData,
      'Users Template',
    );
  }

  async importFromExcel(
    buffer: Buffer,
    actorId?: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const columns = ['username', 'email', 'password', 'roles'];

    // Get all roles for mapping
    const allRoles = await this.prisma.role.findMany();
    const roleMap = new Map(
      allRoles.map((r: any) => [r.code.toUpperCase(), r.id]),
    );

    const parseResult = await this.excelService.parseExcel<{
      username: string;
      email: string;
      password: string;
      roles?: string;
    }>(buffer, columns);

    const results = { success: 0, failed: 0, errors: [] as string[] };

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const originalRow of parseResult.success) {
          try {
            const row = {
              username: originalRow.username?.toString().trim(),
              email: originalRow.email?.toString().trim().toLowerCase(),
              password: originalRow.password?.toString(),
              roles: originalRow.roles?.toString().trim(),
            };

            if (!row.username || !row.email || !row.password) {
              throw new Error(
                'Thiếu thông tin bắt buộc (username, email, password)',
              );
            }

            // Check existing (case insensitive)
            const existing = await tx.user.findFirst({
              where: {
                OR: [
                  { username: { equals: row.username, mode: 'insensitive' } },
                  { email: { equals: row.email, mode: 'insensitive' } },
                ],
              },
            });
            if (existing) {
              throw new Error(
                `Username hoặc Email đã tồn tại: ${row.username} - ${row.email}`,
              );
            }

            // Create user
            const hashedPassword = await bcrypt.hash(row.password, 10);
            const user = await tx.user.create({
              data: {
                username: row.username,
                email: row.email,
                passwordHash: hashedPassword,
                status: 'ACTIVE',
                createdById: actorId,
                updatedById: actorId,
              },
            });

            // Assign roles
            if (row.roles) {
              const roleCodes = row.roles
                .split(/[,;]/)
                .map((r) => r.trim().toUpperCase());
              const roleIds = roleCodes
                .map((code) => roleMap.get(code))
                .filter(Boolean) as string[];
              if (roleIds.length > 0) {
                await tx.userRole.createMany({
                  data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
                });
              }
            }

            results.success++;
          } catch (err: any) {
            results.failed++;
            results.errors.push(
              `Dòng ${originalRow.username || 'Không rõ'}: ${err.message}`,
            );
            // Rollback transaction
            throw new BadRequestException(
              `Import thất bại tại dòng ${originalRow.username || 'Không rõ'}. Hoàn tác toàn bộ dữ liệu... Chi tiết: ${err.message}`,
            );
          }
        }
      });
    } catch (transactionError: any) {
      throw transactionError;
    }

    // Add parse failures
    for (const fail of parseResult.failed) {
      results.failed++;
      results.errors.push(`Dòng ${fail.row}: ${fail.error}`);
    }

    return results;
  }

  // Legacy CSV methods (keep for backward compatibility)
  async exportToCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      include: {
        employee: { select: { fullName: true, employeeCode: true } },
        roles: { include: { role: { select: { code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Username',
      'Email',
      'Status',
      'EmployeeCode',
      'EmployeeName',
      'Roles',
      'CreatedAt',
    ];
    const rows = users.map((u: any) => [
      u.username,
      u.email,
      u.status,
      u.employee?.employeeCode || '',
      u.employee?.fullName || '',
      u.roles.map((r: any) => r.role.code).join(';'),
      u.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) =>
        row
          .map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(','),
      ),
    ].join('\n');

    return csvContent;
  }

  getImportTemplate(): string {
    const headers = ['username', 'email', 'password', 'roles'];
    const example = [
      'user001',
      'user001@company.com',
      'Password@123',
      'USER;MANAGER',
    ];
    return [headers.join(','), example.join(',')].join('\n');
  }

  async importFromCsv(
    csvContent: string,
    actorId?: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const lines = csvContent.split('\n').filter((l) => l.trim());
    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().toLowerCase().replace(/"/g, ''));

    const results = { success: 0, failed: 0, errors: [] as string[] };

    // Get all roles for mapping
    const allRoles = await this.prisma.role.findMany();
    const roleMap = new Map(
      allRoles.map((r: any) => [r.code.toUpperCase(), r.id]),
    );

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const data: Record<string, string> = {};
      headers.forEach((h, idx) => {
        data[h] = values[idx]?.replace(/^"|"$/g, '')?.trim() || '';
      });

      try {
        const username = data.username;
        const email = data.email?.toLowerCase();
        const password = data.password;

        if (!username || !email || !password) {
          throw new Error('Missing required fields');
        }

        // Check existing (case insensitive)
        const existing = await this.prisma.user.findFirst({
          where: {
            OR: [
              { username: { equals: username, mode: 'insensitive' } },
              { email: { equals: email, mode: 'insensitive' } },
            ],
          },
        });
        if (existing) {
          throw new Error(`Username/Email already exists`);
        }

        // Create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.prisma.user.create({
          data: {
            username: username,
            email: email,
            passwordHash: hashedPassword,
            status: 'ACTIVE',
            createdById: actorId,
            updatedById: actorId,
          },
        });

        // Assign roles
        if (data.roles) {
          const roleCodes = data.roles
            .split(';')
            .map((r) => r.trim().toUpperCase());
          const roleIds = roleCodes
            .map((code) => roleMap.get(code))
            .filter(Boolean) as string[];
          if (roleIds.length > 0) {
            await this.prisma.userRole.createMany({
              data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
            });
          }
        }

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return results;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}
