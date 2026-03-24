import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  CreateTaskCommentDto,
} from './dto/task.dto';
import { TaskStatus, TaskPriority } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  // =====================
  // TASKS
  // =====================

  async findMyTasks(userId: string, isDeleted: boolean = false) {
    return this.prisma.task.findMany({
      where: {
        deletedAt: isDeleted ? { not: null } : null,
        OR: [{ assignorId: userId }, { assigneeId: userId }],
      },
      include: {
        comments: { take: 3, orderBy: { createdAt: 'desc' } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
    });
  }

  async findAssignedToMe(userId: string) {
    return this.prisma.task.findMany({
      where: { assigneeId: userId, deletedAt: null },
      include: {
        _count: { select: { comments: true } },
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }],
    });
  }

  async findAssignedByMe(userId: string) {
    return this.prisma.task.findMany({
      where: { assignorId: userId, deletedAt: null },
      include: {
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!task) throw new NotFoundException('Không tìm thấy task');
    return task;
  }

  async create(assignorId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        assignorId,
        assigneeId: dto.assigneeId,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        priority: dto.priority || TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
      },
      include: { _count: { select: { comments: true } } },
    });
  }

  async update(id: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.findOne(id);

    // Only assignor or assignee can update
    if (task.assignorId !== userId && task.assigneeId !== userId) {
      throw new ForbiddenException('Bạn không có quyền sửa task này');
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        status: dto.status,
        priority: dto.priority,
      },
      include: { comments: true },
    });
  }

  async updateStatus(id: string, userId: string, status: TaskStatus) {
    const task = await this.findOne(id);

    if (task.assignorId !== userId && task.assigneeId !== userId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật task này');
    }

    return this.prisma.task.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string, userId: string) {
    const task = await this.findOne(id);

    // Only assignor can delete
    if (task.assignorId !== userId) {
      throw new ForbiddenException('Chỉ người tạo mới có quyền xóa task');
    }

    // Soft delete instead of hard delete
    await this.prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
    return { success: true };
  }

  // =====================
  // COMMENTS
  // =====================

  async addComment(taskId: string, userId: string, dto: CreateTaskCommentDto) {
    const task = await this.findOne(taskId);

    // Must be involved in task to comment
    if (task.assignorId !== userId && task.assigneeId !== userId) {
      throw new ForbiddenException('Bạn không có quyền bình luận task này');
    }

    return this.prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content: dto.content,
      },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.taskComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) throw new NotFoundException('Không tìm thấy bình luận');
    if (comment.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa bình luận này');
    }

    await this.prisma.taskComment.delete({ where: { id: commentId } });
    return { success: true };
  }

  // =====================
  // STATISTICS
  // =====================

  async getMyStats(userId: string) {
    const tasks = await this.prisma.task.findMany({
      where: {
        OR: [{ assignorId: userId }, { assigneeId: userId }],
      },
    });

    return {
      total: tasks.length,
      todo: tasks.filter((t: any) => t.status === TaskStatus.TODO).length,
      inProgress: tasks.filter((t: any) => t.status === TaskStatus.IN_PROGRESS)
        .length,
      review: tasks.filter((t: any) => t.status === TaskStatus.REVIEW).length,
      done: tasks.filter((t: any) => t.status === TaskStatus.DONE).length,
      overdue: tasks.filter(
        (t: any) =>
          t.deadline &&
          t.deadline < new Date() &&
          t.status !== TaskStatus.DONE &&
          t.status !== TaskStatus.CANCELLED,
      ).length,
    };
  }

  async restore(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Không tìm thấy task');
    if (!task.deletedAt) throw new Error('Task chưa bị xóa');

    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: null, deletedById: null },
    });
  }

  async forceDelete(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Không tìm thấy task');
    if (!task.deletedAt) throw new Error('Task chưa bị xóa mềm');

    return this.prisma.task.delete({ where: { id } });
  }
}
