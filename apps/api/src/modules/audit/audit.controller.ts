import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import { AuditExcelService } from './audit.excel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Audit')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly auditExcelService: AuditExcelService,
  ) {}

  @Get()
  @Permissions('AUDITLOG_VIEW')
  async findAll(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.auditService.findAll({
      userId,
      action,
      entityType,
      from,
      to,
      limit: limit ? parseInt(limit) : 20,
      page: page ? parseInt(page) : 1,
      sortBy,
      order,
    });
  }

  @Get('export/excel')
  @Permissions('AUDITLOG_VIEW')
  async export(
    @Res() res: Response,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    try {
      return await this.auditExcelService.exportAuditLogs(res, {
        userId,
        action,
        entityType,
        from,
        to,
        sortBy,
        order,
      });
    } catch (error) {
      console.error('Export Excel Error:', error);
      throw error;
    }
  }
}
