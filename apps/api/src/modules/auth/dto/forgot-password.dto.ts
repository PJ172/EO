import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập email' })
  email: string;
}
