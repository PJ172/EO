import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKPIPeriodDto, UpdateKPIPeriodDto } from './dto/kpi-period.dto';
import {
  CreateEmployeeKPIDto,
  UpdateEmployeeKPIDto,
  KPIItemDto,
} from './dto/employee-kpi.dto';
import { KPIStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ExcelService, ExcelColumn } from '../../shared/excel.service';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã gửi',
  REVIEWED: 'Đã đánh giá',
  FINALIZED: 'Đã chốt',
};

@Injectable()
export class KPIService {
  constructor(
    private prisma: PrismaService,
    private excelService: ExcelService,
  ) {}

  // =====================
  // KPI PERIODS
  // =====================

  async findAllPeriods() {
    return this.prisma.kPIPeriod.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: { kpis: true },
        },
      },
    });
  }

  async findActivePeriod() {
    return this.prisma.kPIPeriod.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOnePeriod(id: string) {
    return this.prisma.kPIPeriod.findUnique({
      where: { id },
      include: {
        _count: { select: { kpis: true } },
      },
    });
  }

  async createPeriod(dto: CreateKPIPeriodDto) {
    return this.prisma.kPIPeriod.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updatePeriod(id: string, dto: UpdateKPIPeriodDto) {
    const period = await this.prisma.kPIPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException('Không tìm thấy kỳ đánh giá');

    return this.prisma.kPIPeriod.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  async deletePeriod(id: string) {
    const period = await this.prisma.kPIPeriod.findUnique({
      where: { id },
      include: { _count: { select: { kpis: true } } },
    });
    if (!period) throw new NotFoundException('Không tìm thấy kỳ đánh giá');
    if (period._count.kpis > 0) {
      throw new BadRequestException('Không thể xóa kỳ đánh giá đã có KPI');
    }

    await this.prisma.kPIPeriod.delete({ where: { id } });
    return { success: true, message: 'Đã xóa kỳ đánh giá' };
  }

  // =====================
  // EMPLOYEE KPIs
  // =====================

  async findEmployeeKPIs(employeeId: string, isDeleted: boolean = false) {
    return this.prisma.employeeKPI.findMany({
      where: { employeeId, deletedAt: isDeleted ? { not: null } : null },
      include: {
        period: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findKPIsByPeriod(periodId: string, isDeleted: boolean = false) {
    const kpis = await this.prisma.employeeKPI.findMany({
      where: { periodId, deletedAt: isDeleted ? { not: null } : null },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch employee data for each KPI
    const employeeIds = kpis.map((k) => k.employeeId);
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: { department: true },
    });

    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    return kpis.map((kpi) => ({
      ...kpi,
      employee: employeeMap.get(kpi.employeeId) || null,
    }));
  }

  async findOneEmployeeKPI(id: string) {
    const kpi = await this.prisma.employeeKPI.findFirst({
      where: { id, deletedAt: null },
      include: {
        period: true,
        items: true,
      },
    });
    if (!kpi) throw new NotFoundException('Không tìm thấy KPI');
    return kpi;
  }

  async createEmployeeKPI(dto: CreateEmployeeKPIDto) {
    // Check if already exists
    const existing = await this.prisma.employeeKPI.findUnique({
      where: {
        employeeId_periodId: {
          employeeId: dto.employeeId,
          periodId: dto.periodId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Nhân viên đã có KPI trong kỳ này');
    }

    // Validate total weight = 100
    const totalWeight = dto.items.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight !== 100) {
      throw new BadRequestException(
        `Tổng trọng số phải bằng 100% (hiện tại: ${totalWeight}%)`,
      );
    }

    return this.prisma.employeeKPI.create({
      data: {
        employeeId: dto.employeeId,
        periodId: dto.periodId,
        status: KPIStatus.DRAFT,
        items: {
          create: dto.items.map((item) => ({
            name: item.name,
            target: item.target,
            actual: item.actual,
            weight: item.weight,
            score: item.score,
            comment: item.comment,
          })),
        },
      },
      include: {
        period: true,
        items: true,
      },
    });
  }

  async updateEmployeeKPI(id: string, dto: UpdateEmployeeKPIDto) {
    const kpi = await this.findOneEmployeeKPI(id);

    if (kpi.status === KPIStatus.FINALIZED) {
      throw new BadRequestException('KPI đã được chốt, không thể sửa');
    }

    if (dto.items) {
      // Validate total weight
      const totalWeight = dto.items.reduce((sum, item) => sum + item.weight, 0);
      if (totalWeight !== 100) {
        throw new BadRequestException(
          `Tổng trọng số phải bằng 100% (hiện tại: ${totalWeight}%)`,
        );
      }

      // Delete old items and create new
      await this.prisma.kPIItem.deleteMany({ where: { employeeKpiId: id } });

      await this.prisma.kPIItem.createMany({
        data: dto.items.map((item) => ({
          employeeKpiId: id,
          name: item.name,
          target: item.target,
          actual: item.actual,
          weight: item.weight,
          score: item.score,
          comment: item.comment,
        })),
      });
    }

    // Calculate total score
    const items = await this.prisma.kPIItem.findMany({
      where: { employeeKpiId: id },
    });
    const totalScore = items.reduce((sum, item) => {
      if (item.score != null) {
        return sum + (item.score * item.weight) / 100;
      }
      return sum;
    }, 0);

    return this.prisma.employeeKPI.update({
      where: { id },
      data: {
        totalScore: new Decimal(totalScore.toFixed(2)),
      },
      include: {
        period: true,
        items: true,
      },
    });
  }

  async submitKPI(id: string, userId: string) {
    const kpi = await this.findOneEmployeeKPI(id);

    if (kpi.status !== KPIStatus.DRAFT) {
      throw new BadRequestException('KPI đã được gửi hoặc đã chốt');
    }

    return this.prisma.employeeKPI.update({
      where: { id },
      data: {
        status: KPIStatus.SUBMITTED,
      },
      include: { period: true, items: true },
    });
  }

  async reviewKPI(id: string, evaluatorId: string) {
    const kpi = await this.findOneEmployeeKPI(id);

    if (kpi.status !== KPIStatus.SUBMITTED) {
      throw new BadRequestException('KPI chưa được gửi hoặc đã xử lý');
    }

    return this.prisma.employeeKPI.update({
      where: { id },
      data: {
        status: KPIStatus.REVIEWED,
        evaluatorId,
      },
      include: { period: true, items: true },
    });
  }

  async finalizeKPI(id: string, evaluatorId: string) {
    const kpi = await this.findOneEmployeeKPI(id);

    if (kpi.status === KPIStatus.FINALIZED) {
      throw new BadRequestException('KPI đã được chốt');
    }

    // Calculate final score
    const items = await this.prisma.kPIItem.findMany({
      where: { employeeKpiId: id },
    });
    const totalScore = items.reduce((sum, item) => {
      if (item.score != null) {
        return sum + (item.score * item.weight) / 100;
      }
      return sum;
    }, 0);

    return this.prisma.employeeKPI.update({
      where: { id },
      data: {
        status: KPIStatus.FINALIZED,
        evaluatorId,
        totalScore: new Decimal(totalScore.toFixed(2)),
      },
      include: { period: true, items: true },
    });
  }

  async deleteEmployeeKPI(id: string, deletedById?: string) {
    const kpi = await this.findOneEmployeeKPI(id);

    if (kpi.status === KPIStatus.FINALIZED) {
      throw new BadRequestException('KPI đã được chốt, không thể xóa');
    }

    // Soft delete
    await this.prisma.employeeKPI.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: deletedById || null,
      },
    });
    return { success: true, message: 'Đã chuyển KPI vào thùng rác' };
  }

  async restoreEmployeeKPI(id: string) {
    const kpi = await this.prisma.employeeKPI.findUnique({ where: { id } });
    if (!kpi) throw new NotFoundException('Không tìm thấy KPI');
    if (!kpi.deletedAt) throw new Error('KPI chưa bị xóa');

    return this.prisma.employeeKPI.update({
      where: { id },
      data: { deletedAt: null, deletedById: null },
      include: { period: true, items: true },
    });
  }

  async forceDeleteEmployeeKPI(id: string) {
    const kpi = await this.prisma.employeeKPI.findUnique({ where: { id } });
    if (!kpi) throw new NotFoundException('Không tìm thấy KPI');
    if (!kpi.deletedAt) throw new Error('KPI chưa bị xóa mềm');

    return this.prisma.employeeKPI.delete({ where: { id } });
  }

  // =====================
  // REPORTS
  // =====================

  async getKPISummary(periodId: string) {
    const kpis = await this.prisma.employeeKPI.findMany({
      where: { periodId },
      include: { items: true },
    });

    const stats = {
      total: kpis.length,
      draft: kpis.filter((k) => k.status === KPIStatus.DRAFT).length,
      submitted: kpis.filter((k) => k.status === KPIStatus.SUBMITTED).length,
      reviewed: kpis.filter((k) => k.status === KPIStatus.REVIEWED).length,
      finalized: kpis.filter((k) => k.status === KPIStatus.FINALIZED).length,
      averageScore: 0,
    };

    const finalizedKPIs = kpis.filter(
      (k) => k.status === KPIStatus.FINALIZED && k.totalScore,
    );
    if (finalizedKPIs.length > 0) {
      const sum = finalizedKPIs.reduce((s, k) => s + Number(k.totalScore), 0);
      stats.averageScore = Math.round((sum / finalizedKPIs.length) * 100) / 100;
    }

    return stats;
  }

  // =====================
  // EXCEL EXPORT
  // =====================

  async exportToExcel(periodId: string): Promise<Buffer> {
    const period = await this.findOnePeriod(periodId);
    if (!period) throw new NotFoundException('Không tìm thấy kỳ đánh giá');

    const kpisWithEmployees = await this.findKPIsByPeriod(periodId);

    // Sheet 1: Summary
    const summaryColumns: ExcelColumn[] = [
      { header: 'Mã NV', key: 'employeeCode', width: 15 },
      { header: 'Họ tên', key: 'fullName', width: 25 },
      { header: 'Phòng ban', key: 'department', width: 20 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Tổng điểm', key: 'totalScore', width: 12 },
    ];

    const summaryData = kpisWithEmployees.map((kpi: any) => ({
      employeeCode: kpi.employee?.employeeCode || '',
      fullName: kpi.employee?.fullName || '',
      department: kpi.employee?.department?.name || '',
      status: STATUS_LABELS[kpi.status] || kpi.status,
      totalScore:
        kpi.totalScore !== null ? Number(kpi.totalScore).toFixed(1) : '-',
    }));

    // Sheet 2: Details with all KPI items
    const detailColumns: ExcelColumn[] = [
      { header: 'Mã NV', key: 'employeeCode', width: 15 },
      { header: 'Họ tên', key: 'fullName', width: 25 },
      { header: 'Chỉ tiêu', key: 'kpiName', width: 30 },
      { header: 'Mục tiêu', key: 'target', width: 20 },
      { header: 'Kết quả', key: 'actual', width: 20 },
      { header: 'Trọng số (%)', key: 'weight', width: 12 },
      { header: 'Điểm', key: 'score', width: 10 },
      { header: 'Nhận xét', key: 'comment', width: 30 },
    ];

    const detailData: any[] = [];
    for (const kpi of kpisWithEmployees as any[]) {
      for (const item of kpi.items || []) {
        detailData.push({
          employeeCode: kpi.employee?.employeeCode || '',
          fullName: kpi.employee?.fullName || '',
          kpiName: item.name,
          target: item.target || '',
          actual: item.actual || '',
          weight: item.weight,
          score: item.score !== null ? item.score : '-',
          comment: item.comment || '',
        });
      }
    }

    return this.excelService.exportMultiSheetExcel([
      {
        sheetName: `Tổng hợp - ${period.name}`,
        columns: summaryColumns,
        data: summaryData,
      },
      {
        sheetName: 'Chi tiết KPI',
        columns: detailColumns,
        data: detailData,
      },
    ]);
  }
}
