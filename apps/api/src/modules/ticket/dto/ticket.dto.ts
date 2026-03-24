import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketCategoryDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string;
  @ApiPropertyOptional() @IsOptional() slaHours?: number;
}

export class CreateTicketDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsString() categoryId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assetId?: string;
}

export class ApproveTicketDto {
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

export class RejectTicketDto {
  @ApiProperty() @IsString() comment: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
}

export class AssignTicketDto {
  @ApiProperty() @IsString() assigneeId: string;
}

export class ResolveTicketDto {
  @ApiProperty() @IsString() resolution: string;
}

export class AddTicketCommentDto {
  @ApiProperty() @IsString() content: string;
  @ApiPropertyOptional() @IsOptional() isInternal?: boolean;
}

export class RateTicketDto {
  @ApiProperty() rating: number;
}
