import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  CreateTaskCommentDto,
} from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // =====================
  // TASKS
  // =====================

  @Get()
  @Permissions('TASK_READ')
  @ApiOperation({ summary: 'Lấy tất cả task liên quan đến tôi' })
  async findMyTasks(
    @Request() req: any,
    @Query('isDeleted') isDeleted?: string,
  ) {
    return this.tasksService.findMyTasks(req.user.id, isDeleted === 'true');
  }

  @Get('assigned-to-me')
  @Permissions('TASK_READ')
  @ApiOperation({ summary: 'Lấy task được giao cho tôi' })
  async findAssignedToMe(@Request() req: any) {
    return this.tasksService.findAssignedToMe(req.user.id);
  }

  @Get('assigned-by-me')
  @Permissions('TASK_READ')
  @ApiOperation({ summary: 'Lấy task tôi giao cho người khác' })
  async findAssignedByMe(@Request() req: any) {
    return this.tasksService.findAssignedByMe(req.user.id);
  }

  @Get('stats')
  @Permissions('TASK_READ')
  @ApiOperation({ summary: 'Thống kê task của tôi' })
  async getStats(@Request() req: any) {
    return this.tasksService.getMyStats(req.user.id);
  }

  @Get(':id')
  @Permissions('TASK_READ')
  @ApiOperation({ summary: 'Xem chi tiết task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @Permissions('TASK_CREATE')
  @ApiOperation({ summary: 'Tạo task mới' })
  async create(@Request() req: any, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(req.user.id, dto);
  }

  @Put(':id')
  @Permissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Cập nhật task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, req.user.id, dto);
  }

  @Post(':id/status/:status')
  @Permissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Cập nhật trạng thái task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiParam({ name: 'status', enum: TaskStatus })
  async updateStatus(
    @Param('id') id: string,
    @Param('status') status: TaskStatus,
    @Request() req: any,
  ) {
    return this.tasksService.updateStatus(id, req.user.id, status);
  }

  @Delete(':id')
  @Permissions('TASK_DELETE')
  @ApiOperation({ summary: 'Xóa task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.delete(id, req.user.id);
  }

  // =====================
  // COMMENTS
  // =====================

  @Post(':id/comments')
  @Permissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Thêm bình luận' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  async addComment(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: CreateTaskCommentDto,
  ) {
    return this.tasksService.addComment(id, req.user.id, dto);
  }

  @Delete('comments/:commentId')
  @Permissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Xóa bình luận' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @Request() req: any,
  ) {
    return this.tasksService.deleteComment(commentId, req.user.id);
  }

  @Post(':id/restore')
  @Permissions('TASK_DELETE')
  @ApiOperation({ summary: 'Khôi phục task đã xóa' })
  async restore(@Param('id') id: string) {
    return this.tasksService.restore(id);
  }

  @Delete(':id/force')
  @Permissions('TASK_DELETE')
  @ApiOperation({ summary: 'Xóa vĩnh viễn task' })
  async forceDelete(@Param('id') id: string) {
    return this.tasksService.forceDelete(id);
  }
}
