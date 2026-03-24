import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum EmploymentEventTypeEnum {
  PROBATION = 'PROBATION',
  OFFICIAL = 'OFFICIAL',
  RESIGNED = 'RESIGNED',
  MATERNITY_LEAVE = 'MATERNITY_LEAVE',
  RETURN_TO_WORK = 'RETURN_TO_WORK',
  SUSPENDED = 'SUSPENDED',
}

export class CreateEmploymentEventDto {
  @ApiProperty({ enum: EmploymentEventTypeEnum })
  @IsEnum(EmploymentEventTypeEnum)
  @IsNotEmpty()
  eventType: EmploymentEventTypeEnum;

  @ApiProperty({ description: 'Ngày hiệu lực (yyyy-MM-dd)' })
  @IsDateString()
  @IsNotEmpty()
  effectiveDate: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc / ngày dự kiến đi làm lại',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Số quyết định' })
  @IsString()
  @IsOptional()
  decisionNumber?: string;

  @ApiPropertyOptional({ description: 'Lý do' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateEmploymentEventDto extends PartialType(
  CreateEmploymentEventDto,
) {}
