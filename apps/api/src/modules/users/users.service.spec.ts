import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExcelService } from '../../shared/excel.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@eoffice.local',
    status: 'ACTIVE',
    passwordHash: 'hashedPassword123',
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [
      {
        role: {
          id: 'role-1',
          code: 'EMPLOYEE',
          name: 'Employee',
          permissions: [],
        },
      },
    ],
    employee: { id: 'emp-1', fullName: 'Test User' },
    permissions: [],
  };

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userRole: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    userPermission: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(
      async (callback: any): Promise<any> => callback(mockPrismaService),
    ),
  };

  const mockExcelService = {
    exportToExcel: jest.fn(),
    createTemplate: jest.fn(),
    parseExcel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExcelService, useValue: mockExcelService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===================== findAll =====================

  describe('findAll', () => {
    it('should return paginated users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should apply search filter across username and email', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, search: 'admin' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, status: 'ACTIVE' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });
  });

  // ===================== create =====================

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const createdUser = {
        id: 'user-new',
        username: 'newuser',
        email: 'new@eoffice.local',
      };
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      // findOne is called after create, returning the full user
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const dto = {
        username: 'newuser',
        email: 'new@eoffice.local',
        password: 'Password123',
        roleIds: ['role-1'],
      };

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: 'newuser',
            email: 'new@eoffice.local',
            passwordHash: 'hashedPassword123',
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should assign roles after creating user', async () => {
      const createdUser = { id: 'user-new', username: 'newuser' };
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockPrismaService.userRole.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const dto = {
        username: 'newuser',
        email: 'new@eoffice.local',
        password: 'Password123',
        roleIds: ['role-1', 'role-2'],
      };

      await service.create(dto);

      expect(mockPrismaService.userRole.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-new', roleId: 'role-1' },
          { userId: 'user-new', roleId: 'role-2' },
        ],
      });
    });
  });

  // ===================== resetPassword =====================

  describe('resetPassword', () => {
    it('should hash and update the password', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.resetPassword('user-1', 'NewPassword456');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword456', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'hashedPassword123' },
      });
    });
  });

  // ===================== assignRoles =====================

  describe('assignRoles', () => {
    it('should replace user roles', async () => {
      mockPrismaService.userRole.deleteMany.mockResolvedValue({});
      mockPrismaService.userRole.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const dto = { roleIds: ['role-1', 'role-2'] };
      await service.assignRoles('user-1', dto);

      expect(mockPrismaService.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockPrismaService.userRole.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-1', roleId: 'role-1' },
          { userId: 'user-1', roleId: 'role-2' },
        ],
      });
    });
  });

  // ===================== assignBulkRoles =====================

  describe('assignBulkRoles', () => {
    it('should assign roles to multiple users using deleteMany+createMany', async () => {
      mockPrismaService.userRole.deleteMany.mockResolvedValue({});
      mockPrismaService.userRole.createMany.mockResolvedValue({ count: 2 });

      const dto = {
        userIds: ['user-1', 'user-2'],
        roleIds: ['role-1'],
      };

      const result = await service.assignBulkRoles(dto, 'admin-1');

      expect(mockPrismaService.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: { in: ['user-1', 'user-2'] } },
      });
      expect(mockPrismaService.userRole.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-1', roleId: 'role-1' },
          { userId: 'user-2', roleId: 'role-1' },
        ],
      });
      expect(result).toEqual({ success: true, count: 2 });
    });

    it('should throw BadRequestException when userIds is empty', async () => {
      const dto = { userIds: [], roleIds: ['role-1'] };

      await expect(service.assignBulkRoles(dto, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ===================== assignPermissions =====================

  describe('assignPermissions', () => {
    it('should replace user direct permissions', async () => {
      mockPrismaService.userPermission.deleteMany.mockResolvedValue({});
      mockPrismaService.userPermission.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const dto = { permissionIds: ['perm-1', 'perm-2'] };
      await service.assignPermissions('user-1', dto);

      expect(mockPrismaService.userPermission.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  // ===================== delete =====================

  describe('delete', () => {
    it('should delete user and return success', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userRole.deleteMany.mockResolvedValue({});
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.delete('user-1');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw BadRequestException on foreign key constraint', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userRole.deleteMany.mockResolvedValue({});

      const prismaError = Object.assign(new Error('Foreign key constraint'), {
        code: 'P2003',
        meta: { field_name: 'audit_logs' },
      });
      mockPrismaService.user.delete.mockRejectedValue(prismaError);

      await expect(service.delete('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
