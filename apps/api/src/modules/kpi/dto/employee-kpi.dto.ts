import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class KPIItemDto {
  @ApiProperty({ example: 'Hoàn thành dự án', description: 'Tên chỉ tiêu' })
  @IsString({ message: 'Tên chỉ tiêu phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên chỉ tiêu là bắt buộc' })
  @MaxLength(200, { message: 'Tên chỉ tiêu tối đa 200 ký tự' })
  name: string;

  @ApiProperty({ example: '100%', description: 'Mục tiêu', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Mục tiêu tối đa 100 ký tự' })
  target?: string;

  @ApiProperty({
    example: '95%',
    description: 'Thực tế đạt được',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Thực tế tối đa 100 ký tự' })
  actual?: string;

  @ApiProperty({ example: 30, description: 'Trọng số (%)' })
  @IsInt({ message: 'Trọng số phải là số nguyên' })
  @Min(0, { message: 'Trọng số tối thiểu là 0' })
  @Max(100, { message: 'Trọng số tối đa là 100' })
  weight: number;

  @ApiProperty({ example: 90, description: 'Điểm số', required: false })
  @IsInt({ message: 'Điểm số phải là số nguyên' })
  @Min(0, { message: 'Điểm số tối thiểu là 0' })
  @Max(100, { message: 'Điểm số tối đa là 100' })
  @IsOptional()
  score?: number;

  @ApiProperty({ example: 'Hoàn thành tốt', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Nhận xét tối đa 500 ký tự' })
  comment?: string;
}

export class CreateEmployeeKPIDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn nhân viên' })
  employeeId: string;

  @ApiProperty({ description: 'KPI Period ID' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn kỳ đánh giá' })
  periodId: string;

  @ApiProperty({ type: [KPIItemDto], description: 'Danh sách chỉ tiêu KPI' })
  @IsArray({ message: 'Danh sách KPI phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => KPIItemDto)
  items: KPIItemDto[];
}

export class UpdateEmployeeKPIDto {
  @ApiProperty({ type: [KPIItemDto], required: false })
  @IsArray({ message: 'Danh sách KPI phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => KPIItemDto)
  @IsOptional()
  items?: KPIItemDto[];
}

export class SubmitKPIDto {
  @ApiProperty({
    description: 'Người đánh giá (evaluator ID)',
    required: false,
  })
  @IsString()
  @IsOptional()
  evaluatorId?: string;
}
