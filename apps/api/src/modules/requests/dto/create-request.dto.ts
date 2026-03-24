import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RequestType } from '@prisma/client';

export class CreateRequestDto {
  @ApiProperty({
    example: 'Đề xuất mua máy tính mới',
    description: 'Request title',
  })
  @IsString({ message: 'Tiêu đề phải là chuỗi' })
  @IsNotEmpty({ message: 'Tiêu đề là bắt buộc' })
  @MaxLength(200, { message: 'Tiêu đề tối đa 200 ký tự' })
  title: string;

  @ApiProperty({
    example: '<p>Chi tiết cấu hình...</p>',
    description: 'Request content (HTML)',
  })
  @IsString({ message: 'Nội dung phải là chuỗi' })
  @IsNotEmpty({ message: 'Nội dung là bắt buộc' })
  content: string;

  @ApiProperty({ enum: RequestType, description: 'Type of request' })
  @IsEnum(RequestType, { message: 'Loại yêu cầu không hợp lệ' })
  type: RequestType;

  @ApiProperty({ required: false, description: 'Workflow ID if applicable' })
  @IsString()
  @IsOptional()
  workflowId?: string;

  @ApiProperty({ required: false, description: 'Dynamic form data JSON' })
  @IsOptional()
  formData?: any;
}
