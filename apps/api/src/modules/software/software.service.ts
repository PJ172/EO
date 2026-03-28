import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateSoftwareDto,
  UpdateSoftwareDto,
  InstallSoftwareDto,
} from './dto/software.dto';

@Injectable()
export class SoftwareService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // SOFTWARE CRUD
  // =====================

  async findAll(params: {
    search?: string;
    licenseType?: string;
    status?: string;
    vendor?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, licenseType, status, vendor, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { licenseKey: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (licenseType) where.licenseType = licenseType;
    if (status) where.status = status;
    if (vendor) where.vendor = { contains: vendor, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.software.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { installations: true } },
          installations: {
            where: { removedDate: null },
            select: { id: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.software.count({ where }),
    ]);

    // Compute active installs count
    const enriched = data.map((sw) => ({
      ...sw,
      activeInstalls: sw.installations.length,
      totalInstalls: sw._count.installations,
      installations: undefined, // Remove raw installations from list response
    }));

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const sw = await this.prisma.software.findUnique({
      where: { id },
      include: {
        installations: {
          include: {
            asset: {
              select: {
                id: true,
                code: true,
                name: true,
                assetType: true,
                hostname: true,
                assignedTo: { select: { id: true, fullName: true } },
                department: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { installedDate: 'desc' },
        },
        _count: { select: { installations: true } },
      },
    });
    if (!sw) throw new NotFoundException('Không tìm thấy phần mềm');

    const activeInstalls = sw.installations.filter((i) => !i.removedDate).length;

    return { ...sw, activeInstalls };
  }

  async create(dto: CreateSoftwareDto) {
    return this.prisma.software.create({
      data: {
        name: dto.name,
        vendor: dto.vendor,
        version: dto.version,
        licenseType: (dto.licenseType as any) || 'FREE',
        licenseKey: dto.licenseKey,
        maxInstalls: dto.maxInstalls,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        cost: dto.cost,
        note: dto.note,
      },
    });
  }

  async update(id: string, dto: UpdateSoftwareDto) {
    await this.findOne(id);
    return this.prisma.software.update({
      where: { id },
      data: {
        name: dto.name,
        vendor: dto.vendor,
        version: dto.version,
        licenseType: dto.licenseType as any,
        licenseKey: dto.licenseKey,
        maxInstalls: dto.maxInstalls,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        cost: dto.cost,
        status: dto.status,
        note: dto.note,
      },
    });
  }

  async delete(id: string) {
    const sw = await this.findOne(id);
    const activeInstalls = sw.installations.filter((i) => !i.removedDate);
    if (activeInstalls.length > 0) {
      throw new BadRequestException(
        `Phần mềm đang cài trên ${activeInstalls.length} thiết bị. Hãy gỡ tất cả trước khi xóa.`,
      );
    }
    await this.prisma.software.delete({ where: { id } });
    return { success: true };
  }

  // =====================
  // INSTALLATION TRACKING
  // =====================

  async installSoftware(dto: InstallSoftwareDto) {
    // Verify software and asset exist
    const [sw, asset] = await Promise.all([
      this.prisma.software.findUnique({ where: { id: dto.softwareId } }),
      this.prisma.iTAsset.findUnique({ where: { id: dto.assetId } }),
    ]);
    if (!sw) throw new NotFoundException('Không tìm thấy phần mềm');
    if (!asset) throw new NotFoundException('Không tìm thấy thiết bị');

    // Check if already installed on this asset
    const existing = await this.prisma.softwareInstallation.findFirst({
      where: {
        softwareId: dto.softwareId,
        assetId: dto.assetId,
        removedDate: null,
      },
    });
    if (existing) {
      throw new ConflictException('Phần mềm đã được cài trên thiết bị này');
    }

    // Check license limit
    if (sw.maxInstalls) {
      const activeCount = await this.prisma.softwareInstallation.count({
        where: { softwareId: dto.softwareId, removedDate: null },
      });
      if (activeCount >= sw.maxInstalls) {
        throw new BadRequestException(
          `Đã đạt giới hạn license (${sw.maxInstalls} máy). Cần mua thêm license hoặc gỡ bớt.`,
        );
      }
    }

    return this.prisma.softwareInstallation.create({
      data: {
        softwareId: dto.softwareId,
        assetId: dto.assetId,
        version: dto.version || sw.version,
        installedBy: dto.installedBy || 'ADMIN',
        isAuthorized: dto.isAuthorized ?? true,
        detectedBy: dto.detectedBy || 'MANUAL',
        note: dto.note,
      },
      include: {
        software: { select: { name: true, vendor: true } },
        asset: { select: { code: true, name: true, hostname: true } },
      },
    });
  }

  async uninstallSoftware(installationId: string, note?: string) {
    const installation = await this.prisma.softwareInstallation.findUnique({
      where: { id: installationId },
    });
    if (!installation) throw new NotFoundException('Không tìm thấy bản cài đặt');
    if (installation.removedDate) {
      throw new BadRequestException('Phần mềm đã được gỡ trước đó');
    }

    return this.prisma.softwareInstallation.update({
      where: { id: installationId },
      data: {
        removedDate: new Date(),
        note: note
          ? `${installation.note || ''}\nGỡ: ${note}`.trim()
          : installation.note,
      },
    });
  }

  async toggleAuthorized(installationId: string) {
    const installation = await this.prisma.softwareInstallation.findUnique({
      where: { id: installationId },
    });
    if (!installation) throw new NotFoundException('Không tìm thấy bản cài đặt');

    return this.prisma.softwareInstallation.update({
      where: { id: installationId },
      data: { isAuthorized: !installation.isAuthorized },
    });
  }

  // =====================
  // STATISTICS
  // =====================

  async getStatistics() {
    const [
      totalSoftware,
      byLicenseType,
      byStatus,
      totalInstallations,
      unauthorizedCount,
      topInstalled,
      expiringLicenses,
    ] = await Promise.all([
      this.prisma.software.count(),
      this.prisma.software.groupBy({ by: ['licenseType'], _count: true }),
      this.prisma.software.groupBy({ by: ['status'], _count: true }),
      this.prisma.softwareInstallation.count({ where: { removedDate: null } }),
      this.prisma.softwareInstallation.count({
        where: { removedDate: null, isAuthorized: false },
      }),
      this.prisma.software.findMany({
        take: 10,
        include: {
          _count: { select: { installations: true } },
          installations: { where: { removedDate: null }, select: { id: true } },
        },
        orderBy: { installations: { _count: 'desc' } },
      }),
      this.prisma.software.findMany({
        where: {
          expiryDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);

    return {
      totalSoftware,
      totalInstallations,
      unauthorizedCount,
      byLicenseType: byLicenseType.map((l) => ({
        type: l.licenseType,
        count: l._count,
      })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      topInstalled: topInstalled.map((sw) => ({
        id: sw.id,
        name: sw.name,
        vendor: sw.vendor,
        activeInstalls: sw.installations.length,
        totalInstalls: sw._count.installations,
      })),
      expiringLicenses,
    };
  }

  // =====================
  // COMPLIANCE CHECK
  // =====================

  async getComplianceReport() {
    const software = await this.prisma.software.findMany({
      where: { maxInstalls: { not: null } },
      include: {
        installations: {
          where: { removedDate: null },
          select: { id: true },
        },
      },
    });

    const overLicensed = software.filter(
      (sw) => sw.maxInstalls && sw.installations.length > sw.maxInstalls,
    );

    const nearLimit = software.filter(
      (sw) =>
        sw.maxInstalls &&
        sw.installations.length >= sw.maxInstalls * 0.8 &&
        sw.installations.length <= sw.maxInstalls,
    );

    const expired = await this.prisma.software.findMany({
      where: {
        expiryDate: { lt: new Date() },
        status: 'ACTIVE',
      },
    });

    return {
      overLicensed: overLicensed.map((sw) => ({
        id: sw.id,
        name: sw.name,
        maxInstalls: sw.maxInstalls,
        currentInstalls: sw.installations.length,
        overBy: sw.installations.length - (sw.maxInstalls || 0),
      })),
      nearLimit: nearLimit.map((sw) => ({
        id: sw.id,
        name: sw.name,
        maxInstalls: sw.maxInstalls,
        currentInstalls: sw.installations.length,
        remaining: (sw.maxInstalls || 0) - sw.installations.length,
      })),
      expired: expired.map((sw) => ({
        id: sw.id,
        name: sw.name,
        expiryDate: sw.expiryDate,
      })),
    };
  }
}
