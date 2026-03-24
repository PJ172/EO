import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNewsCategoryDto {
  @ApiProperty({ example: 'Thông báo', description: 'Tên danh mục' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên danh mục' })
  name: string;
}

export class CreateNewsArticleDto {
  @ApiProperty({ example: 'Thông báo nghỉ Tết 2026', description: 'Tiêu đề' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tiêu đề' })
  title: string;

  @ApiProperty({ example: 'Tóm tắt nội dung...', required: false })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiProperty({
    example: '<p>Nội dung chi tiết...</p>',
    description: 'Nội dung HTML',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập nội dung' })
  content: string;

  @ApiProperty({ example: '/uploads/news/image.jpg', required: false })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class UpdateNewsArticleDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
