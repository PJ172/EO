import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

class ColumnItemDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsBoolean()
  visible: boolean;

  @IsInt()
  order: number;
}

export class UpsertColumnConfigDto {
  @IsString()
  moduleKey: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnItemDto)
  columns: ColumnItemDto[];

  @IsString()
  @IsEnum(['ALL', 'ROLE', 'USER', 'NONE'])
  applyTo: 'ALL' | 'ROLE' | 'USER' | 'NONE';

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
