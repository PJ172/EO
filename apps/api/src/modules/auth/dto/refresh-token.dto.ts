import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token from login response',
  })
  @IsString({ message: 'Refresh token phải là chuỗi' })
  @IsNotEmpty({ message: 'Refresh token là bắt buộc' })
  refreshToken: string;
}
