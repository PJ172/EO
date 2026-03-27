import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  Matches,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum OrgStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class BaseOrgNodeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(7, { message: 'Mã đơn vị phải đúng 7 ký tự (VD: PB00001)' })
  @Matches(/^(CT|NM|KH|PB|BP)\d{5}$/, {
    message:
      'Mã đơn vị phải gồm 2 ký tự tiền tố (CT, NM, KH, PB, BP) và đúng 5 chữ số',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  code: string;

  @ApiProperty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    enum: OrgStatus,
    default: OrgStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(OrgStatus)
  status?: OrgStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  uiPositionX?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  uiPositionY?: number;

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

  @ApiPropertyOptional({
    default: false,
    description: 'Bật chức danh tùy chỉnh trên sơ đồ tổ chức',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  useManagerDisplayTitle?: boolean;

  @ApiPropertyOptional({
    description: 'Chức danh hiển thị trên sơ đồ (khi useManagerDisplayTitle = true)',
  })
  @IsOptional()
  @IsString()
  managerDisplayTitle?: string;
}
