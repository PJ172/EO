import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  sectionId?: string;

  @IsString()
  @IsOptional()
  parentPositionId?: string;
}

export class UpdatePositionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  sectionId?: string;

  @IsString()
  @IsOptional()
  parentPositionId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  uiPositionX?: number;

  @IsOptional()
  uiPositionY?: number;
}

export class AssignEmployeeDto {
  @IsString()
  employeeId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsString()
  @IsOptional()
  note?: string;
}
