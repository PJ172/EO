import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const createMockContext = (user: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn() as any,
      getArgs: () => [] as any,
      getArgByIndex: () => ({}) as any,
      switchToRpc: () => ({}) as any,
      switchToWs: () => ({}) as any,
      getType: () => 'http' as any,
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // ===================== No permissions required =====================

  describe('when no permissions are required', () => {
    it('should allow access when no @Permissions decorator is present', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);

      const context = createMockContext({ id: 'user-1' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when empty permissions array', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([]);

      const context = createMockContext({ id: 'user-1' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  // ===================== Admin bypass =====================

  describe('admin bypass', () => {
    it('should allow ADMIN access to any protected endpoint', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
        'EMPLOYEE_DELETE',
      ]);

      const context = createMockContext({
        id: 'admin-1',
        roles: ['ADMIN'],
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should NOT query database since admin has all permissions
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    });
  });

  // ===================== User with required permissions =====================

  describe('user with permissions', () => {
    it('should allow access when user has required permission via role', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
        'EMPLOYEE_READ',
      ]);

      const mockUserWithPerms = {
        roles: [
          {
            role: {
              permissions: [
                { permission: { code: 'EMPLOYEE_READ' } },
                { permission: { code: 'EMPLOYEE_CREATE' } },
              ],
            },
          },
        ],
        permissions: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithPerms);

      const context = createMockContext({ id: 'user-1' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required permission via direct assignment', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
        'AUDITLOG_VIEW',
      ]);

      const mockUserWithDirectPerm = {
        roles: [{ role: { permissions: [] } }],
        permissions: [{ permission: { code: 'AUDITLOG_VIEW' } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(
        mockUserWithDirectPerm,
      );

      const context = createMockContext({ id: 'user-2' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  // ===================== User without required permissions =====================

  describe('user without permissions', () => {
    it('should throw ForbiddenException when user lacks required permission', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
        'ADMIN_MANAGE',
      ]);

      const mockUserLimited = {
        roles: [
          {
            role: {
              permissions: [{ permission: { code: 'EMPLOYEE_READ' } }],
            },
          },
        ],
        permissions: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUserLimited);

      const context = createMockContext({ id: 'user-3' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user not found in DB', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
        'EMPLOYEE_READ',
      ]);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const context = createMockContext({ id: 'nonexistent' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===================== Edge cases =====================

  describe('edge cases', () => {
    it('should throw ForbiddenException when no user in request', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
        'EMPLOYEE_READ',
      ]);

      const context = createMockContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should require ALL listed permissions', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
        'EMPLOYEE_READ',
        'EMPLOYEE_UPDATE',
      ]);

      const mockUserPartialPerms = {
        roles: [
          {
            role: {
              permissions: [
                { permission: { code: 'EMPLOYEE_READ' } },
                // Missing EMPLOYEE_UPDATE
              ],
            },
          },
        ],
        permissions: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUserPartialPerms);

      const context = createMockContext({ id: 'user-4' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should combine role permissions and direct permissions', async () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
        'EMPLOYEE_READ',
        'AUDITLOG_VIEW',
      ]);

      const mockUserCombined = {
        roles: [
          {
            role: {
              permissions: [{ permission: { code: 'EMPLOYEE_READ' } }],
            },
          },
        ],
        permissions: [{ permission: { code: 'AUDITLOG_VIEW' } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUserCombined);

      const context = createMockContext({ id: 'user-5' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
