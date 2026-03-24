import { Module } from '@nestjs/common';
import { CarBookingController } from './car-booking.controller';
import { CarBookingService } from './car-booking.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CarBookingController],
  providers: [CarBookingService],
  exports: [CarBookingService],
})
export class CarBookingModule {}
