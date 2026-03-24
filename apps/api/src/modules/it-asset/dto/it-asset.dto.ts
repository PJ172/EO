import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssetCategoryDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string;
}

export class CreateITAssetDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() categoryId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() warrantyEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() specifications?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
}

export class UpdateITAssetDto extends CreateITAssetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() condition?: string;
}

export class AssignAssetDto {
  @ApiProperty() @IsString() employeeId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class ReturnAssetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() condition?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class CreateMaintenanceDto {
  @ApiProperty() @IsString() assetId: string;
  @ApiProperty() @IsString() type: string;
  @ApiProperty() @IsDateString() scheduledDate: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() vendor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
