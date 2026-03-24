import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPasswordDto {
  @ApiProperty({
    description: 'The password to verify against the current user account',
  })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  @IsString()
  password: string;
}
