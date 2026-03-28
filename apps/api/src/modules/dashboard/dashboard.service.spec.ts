import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    cacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getEmployeeStats', () => {
    it('should return total, byStatus, byDepartment', async () => {
      prisma.employee.count.mockResolvedValue(100);
      prisma.employee.groupBy
        .mockResolvedValueOnce([{ employmentStatus: 'OFFICIAL', _count: { id: 80 } }])
        .mockResolvedValueOnce([{ departmentId: 'd1', _count: { id: 50 } }]);
      prisma.department.findMany.mockResolvedValue([
        { id: 'd1', name: 'Engineering' },
      ]);

      const result = await service.getEmployeeStats();

      expect(result.total).toBe(100);
      expect(result.byStatus).toHaveLength(1);
      expect(result.byDepartment).toHaveLength(1);
      expect(result.byDepartment[0].departmentName).toBe('Engineering');
    });
  });

  describe('getAllStats', () => {
    it('should return cached data if available', async () => {
      const cached = { employees: {}, cached: true };
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.getAllStats();

      expect(result).toBe(cached);
      expect(prisma.employee.count).not.toHaveBeenCalled();
    });

    it('should fetch all stats in parallel and cache when no cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      prisma.employee.count.mockResolvedValue(0);
      prisma.employee.groupBy.mockResolvedValue([]);
      prisma.department.findMany.mockResolvedValue([]);
      prisma.roomBooking.count.mockResolvedValue(0);
      prisma.roomBooking.groupBy.mockResolvedValue([]);
      prisma.roomBooking.findMany.mockResolvedValue([]);
      prisma.meetingRoom.findMany.mockResolvedValue([]);
      prisma.leaveRequest.count.mockResolvedValue(0);
      prisma.leaveRequest.groupBy.mockResolvedValue([]);
      prisma.leaveType.findMany.mockResolvedValue([]);
      prisma.request.count.mockResolvedValue(0);
      prisma.request.groupBy.mockResolvedValue([]);

      const result = await service.getAllStats();

      expect(result).toHaveProperty('employees');
      expect(result).toHaveProperty('bookings');
      expect(result).toHaveProperty('leaves');
      expect(result).toHaveProperty('requests');
      expect(cacheManager.set).toHaveBeenCalledWith(
        'dashboard:all-stats',
        expect.any(Object),
        expect.any(Number),
      );
    });
  });

  describe('invalidateDashboardCache', () => {
    it('should delete the cache key', async () => {
      await service.invalidateDashboardCache();

      expect(cacheManager.del).toHaveBeenCalledWith('dashboard:all-stats');
    });
  });
});
