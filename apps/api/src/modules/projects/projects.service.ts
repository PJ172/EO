import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import {
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
  CreateDependencyDto,
} from './dto/task.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  // PROJECTS
  async create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...dto,
      },
    });
  }

  async findAll(isDeleted = false) {
    return this.prisma.project.findMany({
      where: { deletedAt: isDeleted ? { not: null } : null },
      include: {
        manager: {
          select: { id: true, fullName: true, avatar: true },
        },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        manager: true,
        members: {
          include: {
            employee: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
                jobTitle: true,
              },
            },
          },
        },
        tasks: {
          include: {
            predecessors: true,
            assignee: {
              select: { id: true, fullName: true, avatar: true },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId?: string) {
    const project = await this.findOne(id);
    const { v4: uuidv4 } = await import('uuid');
    const batchId = uuidv4();
    const now = new Date();

    // Cascade soft-delete all tasks in the project
    await this.prisma.projectTask.updateMany({
      where: { projectId: id, deletedAt: null },
      data: {
        deletedAt: now,
        deletedById: userId || null,
        deletedBatchId: batchId,
      },
    });

    // Soft-delete the project
    await this.prisma.project.update({
      where: { id },
      data: {
        code: `${project.code}_DELETED_${now.getTime()}`,
        deletedAt: now,
        deletedById: userId || null,
        deletedBatchId: batchId,
      },
    });

    return { success: true, batchId };
  }

  // TASKS
  async createTask(dto: CreateProjectTaskDto) {
    const { predecessorIds, ...taskData } = dto;

    const task = await this.prisma.projectTask.create({
      data: {
        ...taskData,
        // If predecessors are provided, create links
        predecessors:
          predecessorIds && predecessorIds.length > 0
            ? {
                create: predecessorIds.map((predId) => ({
                  predecessorId: predId,
                  type: 'FINISH_TO_START', // Default
                })),
              }
            : undefined,
      },
      include: {
        predecessors: true,
      },
    });

    return task;
  }

  async updateTask(id: string, dto: UpdateProjectTaskDto) {
    const { predecessorIds, ...taskData } = dto;

    if (predecessorIds) {
      return this.prisma.projectTask.update({
        where: { id },
        data: {
          ...taskData,
          predecessors: {
            deleteMany: {},
            create: predecessorIds.map((predId) => ({
              predecessorId: predId,
              type: 'FINISH_TO_START',
            })),
          },
        },
        include: {
          predecessors: true,
          assignee: {
            select: { id: true, fullName: true, avatar: true },
          },
        },
      });
    }

    return this.prisma.projectTask.update({
      where: { id },
      data: taskData,
      include: {
        predecessors: true,
        assignee: {
          select: { id: true, fullName: true, avatar: true },
        },
      },
    });
  }

  async removeTask(id: string, userId?: string) {
    const now = new Date();
    await this.prisma.projectTask.update({
      where: { id },
      data: {
        deletedAt: now,
        deletedById: userId || null,
        deletedBatchId: null,
      },
    });
    return { success: true };
  }

  // DEPENDENCIES
  async createDependency(dto: CreateDependencyDto) {
    // Prevent cycles? Simple check: if successor is predecessor's parent or something.
    // For now, let's just create.
    return this.prisma.taskDependency.create({
      data: {
        predecessorId: dto.predecessorId,
        successorId: dto.successorId,
        type: dto.type || 'FINISH_TO_START',
      },
    });
  }

  async removeDependency(id: string) {
    return this.prisma.taskDependency.delete({ where: { id } });
  }

  async restore(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (!project.deletedAt) throw new Error('Project is not deleted');

    const originalCode = project.code.replace(/_DELETED_\d+$/, '');

    // Restore project tasks
    await this.prisma.projectTask.updateMany({
      where: { projectId: id, deletedAt: { not: null } },
      data: { deletedAt: null, deletedById: null, deletedBatchId: null },
    });

    return this.prisma.project.update({
      where: { id },
      data: {
        code: originalCode,
        deletedAt: null,
        deletedById: null,
        deletedBatchId: null,
      },
    });
  }

  async forceDelete(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (!project.deletedAt)
      throw new Error('Project is not deleted. Soft-delete first.');

    return this.prisma.project.delete({ where: { id } });
  }
}
