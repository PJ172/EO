import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: (() => {
        const s = process.env.JWT_SECRET;
        if (!s && process.env.NODE_ENV === 'production') {
          throw new Error('FATAL: JWT_SECRET environment variable is required in production');
        }
        return s || 'dev-only-secret-do-not-use-in-production';
      })(),
      signOptions: {
        expiresIn: process.env.NODE_ENV === 'production' ? 900 : 28800, // 15min prod / 8h dev
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
