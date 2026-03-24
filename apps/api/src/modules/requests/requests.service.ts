import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestStatus, ApprovalStatus } from '@prisma/client';

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateRequestDto) {
    // Generate Code: REQ-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.request.count({
      where: {
        code: { startsWith: `REQ-${dateStr}` },
      },
    });
    const sequence = (count + 1).toString().padStart(4, '0');
    const code = `REQ-${dateStr}-${sequence}`;

    return this.prisma.request.create({
      data: {
        code,
        title: dto.title,
        content: dto.content,
        type: dto.type,
        workflowId: dto.workflowId,
        formData: dto.formData || undefined,
        requestorId: userId,
        status: RequestStatus.DRAFT,
      },
      include: {
        approvals: { orderBy: { stepOrder: 'asc' } },
        workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.request.findMany({
      where: { requestorId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        approvals: { orderBy: { stepOrder: 'asc' } },
        workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        approvals: { orderBy: { stepOrder: 'asc' } },
        workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });
    if (!request) throw new NotFoundException('Không tìm thấy tờ trình');
    return request;
  }

  /**
   * Evaluate routing condition based on formData
   */
  private evaluateCondition(condition: any, formData: any): boolean {
    if (!condition) return true;
    try {
      const conditionStr =
        typeof condition === 'string' ? condition : JSON.stringify(condition);
      const keys = Object.keys(formData || {});
      const values = Object.values(formData || {});
      // Safe execution context
      const func = new Function(...keys, `return ${conditionStr}`);
      return !!func(...values);
    } catch (e) {
      console.log('Condition eval error:', e.message);
      return true; // Default to run step if error
    }
  }

  /**
   * Find the next valid step that matches the workflow condition
   */
  private getNextValidStep(steps: any[], currentOrder: number, formData: any) {
    const remainingSteps = steps
      .filter((s) => s.order > currentOrder)
      .sort((a, b) => a.order - b.order);
    for (const step of remainingSteps) {
      if (this.evaluateCondition(step.condition, formData)) {
        return step;
      }
    }
    return null;
  }

  /**
   * Create pending approvals for a workflow step (handles PARALLEL)
   */
  private async createStepApprovals(tx: any, requestId: string, step: any) {
    let targetApprovers = [step.approverUserId || 'pending'];
    if (step.type === 'PARALLEL' && step.approverRoleId) {
      // Get all users in the role
      const roleUsers = await tx.userRole.findMany({
        where: { roleId: step.approverRoleId },
      });
      if (roleUsers.length > 0) {
        targetApprovers = roleUsers.map((ru: any) => ru.userId);
      }
    }

    for (const approverId of targetApprovers) {
      await tx.requestApproval.create({
        data: {
          requestId,
          stepId: step.id,
          stepOrder: step.order,
          approverId,
          status: ApprovalStatus.PENDING,
        },
      });
    }
  }

  /**
   * Submit a draft request for approval
   * Creates first approval step based on workflow
   */
  async submit(id: string, userId: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });

    if (!request) throw new NotFoundException('Không tìm thấy tờ trình');
    if (request.requestorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền gửi duyệt tờ trình này');
    }
    if (request.status !== RequestStatus.DRAFT) {
      throw new BadRequestException(
        'Chỉ có thể gửi duyệt tờ trình ở trạng thái Nháp',
      );
    }

    // If workflow is assigned, create first step approval
    if (request.workflow && request.workflow.steps.length > 0) {
      const firstStep = this.getNextValidStep(
        request.workflow.steps,
        0,
        request.formData as any,
      );

      if (!firstStep) {
        // All steps skipped, auto-approve
        return this.prisma.request.update({
          where: { id },
          data: { status: RequestStatus.APPROVED },
          include: { approvals: true, workflow: true },
        });
      }

      return this.prisma.$transaction(async (tx) => {
        // Create approval for first step
        await this.createStepApprovals(tx, id, firstStep);

        // Update request status and currentStepOrder
        return tx.request.update({
          where: { id },
          data: {
            status: RequestStatus.IN_PROGRESS,
            currentStepOrder: firstStep.order,
          },
          include: {
            approvals: { orderBy: { stepOrder: 'asc' } },
            workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
          },
        });
      });
    }

    // No workflow — simple submit (admin will approve)
    return this.prisma.request.update({
      where: { id },
      data: { status: RequestStatus.SUBMITTED },
      include: {
        approvals: { orderBy: { stepOrder: 'asc' } },
        workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });
  }

  /**
   * Find requests pending approval for a user
   * Checks both role-based and user-based workflow steps
   */
  async findPendingApprovals(userId: string) {
    // Get user's roles
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
      },
    });
    if (!user) return [];

    const isAdmin = user.roles.some((ur) => ur.role.code === 'ADMIN');
    const userRoleIds = user.roles.map((ur) => ur.roleId);

    // Build where conditions
    const conditions: any[] = [];

    // 1. Requests where user is explicit approver for current step
    conditions.push({
      status: RequestStatus.IN_PROGRESS,
      workflow: {
        steps: {
          some: {
            approverUserId: userId,
          },
        },
      },
      approvals: {
        some: {
          approverId: userId,
          status: ApprovalStatus.PENDING,
        },
      },
    });

    // 2. Requests where user's role matches current step's approverRoleId
    if (userRoleIds.length > 0) {
      conditions.push({
        status: RequestStatus.IN_PROGRESS,
        workflow: {
          steps: {
            some: {
              approverRoleId: { in: userRoleIds },
            },
          },
        },
        approvals: {
          some: {
            status: ApprovalStatus.PENDING,
          },
        },
      });
    }

    // 3. Admin fallback: SUBMITTED requests without workflow
    if (isAdmin) {
      conditions.push({
        status: RequestStatus.SUBMITTED,
        workflowId: null,
      });
    }

    const requests = await this.prisma.request.findMany({
      where: { OR: conditions },
      orderBy: { createdAt: 'desc' },
      include: {
        approvals: { orderBy: { stepOrder: 'asc' } },
        workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });

    // Filter: only return requests where the current step matches this user
    return requests.filter((req) => {
      if (!req.workflow) return isAdmin; // No workflow → admin only

      const currentStep = req.workflow.steps.find(
        (s) => s.order === req.currentStepOrder,
      );
      if (!currentStep) return false;

      // Check user match
      if (currentStep.approverUserId === userId) return true;
      if (
        currentStep.approverRoleId &&
        userRoleIds.includes(currentStep.approverRoleId)
      )
        return true;

      return false;
    });
  }

  /**
   * Approve a request — multi-level workflow
   */
  async approve(id: string, userId: string, comment?: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        approvals: { orderBy: { stepOrder: 'asc' } },
        workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });

    if (!request) throw new NotFoundException('Không tìm thấy tờ trình');

    // ---- WORKFLOW-BASED APPROVAL ----
    if (request.workflow && request.status === RequestStatus.IN_PROGRESS) {
      const currentStep = request.workflow.steps.find(
        (s) => s.order === request.currentStepOrder,
      );
      if (!currentStep)
        throw new BadRequestException('Không tìm thấy bước duyệt hiện tại');

      // Verify user can approve this step
      await this.verifyApprover(userId, currentStep);

      return this.prisma.$transaction(async (tx) => {
        // Update existing PENDING approval for this step
        // If parallel, match exact userId. If sequential, take the first pending.
        const pendingApproval = await tx.requestApproval.findFirst({
          where: {
            requestId: id,
            stepOrder: currentStep.order,
            status: ApprovalStatus.PENDING,
            ...(currentStep.type === 'PARALLEL' ? { approverId: userId } : {}),
          },
        });

        if (pendingApproval) {
          await tx.requestApproval.update({
            where: { id: pendingApproval.id },
            data: {
              status: ApprovalStatus.APPROVED,
              approverId: userId,
              comment,
              reviewedAt: new Date(),
            },
          });
        } else {
          // Create new approval record
          await tx.requestApproval.create({
            data: {
              requestId: id,
              stepId: currentStep.id,
              stepOrder: currentStep.order,
              approverId: userId,
              status: ApprovalStatus.APPROVED,
              comment,
              reviewedAt: new Date(),
            },
          });
        }

        // Check if this is the final step
        if (currentStep.isFinal) {
          return tx.request.update({
            where: { id },
            data: { status: RequestStatus.APPROVED },
            include: {
              approvals: { orderBy: { stepOrder: 'asc' } },
              workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
            },
          });
        }

        // Check if PARALLEL step is fully approved
        if (currentStep.type === 'PARALLEL' && pendingApproval) {
          const remaining = await tx.requestApproval.count({
            where: {
              requestId: id,
              stepOrder: currentStep.order,
              status: ApprovalStatus.PENDING,
              id: { not: pendingApproval.id },
            },
          });
          if (remaining > 0) {
            // Still waiting for others in parallel step
            return tx.request.findUnique({
              where: { id },
              include: {
                approvals: { orderBy: { stepOrder: 'asc' } },
                workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
              },
            });
          }
        }

        // Move to next valid step based on conditions
        const nextStep = this.getNextValidStep(
          request.workflow!.steps,
          currentStep.order,
          request.formData as any,
        );
        if (!nextStep) {
          // No more steps → approve
          return tx.request.update({
            where: { id },
            data: { status: RequestStatus.APPROVED },
            include: {
              approvals: { orderBy: { stepOrder: 'asc' } },
              workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
            },
          });
        }

        // Create pending approval for next step
        await this.createStepApprovals(tx, id, nextStep);

        // Update currentStepOrder
        return tx.request.update({
          where: { id },
          data: { currentStepOrder: nextStep.order },
          include: {
            approvals: { orderBy: { stepOrder: 'asc' } },
            workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
          },
        });
      });
    }

    // ---- SIMPLE APPROVAL (no workflow) ----
    if (request.status !== RequestStatus.SUBMITTED) {
      throw new BadRequestException('Tờ trình không ở trạng thái chờ duyệt');
    }

    // Admin check for simple approval
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    const isAdmin = user?.roles.some((ur) => ur.role.code === 'ADMIN');
    if (!isAdmin)
      throw new ForbiddenException('Bạn không có quyền phê duyệt tờ trình này');

    await this.prisma.requestApproval.create({
      data: {
        requestId: id,
        stepOrder: 0,
        approverId: userId,
        status: ApprovalStatus.APPROVED,
        comment,
        reviewedAt: new Date(),
      },
    });

    return this.prisma.request.update({
      where: { id },
      data: { status: RequestStatus.APPROVED },
      include: {
        approvals: { orderBy: { stepOrder: 'asc' } },
        workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });
  }

  /**
   * Reject a request — rejection at any step ends the process
   */
  async reject(id: string, userId: string, comment?: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        approvals: { orderBy: { stepOrder: 'asc' } },
        workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });

    if (!request) throw new NotFoundException('Không tìm thấy tờ trình');

    // ---- WORKFLOW-BASED REJECTION ----
    if (request.workflow && request.status === RequestStatus.IN_PROGRESS) {
      const currentStep = request.workflow.steps.find(
        (s) => s.order === request.currentStepOrder,
      );
      if (!currentStep)
        throw new BadRequestException('Không tìm thấy bước duyệt hiện tại');

      await this.verifyApprover(userId, currentStep);

      return this.prisma.$transaction(async (tx) => {
        // Update pending approval
        const pendingApproval = await tx.requestApproval.findFirst({
          where: {
            requestId: id,
            stepOrder: currentStep.order,
            status: ApprovalStatus.PENDING,
            ...(currentStep.type === 'PARALLEL' ? { approverId: userId } : {}),
          },
        });

        if (pendingApproval) {
          await tx.requestApproval.update({
            where: { id: pendingApproval.id },
            data: {
              status: ApprovalStatus.REJECTED,
              approverId: userId,
              comment,
              reviewedAt: new Date(),
            },
          });
        } else {
          await tx.requestApproval.create({
            data: {
              requestId: id,
              stepId: currentStep.id,
              stepOrder: currentStep.order,
              approverId: userId,
              status: ApprovalStatus.REJECTED,
              comment,
              reviewedAt: new Date(),
            },
          });
        }

        // Reject at any step → whole request rejected
        return tx.request.update({
          where: { id },
          data: { status: RequestStatus.REJECTED },
          include: {
            approvals: { orderBy: { stepOrder: 'asc' } },
            workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
          },
        });
      });
    }

    // ---- SIMPLE REJECTION ----
    if (request.status !== RequestStatus.SUBMITTED) {
      throw new BadRequestException('Tờ trình không ở trạng thái chờ duyệt');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    const isAdmin = user?.roles.some((ur) => ur.role.code === 'ADMIN');
    if (!isAdmin)
      throw new ForbiddenException('Bạn không có quyền từ chối tờ trình này');

    await this.prisma.requestApproval.create({
      data: {
        requestId: id,
        stepOrder: 0,
        approverId: userId,
        status: ApprovalStatus.REJECTED,
        comment,
        reviewedAt: new Date(),
      },
    });

    return this.prisma.request.update({
      where: { id },
      data: { status: RequestStatus.REJECTED },
      include: {
        approvals: { orderBy: { stepOrder: 'asc' } },
        workflow: { include: { steps: { orderBy: { order: 'asc' } } } },
      },
    });
  }

  /**
   * Verify if a user can approve a workflow step
   */
  private async verifyApprover(userId: string, step: any) {
    // Direct user match
    if (step.approverUserId === userId) return;

    // Role-based match
    if (step.approverRoleId) {
      const hasRole = await this.prisma.userRole.findFirst({
        where: {
          userId,
          roleId: step.approverRoleId,
        },
      });
      if (hasRole) return;
    }

    // Admin fallback
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (user?.roles.some((ur) => ur.role.code === 'ADMIN')) return;

    throw new ForbiddenException('Bạn không có quyền duyệt bước này');
  }
}
