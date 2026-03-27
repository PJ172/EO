import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { ExcelService } from '../../shared/excel.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';

export interface OrgNode {
  id: string;
  name: string;
  code: string;
  manager: {
    fullName: string;
    employeeCode: string;
    jobTitle?: string;
  } | null;
  employeeCount: number;
}

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private excelService: ExcelService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Phân tích ID tiền tố (VD: "DEPARTMENT-uuid") thành Type và UUID thực tế
   */
  private parseNode(rawId: string | null) {
    if (!rawId) return { type: null, id: null };
    const dashIdx = rawId.indexOf('-');
    if (dashIdx === -1) return { type: 'EMPLOYEE', id: rawId };
    
    const possibleType = rawId.slice(0, dashIdx).toUpperCase();
    const id = rawId.slice(dashIdx + 1);

    if (['COMPANY', 'FACTORY', 'DIVISION', 'DEPARTMENT', 'SECTION', 'EMPLOYEE'].includes(possibleType)) {
      return { type: possibleType === 'EMPLOYEE' ? 'EMPLOYEE' : possibleType, id };
    }
    
    // Default to EMPLOYEE if the prefix isn't a known organizational unit 
    return { type: 'EMPLOYEE', id: rawId };
  }

  /**
   * Helper function cho Row-Level Security (RLS)
   * Lấy ID của department gốc (Hiện tại đang trả về chính nó, có thể mở rộng sau).
   */
  async getDescendantDepartmentIds(rootDeptId: string): Promise<string[]> {
    if (!rootDeptId) return [];
    return [rootDeptId];
  }

  async getOrgTree(): Promise<OrgNode[]> {
    const cacheKey = 'org_tree_data';
    const cachedData = await this.cacheManager.get<OrgNode[]>(cacheKey);
    if (cachedData) return cachedData;

    const departments = await this.prisma.department.findMany({
      where: { deletedAt: null, status: 'ACTIVE', showOnOrgChart: true },
      include: {
        manager: {
          where: { deletedAt: null },
          include: { jobTitle: true },
        },
        _count: {
          select: {
            employees: {
              where: { deletedAt: null, employmentStatus: { not: 'RESIGNED' } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = departments.map((dept) => ({
      id: `DEPARTMENT-${dept.id}`,
      name: dept.name,
      code: dept.code,
      manager: dept.manager
        ? {
            fullName: dept.manager.fullName,
            employeeCode: dept.manager.employeeCode,
            // Cascade: unit-level title > employee jobTitle
            jobTitle:
              dept.useManagerDisplayTitle && dept.managerDisplayTitle
                ? dept.managerDisplayTitle
                : dept.manager.jobTitle?.name,
          }
        : null,
      employeeCount: dept._count.employees,
    }));

    await this.cacheManager.set(cacheKey, result, 300000); // 5 minutes cache
    return result;
  }

  async getNextCode(
    type: string,
    requestedPrefix?: string,
  ): Promise<{ nextCode: string }> {
    if (!type) {
      throw new BadRequestException('Vui lòng cung cấp type');
    }

    const typeUpper = type.toUpperCase();
    const typeToPrefixMap: Record<string, string> = {
      COMPANY: 'CT',
      FACTORY: 'NM',
      DIVISION: 'KH',
      DEPARTMENT: 'PB',
      SECTION: 'BP',
      TEAM: 'BP',
      GROUP: 'BP',
      JOBTITLE: 'CV',
      JOB_TITLE: 'CV',
    };

    const prefixString = typeToPrefixMap[typeUpper] || requestedPrefix;
    if (!prefixString) {
      throw new BadRequestException(
        'Không thể xác định tiền tố cho đơn vị này',
      );
    }

    const prefixUpper = prefixString.toUpperCase().trim();
    let latestRecord: any = null;

    const baseQuery = {
      where: {
        code: { startsWith: prefixUpper, mode: 'default' },
        NOT: { code: { contains: '_DELETED_' } },
      },
      orderBy: { code: 'desc' },
      select: { code: true },
    } as any;

    if (typeUpper === 'COMPANY')
      latestRecord = await this.prisma.company.findFirst(baseQuery);
    else if (typeUpper === 'FACTORY')
      latestRecord = await this.prisma.factory.findFirst(baseQuery);
    else if (typeUpper === 'DIVISION')
      latestRecord = await this.prisma.division.findFirst(baseQuery);
    else if (typeUpper === 'DEPARTMENT')
      latestRecord = await this.prisma.department.findFirst(baseQuery);
    else if (['SECTION', 'TEAM', 'GROUP'].includes(typeUpper))
      latestRecord = await this.prisma.section.findFirst(baseQuery);
    else if (['JOBTITLE', 'JOB_TITLE'].includes(typeUpper))
      latestRecord = await this.prisma.jobTitle.findFirst(baseQuery);
    else throw new BadRequestException('Loại đơn vị không hợp lệ');

    if (!latestRecord || !latestRecord.code) {
      return { nextCode: `${prefixUpper}00001` };
    }

    const currentCode = latestRecord.code.toUpperCase();
    const numberPart = currentCode.replace(prefixUpper, '');
    const numericValue = parseInt(numberPart, 10);

    const nextNumericValue = (isNaN(numericValue) ? 0 : numericValue) + 1;
    const nextCodeString = nextNumericValue.toString().padStart(5, '0');

    return { nextCode: `${prefixUpper}${nextCodeString}` };
  }

  async findAll(params: {
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    isDeleted?: boolean;
    excludeFromFilters?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const skip = (page - 1) * limit;

    let orderBy: any = { createdAt: 'desc' };
    if (params.sort) {
      const direction = params.order || 'asc';
      if (params.sort === 'division')
        orderBy = [{ division: { name: direction } }, { id: 'asc' }];
      else if (params.sort === 'manager')
        orderBy = [{ manager: { fullName: direction } }, { id: 'asc' }];
      else
        orderBy = [{ [params.sort]: direction }, { id: 'asc' }];
    } else {
      orderBy = [{ createdAt: 'desc' }, { id: 'asc' }];
    }

    const where: any = { deletedAt: params.isDeleted ? { not: null } : null };
    if (params.excludeFromFilters !== undefined) {
      where.excludeFromFilters = params.excludeFromFilters === 'true';
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        include: {
          manager: {
            where: { deletedAt: null }
          },
          division: true,
          createdBy: { select: { username: true } },
          updatedBy: { select: { username: true } },
          _count: {
            select: {
              employees: {
                where: { deletedAt: null },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.department.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      include: {
        manager: {
          where: { deletedAt: null }
        },
        division: true,
        createdBy: { select: { username: true } },
      },
    });
  }

  async create(data: CreateOrganizationDto, userId?: string) {
    const createData: any = { ...data };
    if (userId) {
      createData.createdById = userId;
      createData.updatedById = userId;
    }
    const result = await this.prisma.department.create({ data: createData });
    await this.cacheManager.del('org_tree_data');
    await this.cacheManager.del('org_chart_structure');
    return result;
  }

  async update(id: string, data: UpdateOrganizationDto, userId?: string) {
    const updateData: any = { ...data };
    if (userId) updateData.updatedById = userId;
    const result = await this.prisma.department.update({ where: { id }, data: updateData });
    await this.cacheManager.del('org_tree_data');
    await this.cacheManager.del('org_chart_structure');
    return result;
  }

  async move(sourceId: string, targetId: string | null, userId?: string) {
    const source = this.parseNode(sourceId);
    const target = this.parseNode(targetId);

    if (source.id === target.id)
      throw new BadRequestException('Không thể chuyển vào chính nó');

    const updateData = { updatedById: userId } as any;

    switch (source.type) {
      case 'FACTORY':
        return this.prisma.factory.update({
          where: { id: source.id },
          data: {
            ...updateData,
            companyId: target.type === 'COMPANY' ? target.id : null,
          },
        });
      case 'DIVISION':
        return this.prisma.division.update({
          where: { id: source.id },
          data: {
            ...updateData,
            factoryId: target.type === 'FACTORY' ? target.id : null,
          },
        });
      case 'DEPARTMENT':
        return this.prisma.department.update({
          where: { id: source.id },
          data: {
            ...updateData,
            divisionId: target.type === 'DIVISION' ? target.id : null,
          },
        });
      case 'SECTION':
        return this.prisma.section.update({
          where: { id: source.id },
          data: {
            ...updateData,
            departmentId: target.type === 'DEPARTMENT' ? target.id : null,
          },
        });
      case 'EMPLOYEE': {
        const empUpdateData = { ...updateData };
        
        if (target.type === 'EMPLOYEE') {
           empUpdateData.managerEmployeeId = target.id;
        } else if (target.type === 'DEPARTMENT') {
           const dept = await this.prisma.department.findUnique({ where: { id: target.id } });
           empUpdateData.departmentId = target.id;
           empUpdateData.divisionId = dept?.divisionId;
           empUpdateData.companyId = dept?.companyId;
           empUpdateData.managerEmployeeId = dept?.managerEmployeeId || null;
        } else if (target.type === 'DIVISION') {
           const div = await this.prisma.division.findUnique({ where: { id: target.id } });
           empUpdateData.divisionId = target.id;
           empUpdateData.factoryId = div?.factoryId;
           empUpdateData.companyId = div?.companyId;
           empUpdateData.departmentId = null;
           empUpdateData.managerEmployeeId = div?.managerEmployeeId || null;
        } else if (target.type === 'FACTORY') {
           const fac = await this.prisma.factory.findUnique({ where: { id: target.id } });
           empUpdateData.factoryId = target.id;
           empUpdateData.companyId = fac?.companyId;
           empUpdateData.divisionId = null;
           empUpdateData.departmentId = null;
           empUpdateData.managerEmployeeId = fac?.managerEmployeeId || null;
        } else if (target.type === 'COMPANY') {
           empUpdateData.companyId = target.id;
           empUpdateData.factoryId = null;
           empUpdateData.divisionId = null;
           empUpdateData.departmentId = null;
           empUpdateData.managerEmployeeId = null;
        } else {
           // If target is null or unknown, unassign
           empUpdateData.managerEmployeeId = null;
        }

        const result = await this.prisma.employee.update({
          where: { id: source.id },
          data: empUpdateData,
        });

        // Invalidate caches
        if (result.departmentId) {
           await this.cacheManager.del(`org_chart_hierarchy:${result.departmentId}`);
           await this.cacheManager.del(`dept_org_chart:${result.departmentId}`);
        }
        await this.cacheManager.del(`org_chart_hierarchy:root`);
        await this.cacheManager.del('org_chart_structure');
        
        return result;
      }
      default:
        throw new BadRequestException('Loại đơn vị không hỗ trợ di chuyển');
    }
  }

  async saveNodePositionByChart(chartKey: string, nodeId: string, x: number, y: number) {
    return this.prisma.orgChartNodePosition.upsert({
      where: { chartKey_nodeId: { chartKey, nodeId } },
      update: { x, y },
      create: { chartKey, nodeId, x, y },
    });
  }

  async saveBulkNodePositionsByChart(
    chartKey: string,
    positions: { nodeId: string; x: number; y: number }[],
  ) {
    if (!chartKey) throw new BadRequestException('chartKey là bắt buộc');
    const updates = positions.map((pos) =>
      this.saveNodePositionByChart(chartKey, pos.nodeId, pos.x, pos.y),
    );
    try {
      await Promise.all(updates);
    } catch (error) {
      throw new BadRequestException('Lỗi khi lưu tọa độ: ' + (error.message || ''));
    }
    await this.cacheManager.del('org_chart_structure');
    return { success: true };
  }

  async getNodePositionsByChart(chartKey: string): Promise<Record<string, { x: number; y: number }>> {
    const records = await this.prisma.orgChartNodePosition.findMany({
      where: { chartKey },
    });
    const map: Record<string, { x: number; y: number }> = {};
    records.forEach((r) => { map[r.nodeId] = { x: r.x, y: r.y }; });
    return map;
  }

  // Legacy: kept for backward compatibility (single-node position on entity)
  async saveNodePosition(nodeId: string, x: number, y: number) {
    console.log(`[saveNodePosition] Received nodeId: ${nodeId}, x: ${x}, y: ${y}`);
    const node = this.parseNode(nodeId);
    console.log(`[saveNodePosition] Parsed node:`, node);

    if (!node.id) throw new BadRequestException('ID không hợp lệ');

    const updateData = { uiPositionX: x, uiPositionY: y } as any;

    switch (node.type) {
      case 'COMPANY':
        return this.prisma.company.update({ where: { id: node.id }, data: updateData });
      case 'FACTORY':
        return this.prisma.factory.update({ where: { id: node.id }, data: updateData });
      case 'DIVISION':
        return this.prisma.division.update({ where: { id: node.id }, data: updateData });
      case 'DEPARTMENT':
        return this.prisma.department.update({ where: { id: node.id }, data: updateData });
      case 'SECTION':
        return this.prisma.section.update({ where: { id: node.id }, data: updateData });
      case 'EMPLOYEE':
      case 'EMPLOYEENODE': {
        const emp = await this.prisma.employee.update({ where: { id: node.id }, data: updateData });
        if (emp.departmentId) {
          await this.cacheManager.del(`org_chart_hierarchy:${emp.departmentId}`);
          await this.cacheManager.del(`dept_org_chart:${emp.departmentId}`);
        }
        await this.cacheManager.del(`org_chart_hierarchy:root`);
        return emp;
      }
      default:
        throw new BadRequestException('Loại đơn vị không hỗ trợ lưu vị trí');
    }
  }

  async saveBulkNodePositions(
    positions: { nodeId: string; x: number; y: number }[],
  ) {
    console.log(`[saveBulkNodePositions] Received ${positions.length} positions.`);
    const updates = positions.map((pos) => this.saveNodePosition(pos.nodeId, pos.x, pos.y));
    try {
      await Promise.all(updates);
    } catch (error) {
      console.error(`[saveBulkNodePositions] FATAL ERROR during bulk save:`, error);
      throw new BadRequestException('Một hoặc nhiều vị trí lưu bị thất bại do lỗi CSDL: ' + (error.message || ''));
    }
    await this.cacheManager.del('org_chart_structure');
    return { success: true };
  }

  async delete(id: string, userId?: string) {
    const result = await this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId },
    });
    await this.cacheManager.del('org_tree_data');
    await this.cacheManager.del('org_chart_structure');
    return result;
  }

  async restore(id: string) {
    const result = await this.prisma.department.update({
      where: { id },
      data: { deletedAt: null, deletedById: null },
    });
    await this.cacheManager.del('org_tree_data');
    await this.cacheManager.del('org_chart_structure');
    return result;
  }

  async forceDelete(id: string) {
    return this.prisma.department.delete({ where: { id } });
  }

  async bulkDeleteSoft(ids: string[], userId?: string) {
    return this.prisma.department.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date(), deletedById: userId },
    });
  }

  async bulkDelete(ids: string[]) {
    return this.prisma.department.deleteMany({ where: { id: { in: ids } } });
  }

  async bulkUpdateShowOnOrgChart(type: string, showOnOrgChart: boolean) {
    console.log(`[bulkUpdateShowOnOrgChart] type: ${type}, show: ${showOnOrgChart}`);
    const typeUpper = type.toUpperCase();
    let result: any;

    if (typeUpper === 'COMPANY')
      result = await this.prisma.company.updateMany({ data: { showOnOrgChart } });
    else if (typeUpper === 'FACTORY')
      result = await this.prisma.factory.updateMany({ data: { showOnOrgChart } });
    else if (typeUpper === 'DIVISION')
      result = await this.prisma.division.updateMany({ data: { showOnOrgChart } });
    else if (typeUpper === 'DEPARTMENT')
      result = await this.prisma.department.updateMany({ data: { showOnOrgChart } });
    else if (['SECTION', 'TEAM', 'GROUP'].includes(typeUpper))
      result = await this.prisma.section.updateMany({ data: { showOnOrgChart } });
    else throw new BadRequestException('Loại đơn vị không hợp lệ');

    // Invalidate caches
    await this.cacheManager.del('org_tree_data');
    await this.cacheManager.del('org_chart_structure');

    return result;
  }

  // --- Org Chart Config ---

  async getOrgChartConfig() {
    let config = await this.prisma.orgChartConfig.findFirst();
    if (!config) {
      config = await this.prisma.orgChartConfig.create({
        data: {
          id: 'global-config',
          nodesep: 50,
          ranksep: 120,
          zoom: 0.85,
        }
      });
    }
    return config;
  }

  async saveOrgChartConfig(data: { nodesep?: number; ranksep?: number; zoom?: number; nodeDims?: any }, userId: string) {
    const existing = await this.prisma.orgChartConfig.findFirst();
    return this.prisma.orgChartConfig.upsert({
      where: { id: existing?.id || 'global-config' },
      update: {
        ...(data.nodesep !== undefined && { nodesep: data.nodesep }),
        ...(data.ranksep !== undefined && { ranksep: data.ranksep }),
        ...(data.zoom !== undefined && { zoom: data.zoom }),
        ...(data.nodeDims !== undefined && { nodeDims: data.nodeDims }),
        updatedById: userId,
      },
      create: {
        id: 'global-config',
        nodesep: data.nodesep ?? 50,
        ranksep: data.ranksep ?? 120,
        zoom: data.zoom ?? 0.85,
        nodeDims: data.nodeDims ?? {},
        updatedById: userId,
      }
    });
  }

  // --- Org Chart Matrix Overrides ---
  
  async getOverrides() {
    return this.prisma.orgChartOverride.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async addOverride(data: { employeeId: string; action: string; targetManagerId: string }, userId: string) {
    if (data.employeeId === data.targetManagerId) {
      throw new BadRequestException('Không thể liên kết nhân viên với chính họ');
    }

    // Upsert equivalent behavior for MOVE_NODE or HIDE_NODE (only 1 per action/employee usually)
    // To keep it simple, if MOVE_NODE we delete previous MOVE_NODEs for this employee
    if (data.action === 'MOVE_NODE' || data.action === 'HIDE_NODE') {
      await this.prisma.orgChartOverride.deleteMany({
        where: { employeeId: data.employeeId, action: data.action }
      });
    }

    const override = await this.prisma.orgChartOverride.create({
      data: {
        employeeId: data.employeeId,
        action: data.action,
        targetManagerId: data.targetManagerId,
        targetHandle: (data as any).targetHandle || 'top',
        createdById: userId,
      }
    });

    // Clear caches
    await this.cacheManager.del('org_chart_hierarchy:all:global-config');
    const emp = await this.prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (emp && emp.departmentId) {
       await this.cacheManager.del(`org_chart_hierarchy:${emp.departmentId}:global-config`);
       await this.cacheManager.del(`org-chart:dept:${emp.departmentId}:DEPT-${emp.departmentId}`);
    }

    return override;
  }

  async removeOverride(id: string) {
    const override = await this.prisma.orgChartOverride.delete({ where: { id } });
    
    // Clear caches
    await this.cacheManager.del('org_chart_hierarchy:all:global-config');
    const emp = await this.prisma.employee.findUnique({ where: { id: override.employeeId } });
    if (emp && emp.departmentId) {
       await this.cacheManager.del(`org_chart_hierarchy:${emp.departmentId}:global-config`);
       await this.cacheManager.del(`org-chart:dept:${emp.departmentId}:DEPT-${emp.departmentId}`);
    }

    return override;
  }
}

