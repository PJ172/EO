import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ReportService } from './report.service';
import type { ReportPeriod } from './report.service';
import { ReportExcelService } from './report.excel.service';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly reportExcelService: ReportExcelService,
  ) {}

  @Get('hr')
  @Permissions('REPORT_VIEW')
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getHRReport(
    @Query('period') period: string = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportService.getHRReport(period as ReportPeriod, from, to);
  }

  @Get('attendance')
  @Permissions('REPORT_VIEW')
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getAttendanceReport(
    @Query('period') period: string = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportService.getAttendanceReport(
      period as ReportPeriod,
      from,
      to,
    );
  }

  @Get('leave')
  @Permissions('REPORT_VIEW')
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getLeaveReport(
    @Query('period') period: string = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportService.getLeaveReport(period as ReportPeriod, from, to);
  }

  @Get('booking')
  @Permissions('REPORT_VIEW')
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getBookingReport(
    @Query('period') period: string = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportService.getBookingReport(
      period as ReportPeriod,
      from,
      to,
    );
  }

  @Get('projects')
  @Permissions('REPORT_VIEW')
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getProjectsReport(
    @Query('period') period: string = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportService.getProjectsReport(
      period as ReportPeriod,
      from,
      to,
    );
  }

  @Get('car-booking')
  @Permissions('REPORT_VIEW')
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getCarBookingReport(
    @Query('period') period: string = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportService.getCarBookingReport(
      period as ReportPeriod,
      from,
      to,
    );
  }

  @Get('requests')
  @Permissions('REPORT_VIEW')
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getRequestsReport(
    @Query('period') period: string = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportService.getRequestsReport(
      period as ReportPeriod,
      from,
      to,
    );
  }

  @Get('meal')
  @Permissions('REPORT_VIEW')
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getMealReport(
    @Query('period') period: string = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportService.getMealReport(period as ReportPeriod, from, to);
  }

  @Get('ticket')
  @Permissions('REPORT_VIEW')
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getTicketReport(
    @Query('period') period: string = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportService.getTicketReport(period as ReportPeriod, from, to);
  }

  @Get('all')
  @Permissions('REPORT_VIEW')
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getAllReports(
    @Query('period') period: string = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportService.getAllReports(period as ReportPeriod, from, to);
  }

  @Get('export/hr')
  @Permissions('REPORT_VIEW')
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportHRReport(
    @Query('period') period: string = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: any,
  ) {
    const data = await this.reportService.getHRReport(
      period as ReportPeriod,
      from,
      to,
    );
    const buffer = await this.reportExcelService.exportHRReport(data);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Export_Baocao_${period}.xlsx`,
    );
    res.send(buffer);
  }
}
