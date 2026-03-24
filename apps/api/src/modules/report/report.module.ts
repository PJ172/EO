import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportExcelService } from './report.excel.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ExcelService } from '../../shared/excel.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportController],
  providers: [ReportService, ReportExcelService, ExcelService],
  exports: [ReportService],
})
export class ReportModule {}
