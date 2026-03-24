import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Lấy tất cả thống kê cho Dashboard
   * GET /dashboard/stats
   */
  @Get('stats')
  async getAllStats() {
    return this.dashboardService.getAllStats();
  }

  /**
   * Thống kê nhân sự
   * GET /dashboard/employees
   */
  @Get('employees')
  async getEmployeeStats() {
    return this.dashboardService.getEmployeeStats();
  }

  /**
   * Thống kê đặt phòng
   * GET /dashboard/bookings
   */
  @Get('bookings')
  async getBookingStats() {
    return this.dashboardService.getBookingStats();
  }

  /**
   * Thống kê nghỉ phép
   * GET /dashboard/leaves
   */
  @Get('leaves')
  async getLeaveStats() {
    return this.dashboardService.getLeaveStats();
  }

  /**
   * Thống kê Audit Log
   * GET /dashboard/audit
   */
  @Get('audit')
  async getAuditStats() {
    return this.dashboardService.getAuditStats();
  }

  /**
   * Thống kê tờ trình
   * GET /dashboard/requests
   */
  @Get('requests')
  async getRequestStats() {
    return this.dashboardService.getRequestStats();
  }
}
