import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @Permissions('SETTINGS_VIEW', 'SETTINGS_MANAGE')
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'order', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.categoryService.findAll({
      search, status, type, sortBy, order,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @Permissions('SETTINGS_VIEW', 'SETTINGS_MANAGE')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @Permissions('SETTINGS_MANAGE')
  @ApiOperation({ summary: 'Tạo danh mục CNTT mới (mã DM tự động)' })
  create(@Body() dto: CreateCategoryDto, @Req() req: any) {
    return this.categoryService.create(dto, req.user?.userId);
  }

  @Patch(':id')
  @Permissions('SETTINGS_MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @Req() req: any) {
    return this.categoryService.update(id, dto, req.user?.userId);
  }

  @Delete('bulk')
  @Permissions('SETTINGS_MANAGE')
  bulkDelete(@Body('ids') ids: string[]) {
    return this.categoryService.bulkDelete(ids);
  }

  @Delete(':id')
  @Permissions('SETTINGS_MANAGE')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
