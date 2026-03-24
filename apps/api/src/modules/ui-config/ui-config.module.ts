import { Module } from '@nestjs/common';
import { UIConfigService } from './ui-config.service';
import { UIConfigController } from './ui-config.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UIConfigService],
  controllers: [UIConfigController],
  exports: [UIConfigService],
})
export class UIConfigModule {}
