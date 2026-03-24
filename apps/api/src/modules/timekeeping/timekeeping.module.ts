import { Module } from '@nestjs/common';
import { TimekeepingController } from './timekeeping.controller';
import { TimekeepingService } from './timekeeping.service';

@Module({
  controllers: [TimekeepingController],
  providers: [TimekeepingService],
  exports: [TimekeepingService],
})
export class TimekeepingModule {}
