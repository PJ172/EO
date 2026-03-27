import { IsString, IsOptional, IsIn } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class BulkDeleteCategoryDto {
  ids: string[];
}
