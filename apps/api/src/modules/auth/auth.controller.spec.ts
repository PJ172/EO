import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
    getPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      const loginResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: '1', username: 'test' },
      };

      mockAuthService.login.mockResolvedValue(loginResponse);

      const result = await controller.login({
        username: 'test',
        password: 'password123',
      });

      expect(result).toEqual(loginResponse);
      expect(authService.login).toHaveBeenCalledWith('test', 'password123');
    });
  });

  describe('refresh', () => {
    it('should return new access token', async () => {
      const refreshResponse = { accessToken: 'new-access-token' };
      mockAuthService.refreshToken.mockResolvedValue(refreshResponse);

      const result = await controller.refresh({
        refreshToken: 'refresh-token',
      });

      expect(result).toEqual(refreshResponse);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout({
        refreshToken: 'refresh-token',
      });

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('getMe', () => {
    it('should return user profile', async () => {
      const userProfile = {
        id: '1',
        username: 'test',
        roles: ['ADMIN'],
      };

      mockAuthService.getMe.mockResolvedValue(userProfile);

      const result = await controller.getMe({ user: { sub: '1' } });

      expect(result).toEqual(userProfile);
      expect(authService.getMe).toHaveBeenCalledWith('1');
    });
  });

  describe('getPermissions', () => {
    it('should return permissions list', async () => {
      const permissions = ['USER_READ', 'USER_WRITE'];
      mockAuthService.getPermissions.mockResolvedValue(permissions);

      const result = await controller.getPermissions({ user: { sub: '1' } });

      expect(result).toEqual(permissions);
    });
  });
});
