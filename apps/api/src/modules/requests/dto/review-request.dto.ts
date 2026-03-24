import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewRequestDto {
  @ApiProperty({
    example: 'Đồng ý theo đề xuất',
    description: 'Nhận xét của người duyệt',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
