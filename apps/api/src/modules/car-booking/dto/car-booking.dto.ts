import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

export class CreateCarBookingDto {
  @ApiProperty({ description: 'ID của xe' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn xe' })
  carId: string;

  @ApiProperty({ example: 'Công ty ABC, Quận 1', description: 'Địa điểm đến' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập địa điểm' })
  destination: string;

  @ApiProperty({
    example: 'Họp với khách hàng',
    description: 'Mục đích',
    required: false,
  })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiProperty({
    example: '2026-02-03T08:00:00Z',
    description: 'Thời gian bắt đầu',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    example: '2026-02-03T12:00:00Z',
    description: 'Thời gian kết thúc',
  })
  @IsDateString()
  endTime: string;
}

export class UpdateCarBookingDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  destination?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({ enum: BookingStatus, required: false })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}
