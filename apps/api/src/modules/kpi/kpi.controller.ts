import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Res,
} from '@nestjs/common';
import { KPIService } from './kpi.service';
import { CreateKPIPeriodDto, UpdateKPIPeriodDto } from './dto/kpi-period.dto';
import {
  CreateEmployeeKPIDto,
  UpdateEmployeeKPIDto,
} from './dto/employee-kpi.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('KPI')
@Controller('kpi')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class KPIController {
  constructor(private readonly kpiService: KPIService) {}

  // =====================
  // KPI PERIODS
  // =====================

  @Get('periods')
  @Permissions('KPI_READ')
  @ApiOperation({ summary: 'Lấy danh sách kỳ đánh giá KPI' })
  async findAllPeriods() {
    return this.kpiService.findAllPeriods();
  }

  @Get('periods/active')
  @Permissions('KPI_READ')
  @ApiOperation({ summary: 'Lấy kỳ đánh giá đang hoạt động' })
  async findActivePeriod() {
    return this.kpiService.findActivePeriod();
  }

  @Post('periods')
  @Permissions('KPI_CREATE')
  @ApiOperation({ summary: 'Tạo kỳ đánh giá mới' })
  async createPeriod(@Body() dto: CreateKPIPeriodDto) {
    return this.kpiService.createPeriod(dto);
  }

  @Put('periods/:id')
  @Permissions('KPI_UPDATE')
  @ApiOperation({ summary: 'Cập nhật kỳ đánh giá' })
  @ApiParam({ name: 'id', description: 'Period ID' })
  async updatePeriod(@Param('id') id: string, @Body() dto: UpdateKPIPeriodDto) {
    return this.kpiService.updatePeriod(id, dto);
  }

  @Delete('periods/:id')
  @Permissions('KPI_MANAGE')
  @ApiOperation({ summary: 'Xóa kỳ đánh giá' })
  @ApiParam({ name: 'id', description: 'Period ID' })
  async deletePeriod(@Param('id') id: string) {
    return this.kpiService.deletePeriod(id);
  }

  @Get('periods/:periodId')
  @Permissions('KPI_READ')
  @ApiOperation({ summary: 'Lấy chi tiết kỳ đánh giá' })
  @ApiParam({ name: 'periodId', description: 'Period ID' })
  async findOnePeriod(@Param('periodId') periodId: string) {
    return this.kpiService.findOnePeriod(periodId);
  }

  @Get('periods/:periodId/summary')
  @Permissions('KPI_READ')
  @ApiOperation({ summary: 'Thống kê tổng quan KPI theo kỳ' })
  @ApiParam({ name: 'periodId', description: 'Period ID' })
  async getPeriodSummary(@Param('periodId') periodId: string) {
    return this.kpiService.getKPISummary(periodId);
  }

  @Get('periods/:periodId/kpis')
  @Permissions('KPI_READ')
  @ApiOperation({ summary: 'Lấy danh sách KPI của kỳ' })
  @ApiParam({ name: 'periodId', description: 'Period ID' })
  @ApiQuery({ name: 'isDeleted', required: false, type: Boolean })
  async findKPIsByPeriod(
    @Param('periodId') periodId: string,
    @Query('isDeleted') isDeleted?: string,
  ) {
    return this.kpiService.findKPIsByPeriod(periodId, isDeleted === 'true');
  }

  // =====================
  // EMPLOYEE KPIs
  // =====================

  @Get('employee/:employeeId')
  @Permissions('KPI_READ')
  @ApiOperation({ summary: 'Lấy tất cả KPI của nhân viên' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiQuery({ name: 'isDeleted', required: false, type: Boolean })
  async findEmployeeKPIs(
    @Param('employeeId') employeeId: string,
    @Query('isDeleted') isDeleted?: string,
  ) {
    return this.kpiService.findEmployeeKPIs(employeeId, isDeleted === 'true');
  }

  @Get(':id')
  @Permissions('KPI_READ')
  @ApiOperation({ summary: 'Xem chi tiết KPI' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  async findOne(@Param('id') id: string) {
    return this.kpiService.findOneEmployeeKPI(id);
  }

  @Post()
  @Permissions('KPI_CREATE')
  @ApiOperation({ summary: 'Tạo KPI cho nhân viên' })
  async create(@Body() dto: CreateEmployeeKPIDto) {
    return this.kpiService.createEmployeeKPI(dto);
  }

  @Put(':id')
  @Permissions('KPI_UPDATE')
  @ApiOperation({ summary: 'Cập nhật KPI' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeKPIDto) {
    return this.kpiService.updateEmployeeKPI(id, dto);
  }

  @Post(':id/submit')
  @Permissions('KPI_UPDATE')
  @ApiOperation({ summary: 'Gửi KPI để đánh giá' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  async submit(@Param('id') id: string, @Request() req: any) {
    return this.kpiService.submitKPI(id, req.user.id);
  }

  @Post(':id/review')
  @Permissions('KPI_UPDATE')
  @ApiOperation({ summary: 'Đánh giá KPI' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  async review(@Param('id') id: string, @Request() req: any) {
    return this.kpiService.reviewKPI(id, req.user.id);
  }

  @Post(':id/finalize')
  @Permissions('KPI_UPDATE')
  @ApiOperation({ summary: 'Chốt KPI' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  async finalize(@Param('id') id: string, @Request() req: any) {
    return this.kpiService.finalizeKPI(id, req.user.id);
  }

  @Delete(':id')
  @Permissions('KPI_MANAGE')
  @ApiOperation({ summary: 'Xóa KPI' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  async delete(@Param('id') id: string) {
    return this.kpiService.deleteEmployeeKPI(id);
  }

  @Post(':id/restore')
  @Permissions('KPI_MANAGE')
  @ApiOperation({ summary: 'Khôi phục KPI đã xóa' })
  async restore(@Param('id') id: string) {
    return this.kpiService.restoreEmployeeKPI(id);
  }

  @Delete(':id/force')
  @Permissions('KPI_MANAGE')
  @ApiOperation({ summary: 'Xóa vĩnh viễn KPI' })
  async forceDelete(@Param('id') id: string) {
    return this.kpiService.forceDeleteEmployeeKPI(id);
  }

  @Get('periods/:periodId/export/excel')
  @Permissions('EXPORT_DATA')
  @ApiOperation({ summary: 'Xuất Excel KPI theo kỳ' })
  @ApiParam({ name: 'periodId', description: 'Period ID' })
  async exportExcel(@Param('periodId') periodId: string, @Res() res: any) {
    const buffer = await this.kpiService.exportToExcel(periodId);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Export_KPI_${periodId}.xlsx"`,
    });
    res.send(buffer);
  }
}
