import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { LocationService } from './location.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@ApiTags('Locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  @Permissions('SETTINGS_VIEW', 'SETTINGS_MANAGE')
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'prefix', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'order', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('prefix') prefix?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.locationService.findAll({
      search, status, prefix, sortBy, order,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @Permissions('SETTINGS_VIEW', 'SETTINGS_MANAGE')
  findOne(@Param('id') id: string) {
    return this.locationService.findOne(id);
  }

  @Post()
  @Permissions('SETTINGS_MANAGE')
  @ApiOperation({ summary: 'Tạo vị trí CNTT mới (mã tự động theo prefix)' })
  create(@Body() dto: CreateLocationDto, @Req() req: any) {
    return this.locationService.create(dto, req.user?.userId);
  }

  @Patch(':id')
  @Permissions('SETTINGS_MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto, @Req() req: any) {
    return this.locationService.update(id, dto, req.user?.userId);
  }

  @Delete('bulk')
  @Permissions('SETTINGS_MANAGE')
  bulkDelete(@Body('ids') ids: string[]) {
    return this.locationService.bulkDelete(ids);
  }

  @Delete(':id')
  @Permissions('SETTINGS_MANAGE')
  remove(@Param('id') id: string) {
    return this.locationService.remove(id);
  }
}
