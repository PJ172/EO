import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSoftwareDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vendor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() version?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxInstalls?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class UpdateSoftwareDto extends CreateSoftwareDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class InstallSoftwareDto {
  @ApiProperty() @IsString() softwareId: string;
  @ApiProperty() @IsString() assetId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() version?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAuthorized?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() detectedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class UninstallSoftwareDto {
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
