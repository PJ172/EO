import { Module } from '@nestjs/common';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { EmployeeExcelService } from './employee.excel.service';
import { EmployeeQueryService } from './services/employee-query.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationModule } from '../organization/organization.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [NotificationsModule, OrganizationModule, DashboardModule],
  controllers: [EmployeeController],
  providers: [EmployeeService, EmployeeExcelService, EmployeeQueryService],
  exports: [EmployeeService, EmployeeExcelService, EmployeeQueryService],
})
export class EmployeeModule {}
