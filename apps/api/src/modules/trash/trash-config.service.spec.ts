import { Test, TestingModule } from '@nestjs/testing';
import { TrashConfigService } from './trash-config.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TrashConfigService', () => {
  let service: TrashConfigService;
  let prisma: PrismaService;

  const mockPrismaService = {
    trashRetentionConfig: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockConfig = {
    id: 'config-1',
    moduleKey: 'users',
    moduleName: 'Tài khoản người dùng',
    retentionDays: 90,
    isEnabled: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrashConfigService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TrashConfigService>(TrashConfigService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all trash retention configs', async () => {
      mockPrismaService.trashRetentionConfig.findMany.mockResolvedValue([
        mockConfig,
      ]);
      const result = await service.findAll();

      expect(
        mockPrismaService.trashRetentionConfig.findMany,
      ).toHaveBeenCalled();
      expect(result).toEqual([mockConfig]);
    });
  });

  describe('findOne', () => {
    it('should return a single config by moduleKey', async () => {
      mockPrismaService.trashRetentionConfig.findUnique.mockResolvedValue(
        mockConfig,
      );
      const result = await service.findOne('users');

      expect(
        mockPrismaService.trashRetentionConfig.findUnique,
      ).toHaveBeenCalledWith({
        where: { moduleKey: 'users' },
      });
      expect(result).toEqual(mockConfig);
    });
  });

  describe('update', () => {
    it('should upsert the config with new values', async () => {
      const updatedConfig = {
        ...mockConfig,
        retentionDays: 7,
        isEnabled: false,
      };
      mockPrismaService.trashRetentionConfig.upsert.mockResolvedValue(
        updatedConfig,
      );

      const dto = { retentionDays: 7, isEnabled: false };
      const userId = 'admin-user';

      const result = await service.update('users', dto, userId);

      expect(
        mockPrismaService.trashRetentionConfig.upsert,
      ).toHaveBeenCalledWith({
        where: { moduleKey: 'users' },
        create: {
          moduleKey: 'users',
          moduleName: 'users',
          retentionDays: 7,
          isEnabled: false,
          updatedById: userId,
        },
        update: {
          retentionDays: 7,
          isEnabled: false,
          updatedById: userId,
        },
      });
      expect(result).toEqual(updatedConfig);
    });

    it('should only update provided fields', async () => {
      mockPrismaService.trashRetentionConfig.upsert.mockResolvedValue(
        mockConfig,
      );

      await service.update('users', { isEnabled: false });

      expect(
        mockPrismaService.trashRetentionConfig.upsert,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            isEnabled: false,
          }),
        }),
      );
    });
  });

  describe('onModuleInit / upsertDefaults', () => {
    it('should iterate and upsert all default configs', async () => {
      mockPrismaService.trashRetentionConfig.upsert.mockResolvedValue({});

      await service.onModuleInit();

      // Should be called multiple times for each default config
      expect(mockPrismaService.trashRetentionConfig.upsert).toHaveBeenCalled();
      // Verify at least one specific call (e.g. employees)
      expect(
        mockPrismaService.trashRetentionConfig.upsert,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { moduleKey: 'employees' },
          create: expect.objectContaining({
            moduleKey: 'employees',
            retentionDays: 90,
          }),
        }),
      );
    });
  });
});
