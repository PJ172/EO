import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Định nghĩa các hằng số trạng thái để tránh xung đột với Prisma Enum chưa cập nhật
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

const TicketApproverType = {
  SPECIFIC_USER: 'SPECIFIC_USER' as any,
  DIRECT_MANAGER: 'DIRECT_MANAGER' as any,
  DEPT_MANAGER: 'DEPT_MANAGER' as any,
  ROLE: 'ROLE' as any,
  IT_STAFF: 'IT_STAFF' as any,
};

@Injectable()
export class TicketWorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Khớp cấu hình workflow phù hợp cho ticket dựa trên danh mục và phòng ban
   */
  async findMatchingConfig(categoryId: string, employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });

    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    // Tìm cấu hình khớp nhất
    const configs = await (this.prisma as any).ticketWorkflowConfig.findMany({
      where: {
        isActive: true,
        OR: [
          { categoryId, departmentId: (employee as any).departmentId },
          { categoryId, departmentId: null },
          { categoryId: null, departmentId: (employee as any).departmentId },
          { categoryId: null, departmentId: null },
        ],
      },
      orderBy: [{ departmentId: 'desc' }, { categoryId: 'desc' }],
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    return configs[0] || null;
  }

  /**
   * Giải quyết người duyệt thực tế cho một bước cấu hình
   */
  async resolveApprover(step: any, requesterId: string): Promise<string[]> {
    const requester = await this.prisma.employee.findUnique({
      where: { id: requesterId },
      include: { department: true },
    });

    if (!requester) return [];

    let approverIds: string[] = [];

    switch (step.approverType) {
      case TicketApproverType.SPECIFIC_USER:
        if (step.approverId) approverIds = [step.approverId];
        break;

      case TicketApproverType.DIRECT_MANAGER:
        if ((requester as any).managerEmployeeId) {
          approverIds = [(requester as any).managerEmployeeId];
        }
        break;

      case TicketApproverType.DEPT_MANAGER:
        if ((requester as any).department?.managerEmployeeId) {
          approverIds = [(requester as any).department.managerEmployeeId];
        }
        break;

      case TicketApproverType.ROLE:
        const employeesWithRole = await this.prisma.employee.findMany({
          where: {
            user: {
              roles: {
                some: { roleId: step.approverId },
              },
            },
            deletedAt: null,
          } as any,
          select: { id: true },
        });
        approverIds = employeesWithRole.map((e: any) => e.id);
        break;

      case TicketApproverType.IT_STAFF:
        const itStaff = await this.prisma.employee.findMany({
          where: {
            user: {
              roles: {
                some: { role: { code: 'IT_SUPPORT' } },
              },
            },
            deletedAt: null,
          } as any,
          select: { id: true },
        });
        approverIds = itStaff.map((e: any) => e.id);
        break;
    }

    const finalApprovers = new Set<string>();
    for (const id of approverIds) {
      finalApprovers.add(id);

      const delegations = await (this.prisma as any).ticketDelegation.findMany({
        where: {
          fromEmployeeId: id,
          isActive: true,
          startDate: { lte: new Date() },
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
        select: { toEmployeeId: true },
      });

      delegations.forEach((d: any) => finalApprovers.add(d.toEmployeeId));
    }

    return Array.from(finalApprovers);
  }

  /**
   * Chuyển ticket sang bước phê duyệt tiếp theo
   */
  async moveToNextStep(ticketId: string, actorId: string): Promise<void> {
    const ticket = await (this.prisma.ticket as any).findUnique({
      where: { id: ticketId },
      include: {
        workflowConfig: { include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });

    if (!ticket || !ticket.workflowConfig) return;

    const nextStepOrder = ticket.currentStepOrder + 1;
    const nextStep = ticket.workflowConfig.steps.find(
      (s: any) => s.order === nextStepOrder,
    );

    if (!nextStep) {
      await (this.prisma.ticket as any).update({
        where: { id: ticketId },
        data: {
          isApproved: true,
          status: TicketStatus.IT_PENDING,
        },
      });
      return;
    }

    const approvers = await this.resolveApprover(nextStep, ticket.requesterId);

    if (approvers.length === 0) {
      return this.moveToNextStep(ticketId, actorId);
    }

    await (this.prisma as any).$transaction([
      ...approvers.map((approverId) =>
        (this.prisma as any).ticketApproval.create({
          data: {
            ticketId,
            stepId: nextStep.id,
            approverId,
            status: ApprovalStatus.PENDING,
          },
        }),
      ),
      (this.prisma as any).ticket.update({
        where: { id: ticketId },
        data: {
          currentStepOrder: nextStepOrder,
          status: TicketStatus.DEPT_PENDING,
        },
      }),
      (this.prisma as any).ticketHistory.create({
        data: {
          ticketId,
          actorId,
          action: 'MOVED_TO_STEP',
          newStatus: TicketStatus.DEPT_PENDING,
          comment: `Chuyển đến bước: ${nextStep.name}`,
        },
      }),
    ]);
  }
}
