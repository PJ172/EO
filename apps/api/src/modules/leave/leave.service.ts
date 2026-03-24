import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLeaveDto, ApproveLeaveDto } from './dto/leave.dto';

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(params: { status?: string; employeeId?: string }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.employeeId) where.employeeId = params.employeeId;

    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        leaveType: true,
        approvals: {
          include: {
            approver: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true,
            manager: { select: { id: true, fullName: true } },
          },
        },
        leaveType: true,
        approvals: {
          include: {
            approver: { select: { id: true, fullName: true } },
          },
          orderBy: { stepNo: 'asc' },
        },
      },
    });

    if (!leave) throw new NotFoundException('Leave request not found');
    return leave;
  }

  async getMyLeaves(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user?.employee) return [];

    return this.prisma.leaveRequest.findMany({
      where: { employeeId: user.employee.id },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingForApprover(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user?.employee) return [];

    return this.prisma.leaveRequest.findMany({
      where: {
        status: 'SUBMITTED',
        employee: {
          managerEmployeeId: user.employee.id,
        },
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        leaveType: true,
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user?.employee) return null;

    const year = new Date().getFullYear();
    return this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_year: {
          employeeId: user.employee.id,
          year,
        },
      },
    });
  }

  async create(userId: string, dto: CreateLeaveDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user?.employee) {
      throw new BadRequestException('Employee not found');
    }

    return this.prisma.leaveRequest.create({
      data: {
        employeeId: user.employee.id,
        leaveTypeId: dto.leaveTypeId,
        startDatetime: new Date(dto.startDatetime),
        endDatetime: new Date(dto.endDatetime),
        reason: dto.reason,
        status: 'DRAFT',
      },
      include: { leaveType: true },
    });
  }

  async submit(id: string, userId: string) {
    const leave = await this.findOne(id);

    // Verify ownership
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (leave.employeeId !== user?.employee?.id) {
      throw new BadRequestException('Cannot submit other employee leave');
    }

    if (leave.status !== 'DRAFT') {
      throw new BadRequestException('Can only submit draft requests');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Notify manager
    if (leave.employee.manager) {
      const managerUser = await this.prisma.user.findFirst({
        where: { employee: { id: leave.employee.managerEmployeeId! } },
      });

      if (managerUser) {
        this.notifications.notifyLeaveSubmitted(
          managerUser.id,
          leave.employee.fullName,
          leave.id,
        );
      }
    }

    return updated;
  }

  async approve(id: string, userId: string, dto: ApproveLeaveDto) {
    const leave = await this.findOne(id);

    if (leave.status !== 'SUBMITTED') {
      throw new BadRequestException('Can only approve submitted requests');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    // Create approval record
    await this.prisma.leaveApproval.create({
      data: {
        leaveRequestId: id,
        stepNo: 1,
        approverEmployeeId: user!.employee!.id,
        decision: 'APPROVED',
        comment: dto.comment,
        decidedAt: new Date(),
      },
    });

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    // Notify employee
    const employeeUser = await this.prisma.user.findFirst({
      where: { employee: { id: leave.employeeId } },
    });

    if (employeeUser) {
      this.notifications.notifyLeaveApproved(employeeUser.id, leave.id);
    }

    return updated;
  }

  async reject(id: string, userId: string, dto: ApproveLeaveDto) {
    const leave = await this.findOne(id);

    if (leave.status !== 'SUBMITTED') {
      throw new BadRequestException('Can only reject submitted requests');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    await this.prisma.leaveApproval.create({
      data: {
        leaveRequestId: id,
        stepNo: 1,
        approverEmployeeId: user!.employee!.id,
        decision: 'REJECTED',
        comment: dto.comment,
        decidedAt: new Date(),
      },
    });

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    const employeeUser = await this.prisma.user.findFirst({
      where: { employee: { id: leave.employeeId } },
    });

    if (employeeUser) {
      this.notifications.notifyLeaveRejected(
        employeeUser.id,
        leave.id,
        dto.comment,
      );
    }

    return updated;
  }

  async cancel(id: string, userId: string) {
    const leave = await this.findOne(id);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (leave.employeeId !== user?.employee?.id) {
      throw new BadRequestException('Cannot cancel other employee leave');
    }

    if (!['DRAFT', 'SUBMITTED'].includes(leave.status)) {
      throw new BadRequestException('Cannot cancel approved/rejected requests');
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
