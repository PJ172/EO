import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketWorkflowService } from './ticket-workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../../test/prisma-mock';

describe('TicketService', () => {
  let service: TicketService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let workflowService: { findMatchingConfig: jest.Mock; moveToNextStep: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    workflowService = {
      findMatchingConfig: jest.fn().mockResolvedValue(null),
      moveToNextStep: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        { provide: PrismaService, useValue: prisma },
        { provide: TicketWorkflowService, useValue: workflowService },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getCategories', () => {
    it('should return all categories ordered by name', async () => {
      const mockCategories = [
        { id: '1', name: 'Hardware', slaHours: 24, _count: { tickets: 5 } },
        { id: '2', name: 'Software', slaHours: 48, _count: { tickets: 3 } },
      ];
      prisma.ticketCategory.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategories();

      expect(result).toEqual(mockCategories);
      expect(prisma.ticketCategory.findMany).toHaveBeenCalledWith({
        include: { _count: { select: { tickets: true } } },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findAll', () => {
    it('should paginate results with default page=1 limit=20', async () => {
      prisma.ticket.findMany.mockResolvedValue([]);
      prisma.ticket.count.mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.meta).toEqual({
        total: 0, page: 1, limit: 20, totalPages: 0,
      });
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should filter by status', async () => {
      prisma.ticket.findMany.mockResolvedValue([]);
      prisma.ticket.count.mockResolvedValue(0);

      await service.findAll({ status: 'IN_PROGRESS' });

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
    });

    it('should support search across title, code, description', async () => {
      prisma.ticket.findMany.mockResolvedValue([]);
      prisma.ticket.count.mockResolvedValue(0);

      await service.findAll({ search: 'network' });

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findMyTickets', () => {
    it('should return empty array when user has no employee profile', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', employee: null });

      const result = await service.findMyTickets('u1');

      expect(result).toEqual([]);
    });

    it('should have take limit for safety', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        employee: { id: 'emp1' },
      });
      prisma.ticket.findMany.mockResolvedValue([]);

      await service.findMyTickets('u1');

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when ticket not found', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteCategory', () => {
    it('should not delete category with existing tickets', async () => {
      prisma.ticketCategory.findUnique.mockResolvedValue({
        id: '1',
        _count: { tickets: 5 },
      });

      await expect(service.deleteCategory('1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStatistics', () => {
    it('should use take limit on resolution time queries', async () => {
      prisma.ticket.count.mockResolvedValue(0);
      prisma.ticket.groupBy.mockResolvedValue([]);
      prisma.ticket.findMany.mockResolvedValue([]);
      prisma.ticketCategory.findMany.mockResolvedValue([]);

      await service.getStatistics();

      // avgResolutionTime query should have take: 10000
      const findManyCalls = prisma.ticket.findMany.mock.calls;
      const hasLimit = findManyCalls.some(
        (call: any) => call[0]?.take === 10000,
      );
      expect(hasLimit).toBe(true);
    });
  });

  describe('rate', () => {
    it('should reject rating outside 1-5 range', async () => {
      await expect(service.rate('ticket-1', 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.rate('ticket-1', 6)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept valid rating', async () => {
      prisma.ticket.update.mockResolvedValue({ id: 'ticket-1', rating: 4 });

      const result = await service.rate('ticket-1', 4);

      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        data: { rating: 4 },
      });
    });
  });
});
