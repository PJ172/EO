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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { OrganizationService } from './organization.service';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Action } from '../audit/audit.enums';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';
import { OrganizationExcelService } from './organization.excel.service';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ImportHistoryService } from '../import-history/import-history.service';
import { OrgChartVersionService } from './org-chart-version.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Organization')
@Controller('organization')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@UseInterceptors(AuditInterceptor)
export class OrganizationController {
  constructor(
    private organizationService: OrganizationService,
    private excelService: OrganizationExcelService,
    private importHistoryService: ImportHistoryService,
    private versionService: OrgChartVersionService,
  ) {}

  @Get('tree')
  @Permissions('ORGCHART_VIEW')
  @ApiOperation({ summary: 'Lấy sơ đồ tổ chức (Org Chart)' })
  async getTree() {
    return this.organizationService.getOrgTree();
  }

  @Get('export')
  @Permissions('EXPORT_DATA')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Export organization units to Excel' })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'parentCode', required: false, type: String })
  async export(
    @Res() res: Response,
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('parentCode') parentCode?: string,
  ) {
    return this.excelService.exportDepartments(res, user, type, {
      search,
      status,
      parentCode,
    });
  }

  @Get('template')
  @Permissions('IMPORT_DATA')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Download import template' })
  async template(@Res() res: Response, @Query('type') type?: string) {
    return this.excelService.downloadTemplate(res, type);
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions('IMPORT_DATA')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Preview import' })
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type?: string,
  ) {
    return this.excelService.previewImport(file, type);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions('IMPORT_DATA')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'object',
          properties: { file: { type: 'string', format: 'binary' } },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Import organization units' })
  async import(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Query('type') type?: string,
  ) {
    const result = await this.excelService.importDepartments(
      file,
      type,
      user?.id,
    );
    this.importHistoryService.log({
      moduleKey: 'departments',
      moduleType: type?.toUpperCase(),
      fileName: file?.originalname ?? 'unknown.xlsx',
      totalRows: (result.success ?? 0) + (result.errors?.length ?? 0),
      success: result.success ?? 0,
      failed: result.errors?.length ?? 0,
      errors: result.errors ?? [],
      userId: user?.id,
    });
    return result;
  }

  @Post('bulk-delete')
  @Audit(Action.DELETE)
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Xóa đơn vị hàng loạt' })
  async bulkDelete(
    @Body() body: { ids: string[] },
    @CurrentUser('sub') userId: string,
  ) {
    return this.organizationService.bulkDeleteSoft(body.ids, userId);
  }

  @Get('next-code')
  @Permissions('DEPARTMENT_READ')
  @ApiOperation({ summary: 'Sinh mã định danh tự động' })
  async getNextCode(
    @Query('type') type: string,
    @Query('prefix') prefix: string,
  ) {
    return this.organizationService.getNextCode(type, prefix);
  }

  @Get()
  @Permissions('DEPARTMENT_READ')
  @ApiOperation({ summary: 'Danh sách đơn vị tổ chức' })
  async findAll(
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'asc' | 'desc',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isDeleted') isDeleted?: string,
  ) {
    return this.organizationService.findAll({
      search,
      sort,
      order,
      page,
      limit,
      isDeleted: isDeleted === 'true',
    });
  }

  @Get(':id')
  @Permissions('DEPARTMENT_READ')
  @ApiOperation({ summary: 'Chi tiết đơn vị' })
  async findOne(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Post()
  @Audit(Action.CREATE)
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Thêm mới đơn vị' })
  async create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: any) {
    return this.organizationService.create(dto, user.id);
  }

  @Patch('bulk-org-chart')
  @Audit(Action.UPDATE)
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Bật/Tắt hiển thị sơ đồ tổ chức hàng loạt' })
  async bulkOrgChart(
    @Query('type') type: string,
    @Body() body: { showOnOrgChart: boolean },
  ) {
    return this.organizationService.bulkUpdateShowOnOrgChart(type, body.showOnOrgChart);
  }

  @Patch('position')
  @Audit(Action.UPDATE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Lưu vị trí UI trên sơ đồ (theo chartKey)' })
  async updatePosition(@Body() body: Record<string, any>) {
    const chartKey = body['chartKey'] as string | undefined;
    const nodeId = body['nodeId'] as string;
    const x = Number(body['x']);
    const y = Number(body['y']);
    if (chartKey) {
      return this.organizationService.saveNodePositionByChart(chartKey, nodeId, x, y);
    }
    return this.organizationService.saveNodePosition(nodeId, x, y);
  }

  @Patch(':id')
  @Audit(Action.UPDATE)
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Cập nhật đơn vị' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: any,
  ) {
    return this.organizationService.update(id, dto, user.id);
  }

  @Post('move')
  @Audit(Action.UPDATE)
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Di chuyển vị trí cấp bậc' })
  async move(
    @Body() body: { sourceId: string; targetId: string | null },
    @CurrentUser() user: any,
  ) {
    return this.organizationService.move(body.sourceId, body.targetId, user.id);
  }

  @Post('positions/bulk')
  @Audit(Action.UPDATE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Lưu vị trí UI trên sơ đồ hàng loạt (theo chartKey)' })
  async updateBulkPositions(
    @Body() body: { chartKey?: string; positions: { nodeId: string; x: number; y: number }[] },
  ) {
    if (!body.positions || !Array.isArray(body.positions)) {
      return { success: false, message: 'Invalid payload' };
    }
    if (body.chartKey) {
      return this.organizationService.saveBulkNodePositionsByChart(body.chartKey, body.positions);
    }
    return this.organizationService.saveBulkNodePositions(body.positions);
  }

  @Delete(':id')
  @Audit(Action.DELETE)
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Xóa đơn vị (Soft delete)' })
  async delete(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.organizationService.delete(id, userId);
  }

  @Post(':id/restore')
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Khôi phục đơn vị' })
  async restore(@Param('id') id: string) {
    return this.organizationService.restore(id);
  }

  // --- Org Chart Config ---

  @Get('config/global')
  @Permissions('ORGCHART_VIEW')
  @ApiOperation({ summary: 'Lấy cấu hình chung sơ đồ' })
  async getOrgConfig() {
    return this.organizationService.getOrgChartConfig();
  }

  @Patch('config/global')
  @Audit(Action.UPDATE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Lưu cấu hình chung sơ đồ (Zoom, Spacing,...)' })
  async updateOrgConfig(
    @Body() body: { nodesep?: number; ranksep?: number; zoom?: number; nodeDims?: any },
    @CurrentUser('sub') userId: string,
  ) {
    return this.organizationService.saveOrgChartConfig(body, userId);
  }

  // --- Org Chart Matrix Overrides ---
  
  @Get('overrides/matrix')
  @Permissions('ORGCHART_VIEW')
  @ApiOperation({ summary: 'Lấy danh sách các ghi đè hiển thị sơ đồ (Matrix Overrides)' })
  async getOverrides() {
    return this.organizationService.getOverrides();
  }

  @Post('overrides/matrix')
  @Audit(Action.CREATE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Thêm/Cập nhật ghi đè hiển thị (MOVE_NODE, ADD_DOTTED_LINE, HIDE_NODE)' })
  async addOverride(
    @Body() body: { employeeId: string; action: string; targetManagerId: string; targetHandle?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.organizationService.addOverride(body, userId);
  }

  @Delete('overrides/matrix/:id')
  @Audit(Action.DELETE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Xóa ghi đè hiển thị sơ đồ' })
  async removeOverride(@Param('id') id: string) {
    return this.organizationService.removeOverride(id);
  }

  // --- Edge Waypoints ---

  @Get('edge-waypoints/:chartKey')
  @Permissions('ORGCHART_VIEW')
  @ApiOperation({ summary: 'Lấy waypoints của edges theo chartKey' })
  async getEdgeWaypoints(@Param('chartKey') chartKey: string) {
    return this.organizationService.getEdgeWaypoints(chartKey);
  }

  @Post('edge-waypoints')
  @Audit(Action.UPDATE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Lưu bulk edge waypoints cho chart' })
  async saveEdgeWaypoints(
    @Body() body: { chartKey: string; edges: { edgeId: string; waypoints: { x: number; y: number }[] }[] },
  ) {
    return this.organizationService.saveEdgeWaypoints(body.chartKey, body.edges);
  }

  // ═══════════════════════════════════════════════════════════
  // Version History & Scenario Endpoints
  // ═══════════════════════════════════════════════════════════

  @Get('versions/:chartKey')
  @Permissions('ORGCHART_VIEW')
  @ApiOperation({ summary: 'Danh sách versions của chart' })
  async listVersions(
    @Param('chartKey') chartKey: string,
    @Query('isScenario') isScenario?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.versionService.listVersions(chartKey, {
      isScenario: isScenario !== undefined ? isScenario === 'true' : undefined,
      take: take ? parseInt(take) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  @Get('versions/:chartKey/:versionNum')
  @Permissions('ORGCHART_VIEW')
  @ApiOperation({ summary: 'Chi tiết một version (bao gồm snapshot)' })
  async getVersion(
    @Param('chartKey') chartKey: string,
    @Param('versionNum') versionNum: string,
  ) {
    return this.versionService.getVersion(chartKey, parseInt(versionNum));
  }

  @Post('versions')
  @Audit(Action.CREATE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Tạo version snapshot thủ công' })
  async createVersion(
    @Body() body: { chartKey: string; label?: string; description?: string },
    @CurrentUser() user: any,
  ) {
    const snapshot = await this.versionService.buildSnapshotFromCurrentState(body.chartKey);
    return this.versionService.createVersion({
      chartKey: body.chartKey,
      snapshot,
      label: body.label,
      description: body.description,
      createdById: user?.id,
    });
  }

  @Post('versions/:chartKey/:versionNum/restore')
  @Audit(Action.UPDATE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Khôi phục sơ đồ từ version cũ' })
  async restoreVersion(
    @Param('chartKey') chartKey: string,
    @Param('versionNum') versionNum: string,
    @CurrentUser() user: any,
  ) {
    return this.versionService.restoreVersion(chartKey, parseInt(versionNum), user?.id);
  }

  @Patch('versions/:id')
  @Audit(Action.UPDATE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Cập nhật label/description version' })
  async updateVersion(
    @Param('id') id: string,
    @Body() body: { label?: string; description?: string },
  ) {
    return this.versionService.updateVersion(id, body);
  }

  @Delete('versions/:id')
  @Audit(Action.DELETE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Xóa version' })
  async deleteVersion(@Param('id') id: string) {
    return this.versionService.deleteVersion(id);
  }

  // ── Scenarios ──────────────────────────────────────────────

  @Post('scenarios')
  @Audit(Action.CREATE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Tạo scenario branch (fork từ version hiện tại)' })
  async createScenario(
    @Body() body: { chartKey: string; label?: string; description?: string; fromVersionNum?: number },
    @CurrentUser() user: any,
  ) {
    let snapshot: any;
    if (body.fromVersionNum) {
      const version = await this.versionService.getVersion(body.chartKey, body.fromVersionNum);
      snapshot = version.snapshot;
    } else {
      snapshot = await this.versionService.buildSnapshotFromCurrentState(body.chartKey);
    }
    return this.versionService.createVersion({
      chartKey: body.chartKey,
      snapshot,
      label: body.label || 'Kịch bản mới',
      description: body.description,
      isScenario: true,
      createdById: user?.id,
    });
  }

  @Patch('scenarios/:id')
  @Audit(Action.UPDATE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Cập nhật scenario (snapshot, label)' })
  async updateScenario(
    @Param('id') id: string,
    @Body() body: { label?: string; description?: string; snapshot?: any },
  ) {
    return this.versionService.updateVersion(id, body);
  }

  @Post('scenarios/:id/apply')
  @Audit(Action.UPDATE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Áp dụng scenario vào production' })
  async applyScenario(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.versionService.applyScenario(id, user?.id);
  }

  @Delete('scenarios/:id')
  @Audit(Action.DELETE)
  @Permissions('ORGCHART_MANAGE')
  @ApiOperation({ summary: 'Xóa scenario' })
  async deleteScenario(@Param('id') id: string) {
    return this.versionService.deleteVersion(id);
  }
}
