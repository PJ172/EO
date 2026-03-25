import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength, Matches, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateJobPositionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Matches(/^VP\d{5}$/, { message: 'Mã vị trí phải gồm tiền tố VP và đúng 5 chữ số (VD: VP00001)' })
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @ApiProperty({ required: false, enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showOnOrgChart?: boolean;
}

export class UpdateJobPositionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @ApiProperty({ required: false, enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showOnOrgChart?: boolean;
}
