import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [
      {
        role: {
          id: 'role-1',
          code: 'ADMIN',
          name: 'Administrator',
        },
      },
    ],
    employee: {
      id: 'emp-1',
      fullName: 'Test User',
      department: {
        id: 'dept-1',
        name: 'IT',
      },
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        include: expect.any(Object),
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'INACTIVE',
      });

      await expect(
        service.validateUser('testuser', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('testuser', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return tokens and user data on successful login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'token-1',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('testuser', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe('testuser');
      expect(result.user.roles).toContain('ADMIN');
      expect(jwtService.sign).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should return new access token when refresh token is valid', async () => {
      const storedToken = {
        id: 'token-1',
        token: 'valid-refresh-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException when token not found', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      const expiredToken = {
        id: 'token-1',
        token: 'expired-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(expiredToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue({});

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should delete refresh token', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('some-token');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
      });
    });
  });

  describe('getMe', () => {
    it('should return user profile with permissions', async () => {
      const userWithPermissions = {
        ...mockUser,
        roles: [
          {
            role: {
              code: 'ADMIN',
              permissions: [
                { permission: { code: 'USER_READ' } },
                { permission: { code: 'USER_WRITE' } },
              ],
            },
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithPermissions);

      const result = await service.getMe('user-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('permissions');
      expect(result.permissions).toContain('USER_READ');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
