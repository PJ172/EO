import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ColumnConfigService } from './column-config.service';
import { UpsertColumnConfigDto } from './column-config.dto';

@ApiTags('Column Configs')
@Controller('column-configs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ColumnConfigController {
  constructor(private columnConfigService: ColumnConfigService) {}

  @Get(':moduleKey')
  @ApiOperation({ summary: 'Get column config for current user' })
  async getConfig(
    @Param('moduleKey') moduleKey: string,
    @CurrentUser() user: any,
  ) {
    try {
      const userRoleIds = (user.roles || []).map(
        (r: any) => r.roleId || r.id || r,
      );
      const config = await this.columnConfigService.getConfig(
        moduleKey,
        user.id,
        userRoleIds,
      );
      return config || null;
    } catch {
      return null;
    }
  }

  @Get(':moduleKey/all')
  @Permissions('ADMIN')
  @ApiOperation({ summary: 'Get all column configs for a module (admin)' })
  async getAllConfigs(@Param('moduleKey') moduleKey: string) {
    try {
      return await this.columnConfigService.getAllConfigs(moduleKey);
    } catch {
      return [];
    }
  }

  @Put()
  @Permissions('ADMIN')
  @ApiOperation({ summary: 'Create or update column config (admin)' })
  async upsert(@Body() dto: UpsertColumnConfigDto, @CurrentUser() user: any) {
    return this.columnConfigService.upsert(dto, user.id);
  }

  @Put(':id')
  @Permissions('ADMIN')
  @ApiOperation({ summary: 'Update column config by ID (admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpsertColumnConfigDto,
    @CurrentUser() user: any,
  ) {
    return this.columnConfigService.update(id, dto, user.id);
  }

  @Patch('reorder')
  @Permissions('ADMIN')
  @ApiOperation({ summary: 'Reorder column configs (admin)' })
  async reorderConfigs(@Body() items: { id: string; order: number }[]) {
    return this.columnConfigService.reorderConfigs(items);
  }

  @Delete(':id')
  @Permissions('ADMIN')
  @ApiOperation({ summary: 'Delete column config (admin)' })
  async deleteConfig(@Param('id') id: string) {
    return this.columnConfigService.deleteConfig(id);
  }
}
