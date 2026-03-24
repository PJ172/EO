import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'LOCKED'], {
    message: 'Trạng thái không hợp lệ',
  })
  status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Mã nhân viên không hợp lệ' })
  employeeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray({ message: 'Danh sách vai trò không hợp lệ' })
  @IsString({ each: true, message: 'ID vai trò không hợp lệ' })
  roleIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray({ message: 'Danh sách quyền không hợp lệ' })
  @IsString({ each: true, message: 'ID quyền không hợp lệ' })
  permissionIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Mật khẩu mới không hợp lệ' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  password?: string;

  @ApiProperty()
  @IsString({ message: 'Mật khẩu xác nhận không hợp lệ' })
  @MinLength(6, { message: 'Mật khẩu Admin phải có ít nhất 6 ký tự' })
  adminPassword: string;
}

export class AdminResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class AssignRolesDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  roleIds: string[];
}

export class AssignBulkRolesDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  roleIds: string[];
}

export class AssignPermissionsDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
