import { IsString, IsOptional, IsIn, MaxLength, MinLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateLocationDto {
  @IsString()
  @MaxLength(2)
  @MinLength(2)
  prefix: string; // 2 ký tự tiền tố: NM, TD, DL, VP...

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  detail?: string;

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

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}

export class BulkDeleteLocationDto {
  ids: string[];
}
