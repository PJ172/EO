import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationExcelService } from './organization.excel.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';
import { ImportHistoryModule } from '../import-history/import-history.module';

@Module({
  imports: [PrismaModule, SharedModule, ImportHistoryModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationExcelService],
  exports: [OrganizationService, OrganizationExcelService],
})
export class OrganizationModule {}
