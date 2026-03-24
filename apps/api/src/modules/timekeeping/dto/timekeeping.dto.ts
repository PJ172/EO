import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CheckMethod {
  MANUAL = 'MANUAL',
  FINGERPRINT = 'FINGERPRINT',
  FACE = 'FACE',
  GPS = 'GPS',
}

export class CheckInDto {
  @ApiProperty({ enum: CheckMethod, required: false, default: 'MANUAL' })
  @IsOptional()
  @IsEnum(CheckMethod)
  method?: CheckMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CheckOutDto {
  @ApiProperty({ enum: CheckMethod, required: false, default: 'MANUAL' })
  @IsOptional()
  @IsEnum(CheckMethod)
  method?: CheckMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
