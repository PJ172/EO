import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketWorkflowService } from './ticket-workflow.service';
import type {
  CreateTicketCategoryDto,
  CreateTicketDto,
  UpdateTicketDto,
  AssignTicketDto,
  ResolveTicketDto,
  AddTicketCommentDto,
} from './dto/ticket.dto';

// Sử dụng hằng số thay cho Enum từ Prisma để chống lỗi không đồng bộ types
const TicketStatus = {
  DRAFT: 'DRAFT' as any,
  DEPT_PENDING: 'DEPT_PENDING' as any,
  IT_PENDING: 'IT_PENDING' as any,
  IN_PROGRESS: 'IN_PROGRESS' as any,
  RESOLVED: 'RESOLVED' as any,
  CLOSED: 'CLOSED' as any,
  REJECTED: 'REJECTED' as any,
};

const ApprovalStatus = {
  PENDING: 'PENDING' as any,
  APPROVED: 'APPROVED' as any,
  REJECTED: 'REJECTED' as any,
};

@Injectable()
export class TicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: TicketWorkflowService,
  ) {}

  // =====================
  // CATEGORIES
  // =====================

  async getCategories() {
    return this.prisma.ticketCategory.findMany({
      include: { _count: { select: { tickets: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateTicketCategoryDto) {
    return this.prisma.ticketCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        slaHours: dto.slaHours || 24,
      },
    });
  }

  async deleteCategory(id: string) {
    const cat = await this.prisma.ticketCategory.findUnique({
      where: { id },
      include: { _count: { select: { tickets: true } } },
    });
    if (!cat) throw new NotFoundException('Không tìm thấy danh mục');
    if ((cat as any)._count.tickets > 0)
      throw new BadRequestException('Danh mục đang có ticket, không thể xóa');
    await this.prisma.ticketCategory.delete({ where: { id } });
    return { success: true };
  }

  // =====================
  // TICKETS
  // =====================

  async findAll(params: {
    status?: string;
    priority?: string;
    categoryId?: string;
    assigneeId?: string;
    search?: string;
    isDeleted?: boolean;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      priority,
      categoryId,
      assigneeId,
      search,
      page = 1,
      limit = 20,
    } = params;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: params.isDeleted ? { not: null } : null };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          requester: {
            select: {
              id: true,
              fullName: true,
              employeeCode: true,
              department: { select: { name: true } },
            },
          },
          assignee: {
            select: { id: true, fullName: true, employeeCode: true },
          },
          _count: { select: { comments: true } },
        } as any,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] as any,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMyTickets(userId: string, isDeleted: boolean = false) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user?.employee) return [];

    return this.prisma.ticket.findMany({
      where: {
        requesterId: user.employee.id,
        deletedAt: isDeleted ? { not: null } : null,
      },
      include: {
        category: true,
        assignee: { select: { id: true, fullName: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findAssignedToMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user?.employee) return [];

    return this.prisma.ticket.findMany({
      where: { assigneeId: user.employee.id, status: { notIn: ['CLOSED'] } },
      include: {
        category: true,
        requester: {
          select: {
            id: true,
            fullName: true,
            department: { select: { name: true } },
          },
        },
        _count: { select: { comments: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] as any,
      take: 200,
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        category: true,
        requester: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
        assignee: { select: { id: true, fullName: true, employeeCode: true } },
        comments: {
          include: { author: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      } as any,
    });
    if (!ticket) throw new NotFoundException('Không tìm thấy ticket');
    return ticket;
  }

  async create(userId: string, dto: CreateTicketDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user?.employee)
      throw new BadRequestException('Không tìm thấy nhân viên');

    const category = await this.prisma.ticketCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');

    // Auto-generate code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.ticket.count({
      where: { code: { startsWith: `TK-${dateStr}` } },
    });
    const code = `TK-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    const priority = (dto.priority as any) || 'MEDIUM';

    // Calculate SLA deadline
    const slaDeadline = new Date();
    if (priority === 'URGENT') {
      slaDeadline.setHours(slaDeadline.getHours() + 2);
    } else if (priority === 'HIGH') {
      slaDeadline.setHours(slaDeadline.getHours() + 4);
    } else if (priority === 'LOW') {
      slaDeadline.setHours(slaDeadline.getHours() + category.slaHours * 2);
    } else {
      slaDeadline.setHours(slaDeadline.getHours() + category.slaHours);
    }

    const ticket = await (this.prisma.ticket as any).create({
      data: {
        code,
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        priority: (dto.priority as any) || 'MEDIUM',
        requesterId: user.employee.id,
        slaDeadline,
        status: TicketStatus.DRAFT,
        assetId: (dto as any).assetId,
      },
      include: {
        category: true,
        requester: { select: { id: true, fullName: true } },
      },
    });

    // Tạo lịch sử lần đầu
    await (this.prisma as any).ticketHistory.create({
      data: {
        ticketId: ticket.id,
        actorId: user.employee.id,
        action: 'CREATED',
        newStatus: TicketStatus.DRAFT,
        comment: 'Người dùng tạo ticket mới',
      },
    });

    // Tự động tìm và gán workflow
    const workflow = await this.workflowService.findMatchingConfig(
      dto.categoryId,
      user.employee.id,
    );

    if (workflow) {
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { workflowConfigId: workflow.id } as any,
      });

      // Bắt đầu bước duyệt đầu tiên
      await this.workflowService.moveToNextStep(ticket.id, 'SYSTEM');
    } else {
      // Nếu không có workflow, chuyển thẳng lên IT_PENDING
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.IT_PENDING } as any,
      });
    }

    return this.findOne(ticket.id);
  }

  async approve(ticketId: string, userId: string, comment?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user?.employee)
      throw new BadRequestException('Không tìm thấy nhân viên');

    const approval = await (this.prisma as any).ticketApproval.findFirst({
      where: {
        ticketId,
        approverId: user.employee.id,
        status: ApprovalStatus.PENDING,
      },
      include: { step: true },
    });

    if (!approval)
      throw new ForbiddenException(
        'Bạn không có quyền duyệt ticket này ở bước hiện tại',
      );

    await this.prisma.$transaction([
      (this.prisma as any).ticketApproval.update({
        where: { id: approval.id },
        data: {
          status: ApprovalStatus.APPROVED,
          comment,
          reviewedAt: new Date(),
        },
      }),
      (this.prisma as any).ticketHistory.create({
        data: {
          ticketId,
          actorId: user.employee.id,
          action: 'APPROVED',
          newStatus: TicketStatus.DEPT_PENDING,
          comment: comment || `Phê duyệt bước: ${approval.step.name}`,
        },
      }),
    ]);

    await this.workflowService.moveToNextStep(ticketId, user.employee.id);

    return { success: true };
  }

  async reject(ticketId: string, userId: string, comment: string) {
    if (!comment) throw new BadRequestException('Vui lòng nhập lý do từ chối');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user?.employee)
      throw new BadRequestException('Không tìm thấy nhân viên');

    const approval = await (this.prisma as any).ticketApproval.findFirst({
      where: {
        ticketId,
        approverId: user.employee.id,
        status: ApprovalStatus.PENDING,
      },
    });

    if (!approval)
      throw new ForbiddenException('Bạn không có quyền từ chối ticket này');

    await this.prisma.$transaction([
      (this.prisma as any).ticketApproval.update({
        where: { id: approval.id },
        data: {
          status: ApprovalStatus.REJECTED,
          comment,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.REJECTED } as any,
      }),
      (this.prisma as any).ticketHistory.create({
        data: {
          ticketId,
          actorId: user.employee.id,
          action: 'REJECTED',
          oldStatus: TicketStatus.DEPT_PENDING,
          newStatus: TicketStatus.REJECTED,
          comment,
        },
      }),
    ]);

    return { success: true };
  }

  async assignTicket(id: string, dto: AssignTicketDto) {
    const ticket = await this.findOne(id);
    if (ticket.status === 'CLOSED')
      throw new BadRequestException('Ticket đã đóng');

    return this.prisma.ticket.update({
      where: { id },
      data: {
        assigneeId: dto.assigneeId,
        status: 'ASSIGNED' as any,
      },
      include: {
        category: true,
        assignee: { select: { id: true, fullName: true } },
      },
    });
  }

  async startProgress(id: string) {
    return this.prisma.ticket.update({
      where: { id },
      data: { status: 'IN_PROGRESS' as any },
    });
  }

  async resolve(id: string, dto: ResolveTicketDto) {
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: 'RESOLVED' as any,
        resolution: dto.resolution,
        resolvedAt: new Date(),
      },
    });
  }

  async close(id: string) {
    return this.prisma.ticket.update({
      where: { id },
      data: { status: 'CLOSED' as any, closedAt: new Date() },
    });
  }

  async reopen(id: string) {
    const ticket = await this.findOne(id);
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      throw new BadRequestException(
        'Chỉ có thể mở lại ticket đã giải quyết hoặc đã đóng',
      );
    }
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: 'REOPENED' as any,
        resolvedAt: null,
        closedAt: null,
        resolution: null,
      },
    });
  }

  async rate(id: string, rating: number) {
    if (rating < 1 || rating > 5)
      throw new BadRequestException('Rating phải từ 1 đến 5');
    return this.prisma.ticket.update({
      where: { id },
      data: { rating },
    });
  }

  // =====================
  // COMMENTS
  // =====================

  async addComment(ticketId: string, userId: string, dto: AddTicketCommentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user?.employee)
      throw new BadRequestException('Không tìm thấy nhân viên');

    return (this.prisma as any).ticketComment.create({
      data: {
        ticketId,
        authorId: user.employee.id,
        content: dto.content,
        isInternal: dto.isInternal || false,
      },
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  // =====================
  // STATISTICS
  // =====================

  async getStatistics() {
    const [total, byStatus, byPriority, byCategory, avgResolutionTime] =
      await Promise.all([
        this.prisma.ticket.count({ where: { deletedAt: null } }),
        this.prisma.ticket.groupBy({
          by: ['status'],
          _count: true as any,
          where: { deletedAt: null },
        }),
        this.prisma.ticket.groupBy({
          by: ['priority'],
          _count: true as any,
          where: { deletedAt: null },
        }),
        this.prisma.ticket.groupBy({
          by: ['categoryId'],
          _count: true as any,
          where: { deletedAt: null },
        }),
        this.prisma.ticket.findMany({
          where: { resolvedAt: { not: null }, deletedAt: null },
          select: { createdAt: true, resolvedAt: true },
          take: 10000,
        }),
      ]);

    // Calculate average resolution time (hours)
    let avgHours = 0;
    if (avgResolutionTime.length > 0) {
      const totalMs = avgResolutionTime.reduce((sum: any, t: any) => {
        return (
          sum +
          (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime())
        );
      }, 0);
      avgHours =
        Math.round((totalMs / avgResolutionTime.length / 3600000) * 10) / 10;
    }

    // SLA compliance
    const slaData = await this.prisma.ticket.findMany({
      where: {
        resolvedAt: { not: null },
        slaDeadline: { not: null },
        deletedAt: null,
      },
      select: { resolvedAt: true, slaDeadline: true },
      take: 10000,
    });
    const slaCompliance =
      slaData.length > 0
        ? Math.round(
            (slaData.filter(
              (t: any) => new Date(t.resolvedAt) <= new Date(t.slaDeadline),
            ).length /
              slaData.length) *
              100,
          )
        : 100;

    const categories = await this.prisma.ticketCategory.findMany();
    const categoryMap = Object.fromEntries(
      categories.map((c: any) => [c.id, c.name]),
    );

    return {
      total,
      byStatus: byStatus.map((s: any) => ({
        status: s.status,
        count: s._count,
      })),
      byPriority: byPriority.map((p: any) => ({
        priority: p.priority,
        count: p._count,
      })),
      byCategory: byCategory.map((c: any) => ({
        category: categoryMap[c.categoryId] || c.categoryId,
        count: c._count,
      })),
      avgResolutionHours: avgHours,
      slaCompliancePercent: slaCompliance,
      totalResolved: avgResolutionTime.length,
    };
  }

  async deleteTicket(id: string, userId?: string) {
    const ticket = await this.findOne(id);
    const now = new Date();
    await this.prisma.ticket.update({
      where: { id },
      data: {
        code: `${ticket.code}_DELETED_${now.getTime()}`,
        deletedAt: now,
        deletedById: userId || null,
        deletedBatchId: null,
      },
    });
    return { success: true };
  }

  async restoreTicket(id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Không tìm thấy ticket');
    if (!ticket.deletedAt) throw new Error('Ticket chưa bị xóa');

    const originalCode = ticket.code.replace(/_DELETED_\d+$/, '');

    return this.prisma.ticket.update({
      where: { id },
      data: {
        code: originalCode,
        deletedAt: null,
        deletedById: null,
        deletedBatchId: null,
      },
    });
  }

  async forceDeleteTicket(id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Không tìm thấy ticket');
    if (!ticket.deletedAt) throw new Error('Ticket chưa bị xóa mềm');

    return this.prisma.ticket.delete({ where: { id } });
  }

  // =====================
  // WORKFLOW ADMIN & HELPERS
  // =====================

  async getPendingApprovals(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user?.employee) return [];

    return (this.prisma as any).ticketApproval.findMany({
      where: {
        approverId: user.employee.id,
        status: 'PENDING',
      },
      include: {
        ticket: {
          include: {
            requester: { select: { fullName: true } },
            category: { select: { name: true } },
          },
        },
        step: true,
      },
    });
  }

  async getAdminWorkflows() {
    return (this.prisma as any).ticketWorkflowConfig.findMany({
      include: {
        steps: { orderBy: { order: 'asc' } },
        category: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAdminWorkflow(dto: any) {
    const { steps, ...configData } = dto;
    return (this.prisma as any).ticketWorkflowConfig.create({
      data: {
        ...configData,
        steps: {
          create: steps.map((s: any) => ({
            name: s.name,
            order: s.order,
            approverType: s.approverType,
            approverId: s.approverId,
          })),
        },
      },
    });
  }

  async deleteAdminWorkflow(id: string) {
    await (this.prisma as any).ticketWorkflowStep.deleteMany({
      where: { configId: id },
    });
    return (this.prisma as any).ticketWorkflowConfig.delete({ where: { id } });
  }

  async getDepartments() {
    return this.prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }
}
