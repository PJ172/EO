import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { FactoryStatus } from '@prisma/client';

export class CreateFactoryDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(7, { message: 'Mã nhà máy phải đúng 7 ký tự (VD: NM00001)' })
  @Matches(/^NM\d{5}$/, {
    message: 'Mã nhà máy phải gồm tiền tố NM và đúng 5 chữ số',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  code: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  managerEmployeeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ enum: FactoryStatus, default: FactoryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(FactoryStatus)
  status?: FactoryStatus;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  showOnOrgChart?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  excludeFromFilters?: boolean;
}

export class UpdateFactoryDto extends PartialType(CreateFactoryDto) {}

export class FactoryQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: FactoryStatus, required: false })
  @IsOptional()
  @IsEnum(FactoryStatus)
  status?: FactoryStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiProperty({ enum: ['asc', 'desc'], required: false })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isDeleted?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  excludeFromFilters?: string;
}
