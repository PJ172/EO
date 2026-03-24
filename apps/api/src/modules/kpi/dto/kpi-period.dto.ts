import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateKPIPeriodDto {
  @ApiProperty({ example: 'Q1 2026', description: 'Tên kỳ đánh giá' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên kỳ đánh giá' })
  name: string;

  @ApiProperty({ example: '2026-01-01', description: 'Ngày bắt đầu' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-03-31', description: 'Ngày kết thúc' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateKPIPeriodDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
