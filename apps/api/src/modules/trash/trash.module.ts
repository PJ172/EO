import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TrashService } from './trash.service';
import { TrashController } from './trash.controller';
import { TrashConfigService } from './trash-config.service';
import { TrashConfigController } from './trash-config.controller';
import { TrashPurgeScheduler } from './trash-purge.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  providers: [TrashService, TrashConfigService, TrashPurgeScheduler],
  controllers: [TrashController, TrashConfigController],
  exports: [TrashService, TrashConfigService],
})
export class TrashModule {}
