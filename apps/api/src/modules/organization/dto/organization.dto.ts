import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BaseOrgNodeDto } from './base-org-node.dto';

export class CreateOrganizationDto extends BaseOrgNodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerEmployeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  divisionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  factoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionId?: string;
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
