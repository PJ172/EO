import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MealSessionCodeDto {
  LUNCH = 'LUNCH',
  AFTERNOON_SNACK = 'AFTERNOON_SNACK',
  DINNER = 'DINNER',
  LATE_NIGHT_SNACK = 'LATE_NIGHT_SNACK',
}

export class RegisterMealDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CancelMealDto {
  @ApiProperty()
  @IsString()
  registrationId: string;
}

export class CreateMealMenuDto {
  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mainDish?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sideDish?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  soup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dessert?: string;

  @ApiPropertyOptional()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateMealSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cutoffTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  maxRegistrations?: number;

  @ApiPropertyOptional()
  @IsOptional()
  defaultPrice?: number;
}
