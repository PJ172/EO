import { Module } from '@nestjs/common';
import { FactoryService } from './factory.service';
import { FactoryController } from './factory.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FactoryExcelService } from './factory.excel.service';
import { ImportHistoryModule } from '../import-history/import-history.module';

@Module({
  imports: [PrismaModule, ImportHistoryModule],
  controllers: [FactoryController],
  providers: [FactoryService, FactoryExcelService],
  exports: [FactoryService],
})
export class FactoryModule {}
