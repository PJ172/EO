import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EmployeeService } from './employee.service';
import { EmployeeExcelService } from './employee.excel.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import {
  CreateEmploymentEventDto,
  UpdateEmploymentEventDto,
} from './dto/employment-event.dto';

@ApiTags('Employees')
@Controller('employees')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class EmployeeController {
  constructor(
    private employeeService: EmployeeService,
    private employeeExcelService: EmployeeExcelService,
  ) {}

  @Get('export')
  @Permissions('EXPORT_DATA')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Export employees to Excel (max 5/min)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  async export(
    @Res() res: Response,
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.employeeExcelService.exportEmployees(
      res,
      { search, status, departmentId },
      user,
    );
  }

  @Get('template')
  @Permissions('IMPORT_DATA')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Download import template (max 10/min)' })
  async template(@Res() res: Response) {
    return this.employeeExcelService.downloadTemplate(res);
  }

  @Post('preview')
  @Permissions('IMPORT_DATA')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Preview employee import (max 10/min)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    return this.employeeExcelService.importEmployees(file, true, userId);
  }

  @Post('import')
  @Permissions('IMPORT_DATA')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Import employees from Excel (max 3/min)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
    @Body('autoCreateUser') autoCreateUser?: string,
  ) {
    const shouldCreateUser = autoCreateUser === 'true';
    return this.employeeExcelService.importEmployees(
      file,
      false,
      userId,
      shouldCreateUser,
    );
  }

  // ==================== Org Chart Endpoints ====================

  @Get('org-chart/structure')
  @Permissions('EMPLOYEE_READ')
  @ApiOperation({
    summary:
      'Get organizational unit structure as an array of nodes and edges (Company -> Factory -> Division -> Department -> Section)',
  })
  async getOrgChartStructure() {
    return this.employeeService.getOrgChartStructure();
  }

  @Get('org-chart/hierarchy')
  @Permissions('EMPLOYEE_READ')
  @ApiOperation({
    summary:
      'Get employee reporting hierarchy as an array of nodes and edges (Self-related by managerEmployeeId)',
  })
  @ApiQuery({
    name: 'departmentId',
    required: false,
    description: 'Optional: Filter hierarchy for a specific department',
  })
  async getOrgChartHierarchy(
    @Query('departmentId') departmentId?: string,
    @Query('chartKey') chartKey?: string,
  ) {
    return this.employeeService.getOrgChartHierarchy(departmentId, chartKey);
  }

  @Post('org-chart/config/:id')
  @Permissions('EMPLOYEE_UPDATE')
  @ApiOperation({ summary: 'Save org chart specific configuration' })
  async saveOrgChartConfig(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.employeeService.saveOrgChartConfig(id, data, req.user.id);
  }

  @Post('org-chart/overrides/:chartKey')
  @Permissions('EMPLOYEE_UPDATE')
  @ApiOperation({ summary: 'Save org chart view overrides (hidden nodes, custom edges)' })
  async saveOrgChartViewOverride(@Param('chartKey') chartKey: string, @Body() data: any, @Req() req: any) {
    return this.employeeService.saveOrgChartViewOverride(chartKey, data, req.user.id);
  }

  @Get('org-chart/dept/:deptId')
  @Permissions('EMPLOYEE_READ')
  @ApiOperation({ summary: 'Get employee org chart for a specific department' })
  @ApiParam({ name: 'deptId', description: 'Department UUID' })
  async getDeptOrgChart(@Param('deptId') deptId: string) {
    return this.employeeService.getDeptOrgChart(deptId);
  }

  @Get()
  @Permissions('EMPLOYEE_READ')
  @ApiOperation({ summary: 'Get all employees' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  @ApiQuery({ name: 'factoryId', required: false, type: String })
  @ApiQuery({ name: 'divisionId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'isDeleted', required: false, type: Boolean })
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('companyId') companyId?: string,
    @Query('factoryId') factoryId?: string,
    @Query('divisionId') divisionId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('status') status?: string,
    @Query('jobTitleId') jobTitleId?: string,
    @Query('dobFrom') dobFrom?: string,
    @Query('dobTo') dobTo?: string,
    @Query('joinedFrom') joinedFrom?: string,
    @Query('joinedTo') joinedTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
    @Query('isDeleted') isDeleted?: string,
    @Query('managerEmployeeId') managerEmployeeId?: string,
  ) {
    return this.employeeService.findAll(
      {
        page: Number(page),
        limit: Number(limit),
        search,
        departmentId,
        companyId,
        factoryId,
        divisionId,
        sectionId,
        status,
        jobTitleId,
        dobFrom,
        dobTo,
        joinedFrom,
        joinedTo,
        sortBy,
        order,
        isDeleted: isDeleted === 'true',
        managerEmployeeId,
      },
      user,
    );
  }

  @Get(':id')
  @Permissions('EMPLOYEE_READ')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.employeeService.findOne(id, user);
  }

  @Post()
  @Permissions('EMPLOYEE_CREATE')
  @ApiOperation({ summary: 'Create new employee' })
  async create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.employeeService.create(dto, userId);
  }

  @Patch(':id')
  @Permissions('EMPLOYEE_UPDATE')
  @ApiOperation({ summary: 'Update employee' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: any,
  ) {
    return this.employeeService.update(id, dto, user);
  }

  @Delete('bulk')
  @Permissions('EMPLOYEE_DELETE')
  @ApiOperation({ summary: 'Delete multiple employees' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async bulkDelete(@Body('ids') ids: string[], @CurrentUser() user: any) {
    if (!ids || !ids.length) {
      throw new Error('Danh sách nhân viên cần xóa không được để trống');
    }
    return this.employeeService.bulkDelete(ids, user);
  }

  @Delete(':id')
  @Permissions('EMPLOYEE_DELETE')
  @ApiOperation({ summary: 'Delete employee (Soft Delete)' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.employeeService.delete(id, user);
  }

  @Post(':id/restore')
  @Permissions('EMPLOYEE_DELETE') // Same permission as they need delete rights to manage trash, or a specific RESTORE one
  @ApiOperation({ summary: 'Restore a deleted employee' })
  async restore(@Param('id') id: string) {
    return this.employeeService.restore(id);
  }

  @Delete(':id/force')
  @Permissions('EMPLOYEE_DELETE') // Only high privileges can hard delete
  @ApiOperation({ summary: 'Hard delete an employee permanently' })
  async hardDelete(@Param('id') id: string) {
    return this.employeeService.hardDelete(id);
  }

  @Get(':id/leaves')
  @Permissions('EMPLOYEE_READ')
  @ApiOperation({ summary: 'Get employee leave requests' })
  async getLeaveRequests(@Param('id') id: string) {
    return this.employeeService.getLeaveRequests(id);
  }

  @Post(':id/avatar')
  @Permissions('EMPLOYEE_UPLOAD_FILE')
  @ApiOperation({ summary: 'Upload avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { storage: require('multer').memoryStorage() }),
  )
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error(
        'File upload failed. Ensure Content-Type is multipart/form-data',
      );
    }
    return this.employeeService.uploadAvatar(id, file);
  }

  @Get(':id/attendance')
  @Permissions('EMPLOYEE_READ')
  @ApiOperation({ summary: 'Get employee attendance' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getAttendance(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.employeeService.getAttendance(id, from, to);
  }

  // ==================== Employment Events ====================

  @Get(':id/events')
  @Permissions('EMPLOYEE_READ')
  @ApiOperation({ summary: 'Get employment events (biến động nhân sự)' })
  async getEmploymentEvents(@Param('id') id: string) {
    return this.employeeService.getEmploymentEvents(id);
  }

  @Post(':id/events')
  @Permissions('EMPLOYEE_UPDATE')
  @ApiOperation({ summary: 'Create employment event' })
  async createEmploymentEvent(
    @Param('id') id: string,
    @Body() dto: CreateEmploymentEventDto,
  ) {
    return this.employeeService.createEmploymentEvent(id, dto);
  }

  @Patch(':id/events/:eventId')
  @Permissions('EMPLOYEE_UPDATE')
  @ApiOperation({ summary: 'Update employment event' })
  async updateEmploymentEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEmploymentEventDto,
  ) {
    return this.employeeService.updateEmploymentEvent(id, eventId, dto);
  }

  @Delete(':id/events/:eventId')
  @Permissions('EMPLOYEE_UPDATE')
  @ApiOperation({ summary: 'Delete employment event' })
  async deleteEmploymentEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
  ) {
    return this.employeeService.deleteEmploymentEvent(id, eventId);
  }
}
