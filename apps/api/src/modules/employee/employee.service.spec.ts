import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExcelService } from '../../shared/excel.service';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let prisma: PrismaService;

  const mockEmployee = {
    id: 'emp-1',
    employeeCode: 'NV001',
    fullName: 'Nguyễn Văn A',
    phone: '0901234567',
    emailCompany: 'a@company.com',
    departmentId: 'dept-1',
    jobTitleId: 'job-1',
    employmentStatus: 'OFFICIAL',
    createdAt: new Date(),
    updatedAt: new Date(),
    department: { id: 'dept-1', name: 'IT', parent: null },
    jobTitle: { id: 'job-1', name: 'Developer' },
    manager: null,
    section: null,
    user: null,
  };

  const mockPrismaService = {
    employee: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    department: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    jobTitle: {
      findMany: jest.fn(),
    },
    leaveRequest: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    attendance: {
      findMany: jest.fn(),
    },
    employmentEvent: {
      findMany: jest.fn(),
    },
  };

  const mockExcelService = {
    exportToExcel: jest.fn(),
    createTemplate: jest.fn(),
    parseExcel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExcelService, useValue: mockExcelService },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===================== findAll =====================

  describe('findAll', () => {
    it('should return paginated employees', async () => {
      const mockData = [mockEmployee];
      mockPrismaService.employee.findMany.mockResolvedValue(mockData);
      mockPrismaService.employee.count.mockResolvedValue(1);

      const result = (await service.findAll({ page: 1, limit: 20 }, {} as any)) as any;

      expect(result.data).toEqual(mockData);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([]);
      mockPrismaService.employee.count.mockResolvedValue(0);

      await service.findAll(
        { page: 1, limit: 20, search: 'Nguyễn' },
        {} as any,
      );

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                fullName: { contains: 'Nguyễn', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should apply department filter', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([]);
      mockPrismaService.employee.count.mockResolvedValue(0);

      await service.findAll(
        { page: 1, limit: 20, departmentId: 'dept-1' },
        {} as any,
      );

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ departmentId: 'dept-1' }),
        }),
      );
    });

    it('should apply status filter', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([]);
      mockPrismaService.employee.count.mockResolvedValue(0);

      await service.findAll(
        { page: 1, limit: 20, status: 'OFFICIAL' },
        {} as any,
      );

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ employmentStatus: 'OFFICIAL' }),
        }),
      );
    });

    it('should calculate correct pagination', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([]);
      mockPrismaService.employee.count.mockResolvedValue(55);

      const result = (await service.findAll({ page: 3, limit: 20 }, {} as any)) as any;

      expect(result.meta.totalPages).toBe(3);
      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        }),
      );
    });
  });

  // ===================== findOne =====================

  describe('findOne', () => {
    it('should return employee when found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);

      const result = await service.findOne('emp-1');

      expect(result).toEqual(mockEmployee);
      expect(mockPrismaService.employee.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'emp-1' } }),
      );
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===================== create =====================

  describe('create', () => {
    it('should create a new employee with basic info', async () => {
      const dto = {
        employeeCode: 'NV002',
        fullName: 'Trần Văn B',
        phone: '0912345678',
        emailCompany: 'b@company.com',
      };
      const createdEmployee = { id: 'emp-2', ...dto };

      mockPrismaService.employee.create.mockResolvedValue(createdEmployee);

      const result = await service.create(dto as any);

      expect(result).toEqual(createdEmployee);
      expect(mockPrismaService.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employeeCode: 'NV002',
            fullName: 'Trần Văn B',
          }),
        }),
      );
    });

    it('should sanitize empty FK fields to undefined', async () => {
      const dto = {
        employeeCode: 'NV003',
        fullName: 'Lê Văn C',
        departmentId: '', // Empty string should be sanitized
        jobTitleId: '  ', // Whitespace should be sanitized
      };

      mockPrismaService.employee.create.mockResolvedValue({
        id: 'emp-3',
        ...dto,
      });

      await service.create(dto as any);

      expect(mockPrismaService.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            departmentId: undefined,
            jobTitleId: undefined,
          }),
        }),
      );
    });
  });

  // ===================== update =====================

  describe('update', () => {
    it('should update employee data', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.employee.update.mockResolvedValue({
        ...mockEmployee,
        fullName: 'Nguyễn Văn A Updated',
      });

      const result = await service.update('emp-1', {
        fullName: 'Nguyễn Văn A Updated',
      } as any);

      expect(result.fullName).toBe('Nguyễn Văn A Updated');
    });

    it('should deactivate linked user when status changes to RESIGNED', async () => {
      const empWithUser = {
        ...mockEmployee,
        user: { id: 'user-1', username: 'nvana', status: 'ACTIVE' },
      };
      mockPrismaService.employee.findUnique.mockResolvedValue(empWithUser);
      mockPrismaService.employee.update.mockResolvedValue({
        ...empWithUser,
        employmentStatus: 'RESIGNED',
      });

      await service.update('emp-1', { employmentStatus: 'RESIGNED' } as any);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: 'INACTIVE' },
      });
    });
  });

  // ===================== delete =====================

  describe('delete', () => {
    it('should delete employee when no constraints', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.department.count.mockResolvedValue(0);
      mockPrismaService.employee.count.mockResolvedValue(0);
      mockPrismaService.leaveRequest.count.mockResolvedValue(0);
      mockPrismaService.employee.delete.mockResolvedValue(mockEmployee);

      const result = await service.delete('emp-1');

      expect(result).toEqual(mockEmployee);
    });

    it('should throw BadRequestException if employee has linked user', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-1',
        username: 'nvana',
      });

      await expect(service.delete('emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if employee manages departments', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.department.count.mockResolvedValue(2);

      await expect(service.delete('emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if employee has subordinates', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.department.count.mockResolvedValue(0);
      mockPrismaService.employee.count.mockResolvedValue(5);

      await expect(service.delete('emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if employee has leave history', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.department.count.mockResolvedValue(0);
      mockPrismaService.employee.count.mockResolvedValue(0);
      mockPrismaService.leaveRequest.count.mockResolvedValue(3);

      await expect(service.delete('emp-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ===================== getLeaveRequests =====================

  describe('getLeaveRequests', () => {
    it('should return leave requests for employee', async () => {
      const mockLeaves = [{ id: 'leave-1', status: 'APPROVED' }];
      mockPrismaService.leaveRequest.findMany.mockResolvedValue(mockLeaves);

      const result = await service.getLeaveRequests('emp-1');

      expect(result).toEqual(mockLeaves);
      expect(mockPrismaService.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { employeeId: 'emp-1' },
        }),
      );
    });
  });

  // ===================== getAttendance =====================

  describe('getAttendance', () => {
    it('should return attendance records with date range', async () => {
      const mockAttendance = [{ id: 'att-1', status: 'PRESENT' }];
      mockPrismaService.attendance.findMany.mockResolvedValue(mockAttendance);

      const result = await service.getAttendance(
        'emp-1',
        '2026-01-01',
        '2026-01-31',
      );

      expect(result).toEqual(mockAttendance);
    });
  });
});
