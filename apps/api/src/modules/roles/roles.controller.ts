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
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { RolesService } from './roles.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  UpdatePermissionsDto,
} from './dto/roles.dto';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get('export/excel')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Export roles to Excel' })
  async exportExcel(@Res() res: Response) {
    const buffer = await this.rolesService.exportToExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Export_Vaitro.xlsx',
    );
    res.send(buffer);
  }

  @Get('template/excel')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Download Excel import template' })
  async downloadExcelTemplate(@Res() res: Response) {
    const buffer = await this.rolesService.getExcelTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Template_Vaitro.xlsx',
    );
    res.send(buffer);
  }

  @Post('import/excel')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Import roles from Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.rolesService.importFromExcel(file.buffer);
  }

  @Get()
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Get all roles' })
  async findAll(@Query('isDeleted') isDeleted?: string) {
    return this.rolesService.findAllRoles(isDeleted === 'true');
  }

  @Get('permissions')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Get all permissions' })
  async findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get('permissions/grouped')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Get permissions grouped by module' })
  async getPermissionsByModule() {
    return this.rolesService.getPermissionsByModule();
  }

  @Get(':id')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Get role by ID' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOneRole(id);
  }

  @Post()
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Create new role' })
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Patch(':id')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Update role' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, dto);
  }

  @Post(':id/permissions')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Update role permissions' })
  async updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.rolesService.updatePermissions(id, dto);
  }

  @Delete(':id')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Delete role' })
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.rolesService.deleteRole(id, req.user?.id);
  }

  @Post(':id/restore')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Restore soft-deleted role' })
  async restore(@Param('id') id: string) {
    return this.rolesService.restoreRole(id);
  }

  @Delete(':id/force')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Permanently delete role' })
  async forceDelete(@Param('id') id: string) {
    return this.rolesService.forceDeleteRole(id);
  }
}
