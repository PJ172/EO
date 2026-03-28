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
    assetType?: string;
    departmentId?: string;
    location?: string;
    condition?: string;
    isDeleted?: boolean;
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      categoryId,
      status,
      assetType,
      departmentId,
      location,
      condition,
      isDeleted = false,
      page = 1,
      limit = 50,
    } = params;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: isDeleted ? { not: null } : null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { hostname: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (assetType) where.assetType = assetType;
    if (departmentId) where.departmentId = departmentId;
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (condition) where.condition = condition;

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
          _count: { select: { softwareInstalls: true, maintenances: true } },
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
        softwareInstalls: {
          where: { removedDate: null },
          include: {
            software: { select: { id: true, name: true, vendor: true, version: true, licenseType: true } },
          },
          orderBy: { installedDate: 'desc' },
        },
      },
    });
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');
    return asset;
  }

  async create(dto: CreateITAssetDto) {
    const count = await this.prisma.iTAsset.count();
    const code = `ASSET-${(count + 1).toString().padStart(6, '0')}`;

    return this.prisma.iTAsset.create({
      data: {
        code,
        name: dto.name,
        categoryId: dto.categoryId,
        assetType: dto.assetType,
        brand: dto.brand,
        model: dto.model,
        serialNumber: dto.serialNumber,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchasePrice: dto.purchasePrice,
        warrantyEndDate: dto.warrantyEndDate
          ? new Date(dto.warrantyEndDate)
          : undefined,
        location: dto.location,
        ipAddress: dto.ipAddress,
        macAddress: dto.macAddress,
        hostname: dto.hostname,
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
        assetType: dto.assetType,
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
        ipAddress: dto.ipAddress,
        macAddress: dto.macAddress,
        hostname: dto.hostname,
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
    const where = { deletedAt: null };
    const [total, byStatus, byCategory, byAssetType, recentAssignments] = await Promise.all([
      this.prisma.iTAsset.count({ where }),
      this.prisma.iTAsset.groupBy({ by: ['status'], _count: true, where }),
      this.prisma.iTAsset.groupBy({ by: ['categoryId'], _count: true, where }),
      this.prisma.iTAsset.groupBy({ by: ['assetType'], _count: true, where }),
      this.prisma.assetAssignment.findMany({
        take: 10,
        orderBy: { assignedDate: 'desc' },
        include: {
          asset: { select: { code: true, name: true } },
          employee: { select: { fullName: true, employeeCode: true } },
        },
      }),
    ]);

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
      byAssetType: byAssetType.map((t) => ({
        assetType: t.assetType || 'UNKNOWN',
        count: t._count,
      })),
      recentAssignments,
    };
  }

  // =====================
  // WARRANTY ALERTS
  // =====================

  async getWarrantyAlerts(days: number = 90) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.prisma.iTAsset.findMany({
      where: {
        deletedAt: null,
        warrantyEndDate: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        category: true,
        assignedTo: { select: { id: true, fullName: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { warrantyEndDate: 'asc' },
    });
  }

  // =====================
  // DASHBOARD STATS
  // =====================

  async getDashboardStats() {
    const where = { deletedAt: null };

    const [total, byStatus, byAssetType, byCondition, byDepartment, warrantyAlerts, recentAssets] = await Promise.all([
      this.prisma.iTAsset.count({ where }),
      this.prisma.iTAsset.groupBy({ by: ['status'], _count: true, where }),
      this.prisma.iTAsset.groupBy({ by: ['assetType'], _count: true, where }),
      this.prisma.iTAsset.groupBy({ by: ['condition'], _count: true, where }),
      this.prisma.iTAsset.groupBy({
        by: ['departmentId'],
        _count: true,
        where: { ...where, departmentId: { not: null } },
      }),
      this.getWarrantyAlerts(90),
      this.prisma.iTAsset.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          assignedTo: { select: { fullName: true } },
        },
      }),
    ]);

    // Get department names
    const deptIds = byDepartment.map((d) => d.departmentId).filter(Boolean) as string[];
    const departments = deptIds.length > 0
      ? await this.prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } })
      : [];
    const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byAssetType: byAssetType.map((t) => ({ type: t.assetType || 'OTHER', count: t._count })),
      byCondition: byCondition.map((c) => ({ condition: c.condition, count: c._count })),
      byDepartment: byDepartment.map((d) => ({
        department: deptMap[d.departmentId!] || 'N/A',
        count: d._count,
      })),
      warrantyAlerts: warrantyAlerts.length,
      warrantyAlertsList: warrantyAlerts,
      recentAssets,
    };
  }

  // =====================
  // UNIFIED DASHBOARD SUMMARY (single API call)
  // =====================

  async getDashboardSummary() {
    const where = { deletedAt: null };
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 90);

    // Categories for name lookup
    const categoriesPromise = this.prisma.assetCategory.findMany({ select: { id: true, name: true } });

    const [
      total,
      byStatus,
      byAssetType,
      byCondition,
      byCategory,
      byDepartment,
      warrantyAlerts,
      recentAssets,
      categories,
    ] = await Promise.all([
      this.prisma.iTAsset.count({ where }),
      this.prisma.iTAsset.groupBy({ by: ['status'], _count: true, where }),
      this.prisma.iTAsset.groupBy({ by: ['assetType'], _count: true, where }),
      this.prisma.iTAsset.groupBy({ by: ['condition'], _count: true, where }),
      this.prisma.iTAsset.groupBy({ by: ['categoryId'], _count: true, where }),
      this.prisma.iTAsset.groupBy({
        by: ['departmentId'],
        _count: true,
        where: { ...where, departmentId: { not: null } },
      }),
      this.prisma.iTAsset.findMany({
        where: {
          deletedAt: null,
          warrantyEndDate: { gte: now, lte: futureDate },
        },
        include: {
          category: true,
          assignedTo: { select: { id: true, fullName: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { warrantyEndDate: 'asc' },
      }),
      this.prisma.iTAsset.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          assignedTo: { select: { fullName: true } },
        },
      }),
      categoriesPromise,
    ]);

    // Lookup maps
    const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    const deptIds = byDepartment.map((d) => d.departmentId).filter(Boolean) as string[];
    const departments = deptIds.length > 0
      ? await this.prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } })
      : [];
    const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byAssetType: byAssetType.map((t) => ({ assetType: t.assetType || 'OTHER', type: t.assetType || 'OTHER', count: t._count })),
      byCondition: byCondition.map((c) => ({ condition: c.condition, count: c._count })),
      byCategory: byCategory.map((c) => ({ category: categoryMap[c.categoryId] || c.categoryId, count: c._count })),
      byDepartment: byDepartment.map((d) => ({
        department: deptMap[d.departmentId!] || 'N/A',
        count: d._count,
      })),
      warrantyAlerts: warrantyAlerts.length,
      warrantyAlertsList: warrantyAlerts,
      recentAssets,
    };
  }
}
