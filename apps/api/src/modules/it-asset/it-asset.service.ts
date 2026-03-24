import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateAssetCategoryDto,
  CreateITAssetDto,
  UpdateITAssetDto,
  AssignAssetDto,
  ReturnAssetDto,
  CreateMaintenanceDto,
} from './dto/it-asset.dto';

@Injectable()
export class ITAssetService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // CATEGORIES
  // =====================

  async getCategories() {
    return this.prisma.assetCategory.findMany({
      include: { _count: { select: { assets: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateAssetCategoryDto) {
    return this.prisma.assetCategory.create({ data: dto });
  }

  async deleteCategory(id: string) {
    const cat = await this.prisma.assetCategory.findUnique({
      where: { id },
      include: { _count: { select: { assets: true } } },
    });
    if (!cat) throw new NotFoundException('Không tìm thấy danh mục');
    if (cat._count.assets > 0)
      throw new ConflictException('Danh mục đang có tài sản, không thể xóa');
    await this.prisma.assetCategory.delete({ where: { id } });
    return { success: true };
  }

  // =====================
  // ASSETS
  // =====================

  async findAll(params: {
    search?: string;
    categoryId?: string;
    status?: string;
    departmentId?: string;
    isDeleted?: boolean;
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      categoryId,
      status,
      departmentId,
      isDeleted = false,
      page = 1,
      limit = 20,
    } = params;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: isDeleted ? { not: null } : null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const [data, total] = await Promise.all([
      this.prisma.iTAsset.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          assignedTo: {
            select: { id: true, fullName: true, employeeCode: true },
          },
          department: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.iTAsset.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const asset = await this.prisma.iTAsset.findUnique({
      where: { id },
      include: {
        category: true,
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
        department: { select: { id: true, name: true } },
        assignments: {
          include: {
            employee: {
              select: { id: true, fullName: true, employeeCode: true },
            },
          },
          orderBy: { assignedDate: 'desc' },
        },
        maintenances: { orderBy: { scheduledDate: 'desc' } },
      },
    });
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');
    return asset;
  }

  async create(dto: CreateITAssetDto) {
    // Auto-generate code: ASSET-XXXXXX
    const count = await this.prisma.iTAsset.count();
    const code = `ASSET-${(count + 1).toString().padStart(6, '0')}`;

    return this.prisma.iTAsset.create({
      data: {
        code,
        name: dto.name,
        categoryId: dto.categoryId,
        brand: dto.brand,
        model: dto.model,
        serialNumber: dto.serialNumber,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchasePrice: dto.purchasePrice,
        warrantyEndDate: dto.warrantyEndDate
          ? new Date(dto.warrantyEndDate)
          : undefined,
        location: dto.location,
        specifications: dto.specifications,
        note: dto.note,
        departmentId: dto.departmentId,
      },
      include: { category: true },
    });
  }

  async update(id: string, dto: UpdateITAssetDto) {
    await this.findOne(id);
    return this.prisma.iTAsset.update({
      where: { id },
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        brand: dto.brand,
        model: dto.model,
        serialNumber: dto.serialNumber,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchasePrice: dto.purchasePrice,
        warrantyEndDate: dto.warrantyEndDate
          ? new Date(dto.warrantyEndDate)
          : undefined,
        status: dto.status as any,
        condition: dto.condition as any,
        location: dto.location,
        specifications: dto.specifications,
        note: dto.note,
        departmentId: dto.departmentId,
      },
      include: { category: true },
    });
  }

  async delete(id: string, userId?: string) {
    const asset = await this.findOne(id);
    if (asset.status === 'IN_USE')
      throw new BadRequestException('Không thể xóa tài sản đang sử dụng');
    const now = new Date();
    await this.prisma.iTAsset.update({
      where: { id },
      data: {
        code: `${asset.code}_DELETED_${now.getTime()}`,
        deletedAt: now,
        deletedById: userId || null,
        deletedBatchId: null,
      },
    });
    return { success: true };
  }

  async restore(id: string) {
    const asset = await this.prisma.iTAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');
    if (!asset.deletedAt) throw new Error('Tài sản chưa bị xóa');

    const originalCode = asset.code.replace(/_DELETED_\d+$/, '');

    return this.prisma.iTAsset.update({
      where: { id },
      data: {
        code: originalCode,
        deletedAt: null,
        deletedById: null,
        deletedBatchId: null,
      },
    });
  }

  async forceDelete(id: string) {
    const asset = await this.prisma.iTAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');
    if (!asset.deletedAt) throw new Error('Tài sản chưa bị xóa mềm');

    return this.prisma.iTAsset.delete({ where: { id } });
  }

  // =====================
  // QR CODE
  // =====================

  async generateQrCode(code: string) {
    const asset = await this.prisma.iTAsset.findUnique({ where: { code } });
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');

    // Default to localhost:3000 if FRONTEND_URL is not set
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const url = `${baseUrl}/q/asset/${code}`;

    try {
      const qrCode = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      return { qrCode, url, asset };
    } catch (err) {
      throw new BadRequestException('Không thể tạo mã QR');
    }
  }

  // =====================
  // ASSIGNMENT
  // =====================

  async assign(assetId: string, dto: AssignAssetDto) {
    const asset = await this.findOne(assetId);
    if (asset.status === 'IN_USE')
      throw new BadRequestException('Tài sản đang được sử dụng');
    if (asset.status === 'RETIRED')
      throw new BadRequestException('Tài sản đã thanh lý');

    await this.prisma.$transaction([
      this.prisma.assetAssignment.create({
        data: {
          assetId,
          employeeId: dto.employeeId,
          note: dto.note,
        },
      }),
      this.prisma.iTAsset.update({
        where: { id: assetId },
        data: { status: 'IN_USE', assignedToId: dto.employeeId },
      }),
    ]);

    return this.findOne(assetId);
  }

  async returnAsset(assetId: string, dto: ReturnAssetDto) {
    const asset = await this.findOne(assetId);
    if (asset.status !== 'IN_USE')
      throw new BadRequestException('Tài sản không ở trạng thái đang sử dụng');

    // Find active assignment
    const activeAssignment = await this.prisma.assetAssignment.findFirst({
      where: { assetId, returnedDate: null },
      orderBy: { assignedDate: 'desc' },
    });

    if (activeAssignment) {
      await this.prisma.assetAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          returnedDate: new Date(),
          conditionOnReturn: (dto.condition as any) || 'GOOD',
          note: dto.note
            ? `${activeAssignment.note || ''}\nTrả: ${dto.note}`
            : activeAssignment.note,
        },
      });
    }

    await this.prisma.iTAsset.update({
      where: { id: assetId },
      data: { status: 'AVAILABLE', assignedToId: null },
    });

    return this.findOne(assetId);
  }

  // =====================
  // MAINTENANCE
  // =====================

  async createMaintenance(dto: CreateMaintenanceDto) {
    return this.prisma.assetMaintenance.create({
      data: {
        assetId: dto.assetId,
        type: dto.type as any,
        scheduledDate: new Date(dto.scheduledDate),
        cost: dto.cost,
        vendor: dto.vendor,
        description: dto.description,
      },
      include: { asset: true },
    });
  }

  async completeMaintenance(id: string) {
    return this.prisma.assetMaintenance.update({
      where: { id },
      data: { status: 'COMPLETED', completedDate: new Date() },
    });
  }

  // =====================
  // STATISTICS
  // =====================

  async getStatistics() {
    const [total, byStatus, byCategory, recentAssignments] = await Promise.all([
      this.prisma.iTAsset.count(),
      this.prisma.iTAsset.groupBy({ by: ['status'], _count: true }),
      this.prisma.iTAsset.groupBy({ by: ['categoryId'], _count: true }),
      this.prisma.assetAssignment.findMany({
        take: 10,
        orderBy: { assignedDate: 'desc' },
        include: {
          asset: { select: { code: true, name: true } },
          employee: { select: { fullName: true, employeeCode: true } },
        },
      }),
    ]);

    // Get category names
    const categories = await this.prisma.assetCategory.findMany();
    const categoryMap = Object.fromEntries(
      categories.map((c) => [c.id, c.name]),
    );

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byCategory: byCategory.map((c) => ({
        category: categoryMap[c.categoryId] || c.categoryId,
        count: c._count,
      })),
      recentAssignments,
    };
  }
}
