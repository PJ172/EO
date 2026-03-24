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
  Request,
} from '@nestjs/common';
import { NewsService } from './news.service';
import {
  CreateNewsCategoryDto,
  CreateNewsArticleDto,
  UpdateNewsArticleDto,
} from './dto/news.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // =====================
  // PUBLIC (No auth required)
  // =====================

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Lấy tin tức đã xuất bản (public)' })
  @ApiQuery({ name: 'take', required: false })
  async findPublished(@Query('take') take?: string) {
    return this.newsService.findPublishedArticles(take ? parseInt(take) : 10);
  }

  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'Xem chi tiết tin (public)' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  async findOnePublic(@Param('id') id: string) {
    return this.newsService.findOneArticle(id);
  }

  // =====================
  // CATEGORIES (Authenticated)
  // =====================

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('categories')
  @Permissions('NEWS_READ')
  @ApiOperation({ summary: 'Lấy danh sách danh mục' })
  async findAllCategories() {
    return this.newsService.findAllCategories();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('categories')
  @Permissions('NEWS_CREATE')
  @ApiOperation({ summary: 'Tạo danh mục' })
  async createCategory(@Body() dto: CreateNewsCategoryDto) {
    return this.newsService.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete('categories/:id')
  @Permissions('NEWS_DELETE')
  @ApiOperation({ summary: 'Xóa danh mục' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  async deleteCategory(@Param('id') id: string) {
    return this.newsService.deleteCategory(id);
  }

  // =====================
  // ARTICLES (Authenticated)
  // =====================

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('articles')
  @Permissions('NEWS_READ')
  @ApiOperation({ summary: 'Lấy tất cả tin' })
  async findAllArticles(@Query('isDeleted') isDeleted?: string) {
    return this.newsService.findAllArticles(false, isDeleted === 'true');
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('articles/:id')
  @Permissions('NEWS_READ')
  @ApiOperation({ summary: 'Xem chi tiết tin' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  async findOneArticle(@Param('id') id: string) {
    return this.newsService.findOneArticle(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('articles')
  @Permissions('NEWS_CREATE')
  @ApiOperation({ summary: 'Tạo tin mới' })
  async createArticle(@Request() req: any, @Body() dto: CreateNewsArticleDto) {
    return this.newsService.createArticle(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Put('articles/:id')
  @Permissions('NEWS_UPDATE')
  @ApiOperation({ summary: 'Cập nhật tin' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  async updateArticle(
    @Param('id') id: string,
    @Body() dto: UpdateNewsArticleDto,
  ) {
    return this.newsService.updateArticle(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('articles/:id/publish')
  @Permissions('NEWS_PUBLISH')
  @ApiOperation({ summary: 'Xuất bản tin' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  async publishArticle(@Param('id') id: string) {
    return this.newsService.publishArticle(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('articles/:id/unpublish')
  @Permissions('NEWS_PUBLISH')
  @ApiOperation({ summary: 'Gỡ xuất bản tin' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  async unpublishArticle(@Param('id') id: string) {
    return this.newsService.unpublishArticle(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete('articles/:id')
  @Permissions('NEWS_DELETE')
  @ApiOperation({ summary: 'Xóa mềm bài viết' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  async deleteArticle(@Param('id') id: string, @Request() req: any) {
    return this.newsService.deleteArticle(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('articles/:id/restore')
  @Permissions('NEWS_DELETE')
  @ApiOperation({ summary: 'Khôi phục bài viết đã xóa' })
  async restoreArticle(@Param('id') id: string) {
    return this.newsService.restoreArticle(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete('articles/:id/force')
  @Permissions('NEWS_DELETE')
  @ApiOperation({ summary: 'Xóa vĩnh viễn bài viết' })
  async forceDeleteArticle(@Param('id') id: string) {
    return this.newsService.forceDeleteArticle(id);
  }
}
