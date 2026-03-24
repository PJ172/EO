import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { ITAssetService } from './it-asset.service';
import {
  CreateAssetCategoryDto,
  CreateITAssetDto,
  UpdateITAssetDto,
  AssignAssetDto,
  ReturnAssetDto,
  CreateMaintenanceDto,
} from './dto/it-asset.dto';

@ApiTags('IT Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('it-assets')
export class ITAssetController {
  constructor(private readonly itAssetService: ITAssetService) {}

  // === CATEGORIES ===
  @Get('categories')
  @Permissions('ASSET_VIEW')
  getCategories() {
    return this.itAssetService.getCategories();
  }

  @Post('categories')
  @Permissions('ASSET_MANAGE')
  createCategory(@Body() dto: CreateAssetCategoryDto) {
    return this.itAssetService.createCategory(dto);
  }

  @Delete('categories/:id')
  @Permissions('ASSET_MANAGE')
  deleteCategory(@Param('id') id: string) {
    return this.itAssetService.deleteCategory(id);
  }

  // === ASSETS ===
  @Get()
  @Permissions('ASSET_VIEW')
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'isDeleted', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
    @Query('isDeleted') isDeleted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.itAssetService.findAll({
      search,
      categoryId,
      status,
      departmentId,
      isDeleted: isDeleted === 'true',
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('statistics')
  @Permissions('ASSET_VIEW')
  getStatistics() {
    return this.itAssetService.getStatistics();
  }

  @Get(':id')
  @Permissions('ASSET_VIEW')
  findOne(@Param('id') id: string) {
    return this.itAssetService.findOne(id);
  }

  @Post()
  @Permissions('ASSET_MANAGE')
  create(@Body() dto: CreateITAssetDto) {
    return this.itAssetService.create(dto);
  }

  @Put(':id')
  @Permissions('ASSET_MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateITAssetDto) {
    return this.itAssetService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('ASSET_MANAGE')
  delete(@Param('id') id: string) {
    return this.itAssetService.delete(id);
  }

  // === QR CODE ===
  @Get('code/:code/qr')
  // QR usually needs public read access if scanned by users without login on the redirect page,
  // but let's keep it protected for generation.
  @Permissions('ASSET_VIEW')
  generateQrCode(@Param('code') code: string) {
    return this.itAssetService.generateQrCode(code);
  }

  // === ASSIGNMENT ===
  @Post(':id/assign')
  @Permissions('ASSET_MANAGE')
  assign(@Param('id') id: string, @Body() dto: AssignAssetDto) {
    return this.itAssetService.assign(id, dto);
  }

  @Post(':id/return')
  @Permissions('ASSET_MANAGE')
  returnAsset(@Param('id') id: string, @Body() dto: ReturnAssetDto) {
    return this.itAssetService.returnAsset(id, dto);
  }

  // === MAINTENANCE ===
  @Post('maintenance')
  @Permissions('ASSET_MANAGE')
  createMaintenance(@Body() dto: CreateMaintenanceDto) {
    return this.itAssetService.createMaintenance(dto);
  }

  @Post('maintenance/:id/complete')
  @Permissions('ASSET_MANAGE')
  completeMaintenance(@Param('id') id: string) {
    return this.itAssetService.completeMaintenance(id);
  }

  @Post(':id/restore')
  @Permissions('ASSET_MANAGE')
  restore(@Param('id') id: string) {
    return this.itAssetService.restore(id);
  }

  @Delete(':id/force')
  @Permissions('ASSET_MANAGE')
  forceDelete(@Param('id') id: string) {
    return this.itAssetService.forceDelete(id);
  }
}
