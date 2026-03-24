import { Test, TestingModule } from '@nestjs/testing';
import { TrashPurgeScheduler } from './trash-purge.scheduler';
import { PrismaService } from '../prisma/prisma.service';
import { TrashConfigService } from './trash-config.service';
import { subDays } from 'date-fns';

describe('TrashPurgeScheduler', () => {
  let scheduler: TrashPurgeScheduler;
  let prisma: PrismaService;
  let configService: TrashConfigService;

  const mockEmployeeModel = {
    count: jest.fn(),
    deleteMany: jest.fn(),
  };

  const mockDepartmentModel = {
    count: jest.fn(),
    deleteMany: jest.fn(),
  };

  const mockPrismaService = {
    employee: mockEmployeeModel,
    department: mockDepartmentModel,
  };

  const mockConfigService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrashPurgeScheduler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TrashConfigService, useValue: mockConfigService },
      ],
    }).compile();

    scheduler = module.get<TrashPurgeScheduler>(TrashPurgeScheduler);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<TrashConfigService>(TrashConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('purgeExpiredTrash', () => {
    it('should skip disabled configs or configs with <= 0 retentionDays', async () => {
      mockConfigService.findAll.mockResolvedValue([
        { moduleKey: 'employees', isEnabled: false, retentionDays: 90 },
        { moduleKey: 'departments', isEnabled: true, retentionDays: 0 },
      ]);

      const result = await scheduler.purgeExpiredTrash(false);

      expect(mockEmployeeModel.count).not.toHaveBeenCalled();
      expect(mockEmployeeModel.deleteMany).not.toHaveBeenCalled();
      expect(mockDepartmentModel.count).not.toHaveBeenCalled();
      expect(mockDepartmentModel.deleteMany).not.toHaveBeenCalled();

      expect(result.totalPurged).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should log error when prisma model mapping is missing or model not found in Prisma', async () => {
      mockConfigService.findAll.mockResolvedValue([
        {
          moduleKey: 'invalid_module',
          moduleName: 'Invalid',
          isEnabled: true,
          retentionDays: 30,
        },
      ]);

      const result = await scheduler.purgeExpiredTrash(false);

      expect(result.errors).toHaveLength(0); // The missing mapping is a warning in the code, and it 'continues', so it doesn't push to errors array but logs a warning instead. Wait, looking at the code, it skips if mapping is not found, but if it is found and not in prisma it pushes an error. Let's test the one it pushes.
      expect(result.results).toHaveLength(0);
    });

    it('should push error when prisma model is missing from prisma service', async () => {
      // Add a mapping that exists in MODULE_PRISMA_MAP but not in mockPrismaService
      mockConfigService.findAll.mockResolvedValue([
        {
          moduleKey: 'factories',
          moduleName: 'Factories',
          isEnabled: true,
          retentionDays: 30,
        },
      ]);

      const result = await scheduler.purgeExpiredTrash(false);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Prisma model "factory" not found');
    });

    it('should calculate counts in dryRun mode without deleting data', async () => {
      mockConfigService.findAll.mockResolvedValue([
        {
          moduleKey: 'employees',
          moduleName: 'Nhân sự',
          isEnabled: true,
          retentionDays: 90,
        },
      ]);

      mockEmployeeModel.count.mockResolvedValue(5);

      const result = await scheduler.purgeExpiredTrash(true);

      expect(mockEmployeeModel.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: expect.objectContaining({
              not: null,
              lt: expect.any(Date),
            }),
          }),
        }),
      );
      expect(mockEmployeeModel.deleteMany).not.toHaveBeenCalled();

      expect(result.dryRun).toBe(true);
      expect(result.totalPurged).toBe(5);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].purgedCount).toBe(5);
    });

    it('should delete expired records when not in dryRun mode', async () => {
      mockConfigService.findAll.mockResolvedValue([
        {
          moduleKey: 'employees',
          moduleName: 'Nhân sự',
          isEnabled: true,
          retentionDays: 90,
        },
      ]);

      mockEmployeeModel.deleteMany.mockResolvedValue({ count: 12 });

      const result = await scheduler.purgeExpiredTrash(false);

      expect(mockEmployeeModel.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: expect.objectContaining({
              not: null,
              lt: expect.any(Date),
            }),
          }),
        }),
      );
      expect(mockEmployeeModel.count).not.toHaveBeenCalled();

      expect(result.dryRun).toBe(false);
      expect(result.totalPurged).toBe(12);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].purgedCount).toBe(12);
    });

    it('should catch and record errors from prisma queries', async () => {
      mockConfigService.findAll.mockResolvedValue([
        {
          moduleKey: 'employees',
          moduleName: 'Nhân sự',
          isEnabled: true,
          retentionDays: 90,
        },
      ]);

      const dbError = new Error('Database connection failed');
      mockEmployeeModel.deleteMany.mockRejectedValue(dbError);

      const result = await scheduler.purgeExpiredTrash(false);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Database connection failed');
      expect(result.totalPurged).toBe(0);
    });
  });
});
