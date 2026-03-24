import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkflowStepDto {
  @ApiProperty({ example: 1, description: 'Thứ tự bước duyệt' })
  @IsNumber()
  order: number;

  @ApiProperty({ example: 'Trưởng phòng duyệt', description: 'Tên bước' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, description: 'Role ID người duyệt' })
  @IsString()
  @IsOptional()
  approverRoleId?: string;

  @ApiProperty({ required: false, description: 'User ID người duyệt cụ thể' })
  @IsString()
  @IsOptional()
  approverUserId?: string;

  @ApiProperty({
    required: false,
    default: false,
    description: 'Bước duyệt cuối?',
  })
  @IsBoolean()
  @IsOptional()
  isFinal?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  condition?: any;
}

export class CreateWorkflowDto {
  @ApiProperty({
    example: 'Quy trình đề xuất mua sắm',
    description: 'Tên quy trình',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'WF-PURCHASE', description: 'Mã quy trình (unique)' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ required: false, description: 'Mô tả quy trình' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, description: 'Định nghĩa JSON form động' })
  @IsOptional()
  formSchema?: any;

  @ApiProperty({ type: [CreateWorkflowStepDto], description: 'Các bước duyệt' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowStepDto)
  steps: CreateWorkflowStepDto[];
}

export class UpdateWorkflowDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  formSchema?: any;

  @ApiProperty({ required: false, type: [CreateWorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowStepDto)
  @IsOptional()
  steps?: CreateWorkflowStepDto[];
}
