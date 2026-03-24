import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpdateTrashConfigDto {
  @IsOptional()
  @IsNumber()
  retentionDays?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

// Default configs seed data
const DEFAULT_CONFIGS = [
  {
    moduleKey: 'employees',
    moduleName: 'Nhân sự',
    retentionDays: 90,
    isEnabled: true,
  },
  {
    moduleKey: 'departments',
    moduleName: 'Phòng ban / Tổ chức',
    retentionDays: 90,
    isEnabled: true,
  },
  {
    moduleKey: 'users',
    moduleName: 'Tài khoản người dùng',
    retentionDays: 90,
    isEnabled: true,
  },
  {
    moduleKey: 'jobTitles',
    moduleName: 'Chức vụ',
    retentionDays: 30,
    isEnabled: true,
  },
  {
    moduleKey: 'factories',
    moduleName: 'Nhà máy',
    retentionDays: 30,
    isEnabled: true,
  },
  {
    moduleKey: 'documents',
    moduleName: 'Tài liệu / Quy trình',
    retentionDays: 30,
    isEnabled: true,
  },
  {
    moduleKey: 'projects',
    moduleName: 'Dự án',
    retentionDays: 30,
    isEnabled: true,
  },
  {
    moduleKey: 'tasks',
    moduleName: 'Công việc',
    retentionDays: 30,
    isEnabled: true,
  },
  {
    moduleKey: 'newsArticles',
    moduleName: 'Bảng tin',
    retentionDays: 14,
    isEnabled: true,
  },
  {
    moduleKey: 'itAssets',
    moduleName: 'Tài sản IT',
    retentionDays: 14,
    isEnabled: true,
  },
  {
    moduleKey: 'tickets',
    moduleName: 'Ticket IT',
    retentionDays: 14,
    isEnabled: true,
  },
  {
    moduleKey: 'roles',
    moduleName: 'Vai trò hệ thống',
    retentionDays: 0,
    isEnabled: false,
  },
  { moduleKey: 'kpi', moduleName: 'KPI', retentionDays: 30, isEnabled: true },
  {
    moduleKey: 'files',
    moduleName: 'Tệp đính kèm',
    retentionDays: 30,
    isEnabled: true,
  },
];

@Injectable()
export class TrashConfigService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.upsertDefaults();
  }

  async upsertDefaults() {
    for (const config of DEFAULT_CONFIGS) {
      await this.prisma.trashRetentionConfig.upsert({
        where: { moduleKey: config.moduleKey },
        create: config,
        update: {}, // Don't overwrite if already exists
      });
    }
  }

  async findAll() {
    return this.prisma.trashRetentionConfig.findMany({
      orderBy: { moduleKey: 'asc' },
      include: {
        updatedBy: {
          select: { id: true, username: true },
        },
      },
    });
  }

  async findOne(moduleKey: string) {
    return this.prisma.trashRetentionConfig.findUnique({
      where: { moduleKey },
    });
  }

  async update(moduleKey: string, dto: UpdateTrashConfigDto, userId?: string) {
    return this.prisma.trashRetentionConfig.upsert({
      where: { moduleKey },
      create: {
        moduleKey,
        moduleName: moduleKey,
        retentionDays: dto.retentionDays ?? 30,
        isEnabled: dto.isEnabled ?? true,
        updatedById: userId,
      },
      update: {
        ...(dto.retentionDays !== undefined && {
          retentionDays: dto.retentionDays,
        }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
        updatedById: userId,
      },
    });
  }
}
