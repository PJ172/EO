import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({
    example: 'Hoàn thành báo cáo Q1',
    description: 'Tiêu đề nhiệm vụ',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tiêu đề' })
  title: string;

  @ApiProperty({ example: 'Chi tiết công việc...', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'ID người được giao', required: false })
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiProperty({ example: '2026-02-15T17:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiProperty({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;
}

export class UpdateTaskDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiProperty({ enum: TaskStatus, required: false })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ enum: TaskPriority, required: false })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;
}

export class CreateTaskCommentDto {
  @ApiProperty({
    example: 'Đã hoàn thành phần 1',
    description: 'Nội dung bình luận',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập nội dung' })
  content: string;
}
