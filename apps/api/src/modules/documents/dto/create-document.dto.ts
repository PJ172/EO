import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @IsEnum(DocumentType, { message: 'Loại tài liệu không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng chọn loại tài liệu' })
  type: DocumentType;

  @IsString({ message: 'Tiêu đề phải là chuỗi' })
  @IsNotEmpty({ message: 'Tiêu đề tài liệu là bắt buộc' })
  @MaxLength(200, { message: 'Tiêu đề tối đa 200 ký tự' })
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Danh mục tối đa 100 ký tự' })
  category?: string;

  @IsArray({ message: 'Tags phải là mảng' })
  @IsString({ each: true, message: 'Mỗi tag phải là chuỗi' })
  @IsOptional()
  tags?: string[];

  // Initial Version Content
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  fileId?: string;
}

export class CreateDocumentVersionDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  fileId?: string;

  @IsOptional()
  effectiveDate?: Date;
}
