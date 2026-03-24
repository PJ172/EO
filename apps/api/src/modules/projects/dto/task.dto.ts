import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  IsInt,
  IsArray,
} from 'class-validator';
import { TaskStatus, TaskPriority, DependencyType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectTaskDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'Parent Task ID for subtasks' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Duration in hours' })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiPropertyOptional({ description: 'Progress 0-100' })
  @IsOptional()
  @IsInt()
  progress?: number;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Array of Predecessor Task IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  predecessorIds?: string[];
}

export class UpdateProjectTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  progress?: number;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  position?: number;

  @ApiPropertyOptional({ description: 'Array of Predecessor Task IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  predecessorIds?: string[];
}

export class CreateDependencyDto {
  @ApiProperty()
  @IsUUID()
  predecessorId: string;

  @ApiProperty()
  @IsUUID()
  successorId: string;

  @ApiPropertyOptional({ enum: DependencyType })
  @IsOptional()
  @IsEnum(DependencyType)
  type?: DependencyType;
}
