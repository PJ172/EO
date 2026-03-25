import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JobPositionService } from './job-position.service';
import { CreateJobPositionDto, UpdateJobPositionDto } from './job-position.dto';

@ApiTags('Job Positions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('job-positions')
export class JobPositionController {
  constructor(private readonly service: JobPositionService) {}

  @Get()
  @Permissions('JOB_POSITION_READ')
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.service.findAll({
      search,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      sortBy: sortBy || 'code',
      order: order || 'asc',
    });
  }

  @Get('stats')
  @Permissions('JOB_POSITION_READ')
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @Permissions('JOB_POSITION_READ')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('JOB_POSITION_MANAGE')
  create(@Body() dto: CreateJobPositionDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Put(':id')
  @Permissions('JOB_POSITION_MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateJobPositionDto, @Req() req: any) {
    return this.service.update(id, dto, req.user.id);
  }

  @Post('bulk-org-chart')
  @Permissions('JOB_POSITION_MANAGE')
  bulkUpdateOrgChart(@Body('showOnOrgChart') showOnOrgChart: boolean, @Req() req: any) {
    return this.service.bulkUpdateOrgChart(showOnOrgChart, req.user.id);
  }

  @Delete(':id')
  @Permissions('JOB_POSITION_MANAGE')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.id);
  }
}
