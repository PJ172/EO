import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EmployeeQueryService } from './employee-query.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationService } from '../../organization/organization.service';
import { createMockPrismaService } from '../../../test/prisma-mock';

describe('EmployeeQueryService', () => {
  let service: EmployeeQueryService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let organizationService: { getChildUnitIds: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    cacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    organizationService = {
      getChildUnitIds: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeQueryService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: OrganizationService, useValue: organizationService },
      ],
    }).compile();

    service = module.get<EmployeeQueryService>(EmployeeQueryService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('isAdministratorUser', () => {
    it('should return true for user with ADMIN role code', () => {
      const user = { roles: [{ role: { code: 'ADMIN', name: 'Administrator' } }] };
      expect(service.isAdministratorUser(user)).toBe(true);
    });

    it('should return true for user with SUPER_ADMIN role code', () => {
      const user = { roles: [{ role: { code: 'SUPER_ADMIN', name: 'Super Admin' } }] };
      expect(service.isAdministratorUser(user)).toBe(true);
    });

    it('should return true for flat string roles array', () => {
      const user = { roles: ['ADMIN'] };
      expect(service.isAdministratorUser(user)).toBe(true);
    });

    it('should return false for user with non-admin roles', () => {
      const user = { roles: [{ role: { code: 'HR_MANAGER', name: 'HR Manager' } }] };
      expect(service.isAdministratorUser(user)).toBe(false);
    });

    it('should return false for user with empty roles', () => {
      const user = { roles: [] };
      expect(service.isAdministratorUser(user)).toBe(false);
    });

    it('should return false for null/undefined user', () => {
      expect(service.isAdministratorUser(null)).toBe(false);
      expect(service.isAdministratorUser(undefined)).toBe(false);
    });

    it('should NOT grant admin based on username alone', () => {
      const user = { username: 'admin', roles: [] };
      expect(service.isAdministratorUser(user)).toBe(false);
    });

    it('should NOT grant admin to user named "it" without ADMIN role', () => {
      const user = { username: 'it', roles: [{ role: { code: 'HR_STAFF' } }] };
      expect(service.isAdministratorUser(user)).toBe(false);
    });
  });

  describe('getOrgChartStructure', () => {
    it('should return cached data if available', async () => {
      const cachedData = { nodes: [], edges: [] };
      cacheManager.get.mockResolvedValue(cachedData);

      const result = await service.getOrgChartStructure();

      expect(result).toBe(cachedData);
      expect(prisma.company.findMany).not.toHaveBeenCalled();
    });

    it('should use groupBy for employee counting instead of findMany', async () => {
      cacheManager.get.mockResolvedValue(null);
      prisma.company.findMany.mockResolvedValue([]);
      prisma.factory.findMany.mockResolvedValue([]);
      prisma.division.findMany.mockResolvedValue([]);
      prisma.department.findMany.mockResolvedValue([]);
      prisma.section.findMany.mockResolvedValue([]);
      prisma.employee.groupBy.mockResolvedValue([]);

      await service.getOrgChartStructure();

      // Should call groupBy 5 times (one per org unit type)
      expect(prisma.employee.groupBy).toHaveBeenCalledTimes(5);
      // Should NOT load all employees with findMany
      expect(prisma.employee.findMany).not.toHaveBeenCalled();
    });

    it('should cache the result', async () => {
      cacheManager.get.mockResolvedValue(null);
      prisma.company.findMany.mockResolvedValue([]);
      prisma.factory.findMany.mockResolvedValue([]);
      prisma.division.findMany.mockResolvedValue([]);
      prisma.department.findMany.mockResolvedValue([]);
      prisma.section.findMany.mockResolvedValue([]);
      prisma.employee.groupBy.mockResolvedValue([]);

      await service.getOrgChartStructure();

      expect(cacheManager.set).toHaveBeenCalledWith(
        'org_chart_structure',
        expect.any(Object),
        expect.any(Number),
      );
    });
  });
});
