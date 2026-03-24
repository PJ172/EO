import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeaveDto {
  @ApiProperty()
  @IsString()
  leaveTypeId: string;

  @ApiProperty({ example: '2026-01-25T08:00:00Z' })
  @IsDateString()
  startDatetime: string;

  @ApiProperty({ example: '2026-01-26T17:00:00Z' })
  @IsDateString()
  endDatetime: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApproveLeaveDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
