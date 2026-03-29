import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationExcelService } from './organization.excel.service';
import { OrgChartVersionService } from './org-chart-version.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';
import { ImportHistoryModule } from '../import-history/import-history.module';

@Module({
  imports: [PrismaModule, SharedModule, ImportHistoryModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationExcelService, OrgChartVersionService],
  exports: [OrganizationService, OrganizationExcelService, OrgChartVersionService],
})
export class OrganizationModule {}
