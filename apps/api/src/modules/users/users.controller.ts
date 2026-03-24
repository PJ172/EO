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
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  AdminResetPasswordDto,
  AssignRolesDto,
  AssignBulkRolesDto,
  AssignPermissionsDto,
} from './dto/users.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'isDeleted', required: false, type: Boolean })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
    @Query('isDeleted') isDeleted?: string,
  ) {
    return this.usersService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      sortBy,
      order,
      isDeleted: isDeleted === 'true',
    });
  }

  // ===================== EXCEL ENDPOINTS =====================

  @Get('export/excel')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Export users to Excel (.xlsx)' })
  async exportExcel(@Res() res: Response) {
    const buffer = await this.usersService.exportToExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Export_Taikhoan.xlsx',
    );
    res.send(buffer);
  }

  @Get('template/excel')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Download Excel import template' })
  async downloadExcelTemplate(@Res() res: Response) {
    const buffer = await this.usersService.getExcelTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Template_Taikhoan.xlsx',
    );
    res.send(buffer);
  }

  @Post('import/excel')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Import users from Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.usersService.importFromExcel(file.buffer, req.user?.id);
  }

  // ===================== CSV ENDPOINTS (Legacy) =====================

  @Get('export')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Export users to CSV' })
  async exportUsers(@Res() res: Response) {
    const csvData = await this.usersService.exportToCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Export_Taikhoan.csv',
    );
    res.send('\ufeff' + csvData); // BOM for Excel UTF-8
  }

  @Get('template')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Download CSV import template' })
  async downloadTemplate(@Res() res: Response) {
    const template = this.usersService.getImportTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Template_Taikhoan.csv',
    );
    res.send('\ufeff' + template);
  }

  @Post('import')
  @Permissions('USER_ROLE_MANAGE')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Import users from CSV (max 3/min)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importUsers(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.usersService.importFromCsv(
      file.buffer.toString('utf-8'),
      req.user?.id,
    );
  }

  @Get(':id')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Create new user' })
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.usersService.create(dto, req.user?.id);
  }

  @Patch(':id')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.usersService.update(id, dto, req.user?.id);
  }

  @Post('verify-admin-password')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({
    summary: 'Verify admin password before sensitive operations',
  })
  async verifyAdminPassword(
    @Body() dto: { adminPassword: string },
    @Req() req: any,
  ) {
    return this.usersService.verifyAdminPassword(
      dto.adminPassword,
      req.user?.id,
    );
  }

  @Post(':id/reset-password')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Reset user password' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    return this.usersService.resetPassword(id, dto.newPassword);
  }

  @Post(':id/roles')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Assign roles to user' })
  async assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto) {
    return this.usersService.assignRoles(id, dto);
  }

  @Post('bulk-roles')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Assign roles to multiple users at once' })
  async assignBulkRoles(@Body() dto: AssignBulkRolesDto, @Req() req: any) {
    return this.usersService.assignBulkRoles(dto, req.user?.id);
  }

  @Delete(':id/roles/:roleId')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Remove role from user' })
  async removeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.usersService.removeRole(id, roleId);
  }

  @Get(':id/permissions-overrides')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Get user permission overrides' })
  async getPermissionsOverrides(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return user?.permissions || [];
  }

  @Post(':id/permissions')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Assign permission overrides to user' })
  async assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.usersService.assignPermissions(id, dto);
  }

  @Post('bulk-delete')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Bulk delete users' })
  async bulkDelete(@Body() dto: { ids: string[] }, @Req() req: any) {
    return this.usersService.bulkDelete(dto.ids, req.user?.id);
  }

  @Delete(':id')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Delete user' })
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.usersService.delete(id, req.user?.id);
  }

  @Post(':id/restore')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Restore a deleted user' })
  async restore(@Param('id') id: string) {
    return this.usersService.restore(id);
  }

  @Delete(':id/force')
  @Permissions('USER_ROLE_MANAGE')
  @ApiOperation({ summary: 'Permanently delete a user' })
  async forceDelete(@Param('id') id: string) {
    return this.usersService.forceDelete(id);
  }
}
