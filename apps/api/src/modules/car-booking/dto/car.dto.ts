import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CarStatus } from '@prisma/client';

export class CreateCarDto {
  @ApiProperty({ example: 'Toyota Fortuner', description: 'Tên xe' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên xe' })
  name: string;

  @ApiProperty({ example: '51A-12345', description: 'Biển số xe' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập biển số xe' })
  licensePlate: string;

  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Tên tài xế',
    required: false,
  })
  @IsString()
  @IsOptional()
  driverName?: string;

  @ApiProperty({ example: 7, description: 'Số ghế' })
  @IsInt()
  @Min(1)
  seatCount: number;

  @ApiProperty({ enum: CarStatus, required: false })
  @IsEnum(CarStatus)
  @IsOptional()
  status?: CarStatus;
}

export class UpdateCarDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  driverName?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  seatCount?: number;

  @ApiProperty({ enum: CarStatus, required: false })
  @IsEnum(CarStatus)
  @IsOptional()
  status?: CarStatus;
}
