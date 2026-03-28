import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingService } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getRooms', () => {
    it('should return rooms ordered by name', async () => {
      prisma.meetingRoom.findMany.mockResolvedValue([
        { id: 'r1', name: 'Room A', equipmentsJson: null },
        { id: 'r2', name: 'Room B', equipmentsJson: { description: 'Test' } },
      ]);

      const result = await service.getRooms();

      expect(result).toHaveLength(2);
      expect(prisma.meetingRoom.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('should map equipmentsJson to flat fields', async () => {
      prisma.meetingRoom.findMany.mockResolvedValue([
        {
          id: 'r1', name: 'Room A',
          equipmentsJson: { description: 'Big room', equipment: ['Projector'], features: ['WiFi'] },
        },
      ]);

      const result = await service.getRooms();

      expect(result[0].description).toBe('Big room');
      expect(result[0].equipment).toEqual(['Projector']);
    });
  });

  describe('createBooking', () => {
    const userId = 'user-1';
    const validData = {
      roomId: 'room-1',
      startTime: '2026-04-01T09:00:00Z',
      endTime: '2026-04-01T10:00:00Z',
      purpose: 'Meeting',
    };

    it('should throw when end time is before start time', async () => {
      await expect(
        service.createBooking(userId, {
          ...validData,
          startTime: '2026-04-01T10:00:00Z',
          endTime: '2026-04-01T09:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when user has no employee profile', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);

      await expect(
        service.createBooking(userId, validData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when there is a room conflict', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 'emp-1' });
      prisma.roomBooking.findFirst.mockResolvedValue({ id: 'conflict-booking' });

      await expect(
        service.createBooking(userId, validData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create booking when no conflicts', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 'emp-1' });
      prisma.roomBooking.findFirst.mockResolvedValue(null);
      prisma.roomBooking.create.mockResolvedValue({ id: 'new-booking' });

      const result = await service.createBooking(userId, validData);

      expect(prisma.roomBooking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          roomId: 'room-1',
          organizerEmployeeId: 'emp-1',
          title: 'Meeting',
          status: 'CONFIRMED',
        }),
      });
    });
  });

  describe('deleteBooking', () => {
    it('should throw when booking not found', async () => {
      prisma.roomBooking.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        employee: { id: 'e1' },
        roles: [],
      });

      await expect(
        service.deleteBooking('nonexistent', 'u1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRoom', () => {
    it('should throw when room not found', async () => {
      prisma.meetingRoom.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRoom('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
