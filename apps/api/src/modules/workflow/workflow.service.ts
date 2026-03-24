import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, WorkflowStepType } from '@prisma/client';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';

@Injectable()
export class WorkflowService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkflowDto) {
    // Check unique code
    const existing = await this.prisma.workflow.findUnique({
      where: { code: dto.code },
    });
    if (existing)
      throw new ConflictException(`Mã quy trình "${dto.code}" đã tồn tại`);

    // Auto-set isFinal on last step
    const steps = dto.steps.sort((a, b) => a.order - b.order);
    if (steps.length > 0) {
      steps[steps.length - 1].isFinal = true;
    }

    return this.prisma.workflow.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        formSchema: dto.formSchema || [],
        steps: {
          create: steps.map((s) => ({
            order: s.order,
            name: s.name,
            type: (s.type as WorkflowStepType) || 'SEQUENTIAL',
            condition: s.condition || null,
            approverRoleId: s.approverRoleId,
            approverUserId: s.approverUserId,
            isFinal: s.isFinal || false,
          })),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll() {
    return this.prisma.workflow.findMany({
      where: { isActive: true },
      include: {
        steps: { orderBy: { order: 'asc' } },
        _count: { select: { requests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { order: 'asc' } },
        _count: { select: { requests: true } },
      },
    });
    if (!workflow) throw new NotFoundException('Không tìm thấy quy trình');
    return workflow;
  }

  async update(id: string, dto: UpdateWorkflowDto) {
    const workflow = await this.prisma.workflow.findUnique({ where: { id } });
    if (!workflow) throw new NotFoundException('Không tìm thấy quy trình');

    // If steps are provided, replace all steps
    if (dto.steps) {
      const steps = dto.steps.sort((a, b) => a.order - b.order);
      if (steps.length > 0) {
        steps[steps.length - 1].isFinal = true;
      }

      return this.prisma.$transaction(async (tx) => {
        // Delete old steps
        await tx.workflowStep.deleteMany({ where: { workflowId: id } });

        // Update workflow + create new steps
        return tx.workflow.update({
          where: { id },
          data: {
            name: dto.name ?? workflow.name,
            description: dto.description ?? workflow.description,
            isActive: dto.isActive ?? workflow.isActive,
            formSchema:
              dto.formSchema !== undefined
                ? dto.formSchema
                : workflow.formSchema,
            steps: {
              create: steps.map((s) => ({
                order: s.order,
                name: s.name,
                type: (s.type as WorkflowStepType) || 'SEQUENTIAL',
                condition: s.condition || null,
                approverRoleId: s.approverRoleId,
                approverUserId: s.approverUserId,
                isFinal: s.isFinal || false,
              })),
            },
          },
          include: { steps: { orderBy: { order: 'asc' } } },
        });
      });
    }

    return this.prisma.workflow.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
        formSchema: dto.formSchema !== undefined ? dto.formSchema : undefined,
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async delete(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
    });
    if (!workflow) throw new NotFoundException('Không tìm thấy quy trình');

    // Always soft-delete (deactivate) instead of hard delete
    return this.prisma.workflow.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get available roles for approver selection
   */
  async getAvailableRoles() {
    return this.prisma.role.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }
}
