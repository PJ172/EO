import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email or Phone number',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập email hoặc số điện thoại' })
  target: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @Length(6, 6, { message: 'Mã xác thực phải có 6 ký tự' })
  code: string;
}
