import { Module } from '@nestjs/common';
import { ImportHistoryController } from './import-history.controller';
import { ImportHistoryService } from './import-history.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ImportHistoryController],
  providers: [ImportHistoryService],
  exports: [ImportHistoryService],
})
export class ImportHistoryModule {}
