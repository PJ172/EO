import { Module } from '@nestjs/common';
import { KPIController } from './kpi.controller';
import { KPIService } from './kpi.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [KPIController],
  providers: [KPIService],
  exports: [KPIService],
})
export class KPIModule {}
