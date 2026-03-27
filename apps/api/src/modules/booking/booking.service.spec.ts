import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: any;

  const mockEmployee = { id: 'emp-1', userId: 'user-1' };

  beforeEach(async () => {
    prisma = {
      employee: { findUnique: jest.fn() },
      roomBooking: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  describe('createBooking — single', () => {
    it('should create a single booking when not recurring', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.roomBooking.findFirst.mockResolvedValue(null);
      prisma.roomBooking.create.mockResolvedValue({ id: 'booking-1' });

      const result = await service.createBooking('user-1', {
        roomId: 'room-1',
        startTime: '2026-04-01T08:00:00.000Z',
        endTime: '2026-04-01T09:00:00.000Z',
        purpose: 'Họp giao ban',
      });

      expect(result).toEqual({ id: 'booking-1' });
      expect(prisma.roomBooking.create).toHaveBeenCalledTimes(1);
    });

    it('should throw if start >= end', async () => {
      await expect(
        service.createBooking('user-1', {
          roomId: 'room-1',
          startTime: '2026-04-01T10:00:00.000Z',
          endTime: '2026-04-01T09:00:00.000Z',
          purpose: 'Invalid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if employee not found', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);

      await expect(
        service.createBooking('user-unknown', {
          roomId: 'room-1',
          startTime: '2026-04-01T08:00:00.000Z',
          endTime: '2026-04-01T09:00:00.000Z',
          purpose: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw on conflict for single booking', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.roomBooking.findFirst.mockResolvedValue({ id: 'conflict-1' });

      await expect(
        service.createBooking('user-1', {
          roomId: 'room-1',
          startTime: '2026-04-01T08:00:00.000Z',
          endTime: '2026-04-01T09:00:00.000Z',
          purpose: 'Conflict',
        }),
      ).rejects.toThrow('Phòng đã có người đặt trong khung giờ này');
    });
  });

  describe('createBooking — recurring', () => {
    it('should generate WEEKLY instances for 4 weeks', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.roomBooking.findFirst.mockResolvedValue(null); // No conflicts
      prisma.roomBooking.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `booking-${data.startDatetime.toISOString()}`, ...data }),
      );

      const result = await service.createBooking('user-1', {
        roomId: 'room-1',
        startTime: '2026-04-01T08:00:00.000Z',
        endTime: '2026-04-01T09:00:00.000Z',
        purpose: 'Họp giao ban tuần',
        isRecurring: true,
        recurringRule: 'WEEKLY',
        recurringEndDate: '2026-04-22T23:59:59.000Z',
      });

      expect(result.created).toBe(4); // Apr 1, 8, 15, 22
      expect(result.skipped).toBe(0);
      expect(result.recurringGroupId).toBeDefined();
      expect(prisma.roomBooking.create).toHaveBeenCalledTimes(4);
    });

    it('should generate DAILY instances', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.roomBooking.findFirst.mockResolvedValue(null);
      prisma.roomBooking.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `booking-${Date.now()}`, ...data }),
      );

      const result = await service.createBooking('user-1', {
        roomId: 'room-1',
        startTime: '2026-04-01T08:00:00.000Z',
        endTime: '2026-04-01T09:00:00.000Z',
        purpose: 'Standup hàng ngày',
        isRecurring: true,
        recurringRule: 'DAILY',
        recurringEndDate: '2026-04-07T23:59:59.000Z',
      });

      expect(result.created).toBe(7); // Apr 1-7
      expect(result.skipped).toBe(0);
    });

    it('should generate MONTHLY instances', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.roomBooking.findFirst.mockResolvedValue(null);
      prisma.roomBooking.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `booking-${Date.now()}`, ...data }),
      );

      const result = await service.createBooking('user-1', {
        roomId: 'room-1',
        startTime: '2026-04-01T08:00:00.000Z',
        endTime: '2026-04-01T09:00:00.000Z',
        purpose: 'Họp tháng',
        isRecurring: true,
        recurringRule: 'MONTHLY',
        recurringEndDate: '2026-07-01T23:59:59.000Z',
      });

      expect(result.created).toBe(4); // Apr 1, May 1, Jun 1, Jul 1
      expect(result.skipped).toBe(0);
    });

    it('should skip conflicting instances silently', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);

      // First call: no conflict. Second call: conflict. Third: no. Fourth: no.
      prisma.roomBooking.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'conflict' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      prisma.roomBooking.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `booking-${Date.now()}`, ...data }),
      );

      const result = await service.createBooking('user-1', {
        roomId: 'room-1',
        startTime: '2026-04-01T08:00:00.000Z',
        endTime: '2026-04-01T09:00:00.000Z',
        purpose: 'Họp có conflict',
        isRecurring: true,
        recurringRule: 'WEEKLY',
        recurringEndDate: '2026-04-22T23:59:59.000Z',
      });

      expect(result.created).toBe(3); // 4 instances, 1 skipped
      expect(result.skipped).toBe(1);
      expect(prisma.roomBooking.create).toHaveBeenCalledTimes(3);
    });

    it('should cap at MAX_INSTANCES (52)', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.roomBooking.findFirst.mockResolvedValue(null);
      prisma.roomBooking.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `booking-${Date.now()}`, ...data }),
      );

      const result = await service.createBooking('user-1', {
        roomId: 'room-1',
        startTime: '2026-01-01T08:00:00.000Z',
        endTime: '2026-01-01T09:00:00.000Z',
        purpose: 'Daily quá dài',
        isRecurring: true,
        recurringRule: 'DAILY',
        recurringEndDate: '2026-12-31T23:59:59.000Z', // 365 days
      });

      expect(result.created).toBe(52); // Capped
    });

    it('should set recurringGroupId on all instances', async () => {
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.roomBooking.findFirst.mockResolvedValue(null);

      const createdBookings: any[] = [];
      prisma.roomBooking.create.mockImplementation(({ data }) => {
        const booking = { id: `booking-${createdBookings.length}`, ...data };
        createdBookings.push(booking);
        return Promise.resolve(booking);
      });

      const result = await service.createBooking('user-1', {
        roomId: 'room-1',
        startTime: '2026-04-01T08:00:00.000Z',
        endTime: '2026-04-01T09:00:00.000Z',
        purpose: 'Shared group',
        isRecurring: true,
        recurringRule: 'WEEKLY',
        recurringEndDate: '2026-04-15T23:59:59.000Z',
      });

      // All should have same recurringGroupId
      const groupIds = createdBookings.map((b) => b.recurringGroupId);
      expect(new Set(groupIds).size).toBe(1);
      expect(groupIds[0]).toBeDefined();
    });
  });

  describe('deleteBooking', () => {
    it('should delete a single booking', async () => {
      prisma.roomBooking.findUnique.mockResolvedValue({
        id: 'booking-1',
        organizerEmployeeId: 'emp-1',
        recurringGroupId: null,
      });
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.roomBooking.delete.mockResolvedValue({ id: 'booking-1' });

      const result = await service.deleteBooking('booking-1', 'user-1');
      expect(prisma.roomBooking.delete).toHaveBeenCalledWith({ where: { id: 'booking-1' } });
    });

    it('should delete all instances when deleteAll=true and recurringGroupId exists', async () => {
      prisma.roomBooking.findUnique.mockResolvedValue({
        id: 'booking-1',
        organizerEmployeeId: 'emp-1',
        recurringGroupId: 'group-abc',
      });
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.roomBooking.deleteMany.mockResolvedValue({ count: 4 });

      const result = await service.deleteBooking('booking-1', 'user-1', true);
      expect(prisma.roomBooking.deleteMany).toHaveBeenCalledWith({
        where: { recurringGroupId: 'group-abc' },
      });
    });

    it('should delete single even with deleteAll if no recurringGroupId', async () => {
      prisma.roomBooking.findUnique.mockResolvedValue({
        id: 'booking-1',
        organizerEmployeeId: 'emp-1',
        recurringGroupId: null,
      });
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.roomBooking.delete.mockResolvedValue({ id: 'booking-1' });

      await service.deleteBooking('booking-1', 'user-1', true);
      expect(prisma.roomBooking.delete).toHaveBeenCalled();
      expect(prisma.roomBooking.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when booking not found', async () => {
      prisma.roomBooking.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteBooking('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if not organizer and not admin', async () => {
      prisma.roomBooking.findUnique.mockResolvedValue({
        id: 'booking-1',
        organizerEmployeeId: 'emp-other',
      });
      prisma.employee.findUnique.mockResolvedValue(mockEmployee);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        roles: [{ code: 'USER', perms: ['ROOM_READ'] }],
      });

      await expect(
        service.deleteBooking('booking-1', 'user-1'),
      ).rejects.toThrow('Bạn không có quyền hủy lịch này');
    });
  });
});
