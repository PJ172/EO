import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    JwtModule.register({
      secret: (() => {
        const s = process.env.JWT_SECRET;
        if (!s && process.env.NODE_ENV === 'production') {
          throw new Error('FATAL: JWT_SECRET environment variable is required in production');
        }
        return s || 'dev-only-secret-do-not-use-in-production';
      })(),
    }),
  ],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
