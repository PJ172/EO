import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateNewsCategoryDto,
  CreateNewsArticleDto,
  UpdateNewsArticleDto,
} from './dto/news.dto';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  // =====================
  // CATEGORIES
  // =====================

  async findAllCategories() {
    return this.prisma.newsCategory.findMany({
      include: {
        _count: { select: { articles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateNewsCategoryDto) {
    const existing = await this.prisma.newsCategory.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Danh mục đã tồn tại');

    return this.prisma.newsCategory.create({
      data: { name: dto.name },
    });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.newsCategory.findUnique({
      where: { id },
      include: { _count: { select: { articles: true } } },
    });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    if (category._count.articles > 0) {
      throw new ConflictException('Không thể xóa danh mục có bài viết');
    }

    await this.prisma.newsCategory.delete({ where: { id } });
    return { success: true };
  }

  // =====================
  // ARTICLES
  // =====================

  async findAllArticles(onlyPublished = false, isDeleted = false) {
    const where: any = { deletedAt: isDeleted ? { not: null } : null };
    if (onlyPublished) {
      where.isPublished = true;
    }

    return this.prisma.newsArticle.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublishedArticles(take = 10) {
    return this.prisma.newsArticle.findMany({
      where: { isPublished: true, deletedAt: null },
      include: { category: true },
      orderBy: { publishedAt: 'desc' },
      take,
    });
  }

  async findOneArticle(id: string) {
    const article = await this.prisma.newsArticle.findFirst({
      where: { id, deletedAt: null },
      include: { category: true },
    });
    if (!article) throw new NotFoundException('Không tìm thấy bài viết');
    return article;
  }

  async createArticle(authorId: string, dto: CreateNewsArticleDto) {
    return this.prisma.newsArticle.create({
      data: {
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        thumbnail: dto.thumbnail,
        categoryId: dto.categoryId,
        authorId,
        isPublished: dto.isPublished || false,
        publishedAt: dto.isPublished ? new Date() : null,
      },
      include: { category: true },
    });
  }

  async updateArticle(id: string, dto: UpdateNewsArticleDto) {
    await this.findOneArticle(id);

    const updateData: any = {
      title: dto.title,
      summary: dto.summary,
      content: dto.content,
      thumbnail: dto.thumbnail,
      categoryId: dto.categoryId,
    };

    if (dto.isPublished !== undefined) {
      updateData.isPublished = dto.isPublished;
      if (dto.isPublished) {
        updateData.publishedAt = new Date();
      }
    }

    return this.prisma.newsArticle.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  }

  async publishArticle(id: string) {
    await this.findOneArticle(id);
    return this.prisma.newsArticle.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
      include: { category: true },
    });
  }

  async unpublishArticle(id: string) {
    await this.findOneArticle(id);
    return this.prisma.newsArticle.update({
      where: { id },
      data: { isPublished: false },
      include: { category: true },
    });
  }

  async deleteArticle(id: string, userId?: string) {
    await this.findOneArticle(id);
    const now = new Date();
    await this.prisma.newsArticle.update({
      where: { id },
      data: {
        deletedAt: now,
        deletedById: userId || null,
        deletedBatchId: null,
      },
    });
    return { success: true };
  }

  async restoreArticle(id: string) {
    const article = await this.prisma.newsArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Bài viết không tồn tại');
    if (!article.deletedAt) throw new Error('Bài viết chưa bị xóa');

    return this.prisma.newsArticle.update({
      where: { id },
      data: { deletedAt: null, deletedById: null, deletedBatchId: null },
      include: { category: true },
    });
  }

  async forceDeleteArticle(id: string) {
    const article = await this.prisma.newsArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Bài viết không tồn tại');
    if (!article.deletedAt) throw new Error('Bài viết chưa bị xóa mềm');

    return this.prisma.newsArticle.delete({ where: { id } });
  }
}
