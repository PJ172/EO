import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SoftwareService } from './software.service';
import {
  CreateSoftwareDto,
  UpdateSoftwareDto,
  InstallSoftwareDto,
  UninstallSoftwareDto,
} from './dto/software.dto';

@ApiTags('Software')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('software')
export class SoftwareController {
  constructor(private readonly softwareService: SoftwareService) {}

  // === SOFTWARE CRUD ===

  @Get()
  @Permissions('ASSET_VIEW')
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'licenseType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vendor', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('licenseType') licenseType?: string,
    @Query('status') status?: string,
    @Query('vendor') vendor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.softwareService.findAll({
      search,
      licenseType,
      status,
      vendor,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('statistics')
  @Permissions('ASSET_VIEW')
  @ApiOperation({ summary: 'Get software statistics' })
  getStatistics() {
    return this.softwareService.getStatistics();
  }

  @Get('compliance')
  @Permissions('ASSET_VIEW')
  @ApiOperation({ summary: 'Get license compliance report' })
  getCompliance() {
    return this.softwareService.getComplianceReport();
  }

  @Get(':id')
  @Permissions('ASSET_VIEW')
  findOne(@Param('id') id: string) {
    return this.softwareService.findOne(id);
  }

  @Post()
  @Permissions('ASSET_MANAGE')
  @ApiOperation({ summary: 'Create software entry' })
  create(@Body() dto: CreateSoftwareDto) {
    return this.softwareService.create(dto);
  }

  @Put(':id')
  @Permissions('ASSET_MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateSoftwareDto) {
    return this.softwareService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('ASSET_MANAGE')
  delete(@Param('id') id: string) {
    return this.softwareService.delete(id);
  }

  // === INSTALLATION TRACKING ===

  @Post('install')
  @Permissions('ASSET_MANAGE')
  @ApiOperation({ summary: 'Install software on a device' })
  install(@Body() dto: InstallSoftwareDto) {
    return this.softwareService.installSoftware(dto);
  }

  @Post('installations/:id/uninstall')
  @Permissions('ASSET_MANAGE')
  @ApiOperation({ summary: 'Uninstall software from a device' })
  uninstall(@Param('id') id: string, @Body() dto: UninstallSoftwareDto) {
    return this.softwareService.uninstallSoftware(id, dto.note);
  }

  @Post('installations/:id/toggle-authorized')
  @Permissions('ASSET_MANAGE')
  @ApiOperation({ summary: 'Toggle authorized status of installation' })
  toggleAuthorized(@Param('id') id: string) {
    return this.softwareService.toggleAuthorized(id);
  }
}
