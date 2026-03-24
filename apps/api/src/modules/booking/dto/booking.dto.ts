import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateRoomDto {
  @IsString({ message: 'Tên phòng phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên phòng là bắt buộc' })
  @MaxLength(100, { message: 'Tên phòng tối đa 100 ký tự' })
  name: string;

  @IsString({ message: 'Mã phòng phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã phòng là bắt buộc' })
  @MaxLength(50, { message: 'Mã phòng tối đa 50 ký tự' })
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Vị trí tối đa 200 ký tự' })
  location?: string;

  @IsInt({ message: 'Sức chứa phải là số nguyên' })
  @Min(1, { message: 'Sức chứa tối thiểu là 1' })
  capacity: number;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Mô tả tối đa 500 ký tự' })
  description?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsOptional()
  equipment?: string[];

  @IsOptional()
  features?: string[];
}

export class UpdateRoomDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Tên phòng tối đa 100 ký tự' })
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Mã phòng tối đa 50 ký tự' })
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Vị trí tối đa 200 ký tự' })
  location?: string;

  @IsInt({ message: 'Sức chứa phải là số nguyên' })
  @Min(1, { message: 'Sức chứa tối thiểu là 1' })
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Mô tả tối đa 500 ký tự' })
  description?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsOptional()
  equipment?: string[];

  @IsOptional()
  features?: string[];
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn phòng họp' })
  roomId: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn thời gian bắt đầu' })
  @IsDateString({}, { message: 'Thời gian bắt đầu không hợp lệ' })
  startTime: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn thời gian kết thúc' })
  @IsDateString({}, { message: 'Thời gian kết thúc không hợp lệ' })
  endTime: string;

  @IsString({ message: 'Tiêu đề phải là chuỗi' })
  @IsNotEmpty({ message: 'Tiêu đề cuộc họp là bắt buộc' })
  @MaxLength(200, { message: 'Tiêu đề tối đa 200 ký tự' })
  purpose: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Nội dung tối đa 1000 ký tự' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  note?: string;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái riêng tư không hợp lệ' })
  isPrivate?: boolean;

  @IsOptional()
  attendeeIds?: string[];
}
