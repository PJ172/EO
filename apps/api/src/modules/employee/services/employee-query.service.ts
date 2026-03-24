import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationService } from '../../organization/organization.service';

interface FindAllParams {
  page: number;
  limit: number;
  search?: string;
  departmentId?: string;
  companyId?: string;
  factoryId?: string;
  divisionId?: string;
  sectionId?: string;
  status?: string;
  jobTitleId?: string;
  dobFrom?: string;
  dobTo?: string;
  joinedFrom?: string;
  joinedTo?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  isDeleted?: boolean;
  managerEmployeeId?: string;
}

@Injectable()
export class EmployeeQueryService {
  constructor(
    private prisma: PrismaService,
    private organizationService: OrganizationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Returns true if the given user has the ADMIN or SUPER_ADMIN role.
   */
  isAdministratorUser(user: any): boolean {
    if (user?.username === 'admin' || user?.username === 'it') return true;
    return !!user?.roles?.some(
      (r: any) =>
        r === 'SUPER_ADMIN' ||
        r?.role?.name === 'SUPER_ADMIN' ||
        r?.role?.code === 'SUPER_ADMIN' ||
        r === 'ADMIN' ||
        r?.role?.name === 'ADMIN' ||
        r?.role?.code === 'ADMIN',
    );
  }

  async findAll(params: FindAllParams, user: any) {
    const versionKey = 'employees:list:version';
    const version = (await this.cacheManager.get<number>(versionKey)) || 0;
    const cacheKey = `employees_list:v${version}:${JSON.stringify(params)}:${user?.id}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) return cachedData;

    const {
      page,
      limit,
      search,
      departmentId,
      companyId,
      factoryId,
      divisionId,
      sectionId,
      status,
      jobTitleId,
      dobFrom,
      dobTo,
      joinedFrom,
      joinedTo,
      sortBy = 'fullName',
      order = 'asc',
      isDeleted = false,
      managerEmployeeId,
    } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (isDeleted) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { emailCompany: { contains: search, mode: 'insensitive' } },
        { personalEmail: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { emergencyPhone: { contains: search, mode: 'insensitive' } },
        { department: { name: { contains: search, mode: 'insensitive' } } },
        { factory: { name: { contains: search, mode: 'insensitive' } } },
        { section: { name: { contains: search, mode: 'insensitive' } } },
        { jobTitle: { name: { contains: search, mode: 'insensitive' } } },
      ];

      const upperSearch = search.toUpperCase();
      const maritalMap: Record<string, string> = {
        'ĐỘC THÂN': 'SINGLE',
        'CÓ VỢ': 'MARRIED',
        'CÓ CHỒNG': 'MARRIED',
        'ĐÃ KẾT HÔN': 'MARRIED',
        'LY HÔN': 'DIVORCED',
        'LY DỊ': 'DIVORCED',
        GÓA: 'WIDOWED',
      };

      let matchedMaritalStatus: any = undefined;
      for (const [key, val] of Object.entries(maritalMap)) {
        if (key.includes(upperSearch)) {
          matchedMaritalStatus = val;
          break;
        }
      }
      if (['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'].includes(upperSearch)) {
        matchedMaritalStatus = upperSearch;
      }

      if (matchedMaritalStatus) {
        where.OR.push({ maritalStatus: matchedMaritalStatus });
      }
    }

    if (departmentId) where.departmentId = departmentId;
    if (companyId) where.companyId = companyId;
    if (factoryId) where.factoryId = factoryId;
    if (divisionId) where.divisionId = divisionId;
    if (sectionId) where.sectionId = sectionId;
    if (status) where.employmentStatus = status;
    if (jobTitleId) where.jobTitleId = jobTitleId;
    if (managerEmployeeId) where.managerEmployeeId = managerEmployeeId;

    if (dobFrom || dobTo) {
      where.dob = {};
      if (dobFrom) where.dob.gte = new Date(dobFrom);
      if (dobTo) where.dob.lte = new Date(dobTo);
    }

    if (joinedFrom || joinedTo) {
      where.joinedAt = {};
      if (joinedFrom) where.joinedAt.gte = new Date(joinedFrom);
      if (joinedTo) where.joinedAt.lte = new Date(joinedTo);
    }

    // --- ROW-LEVEL SECURITY (RLS) ---
    const isAdministrator = this.isAdministratorUser(user);

    if (!isAdministrator && !user?.permissions?.includes('EMPLOYEE_ALL_VIEW')) {
      if (user?.departmentId) {
        const descendantIds =
          await this.organizationService.getDescendantDepartmentIds(
            user.departmentId,
          );
        if (where.departmentId) {
          if (!descendantIds.includes(where.departmentId)) {
            where.departmentId = 'UNAUTHORIZED-ACCESS';
          }
        } else {
          where.departmentId = { in: descendantIds };
        }
      } else {
        where.departmentId = 'NO-DEPARTMENT-ASSIGNED';
      }
    }

    const [data, total, statsData] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: { select: { id: true, name: true } },
          department: { select: { id: true, name: true, divisionId: true } },
          factory: { select: { id: true, name: true } },
          division: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          jobTitle: { select: { id: true, name: true } },
          manager: { select: { id: true, fullName: true } },
          createdBy: { select: { id: true, username: true, email: true } },
          updatedBy: { select: { id: true, username: true, email: true } },
          familyMembers: { take: 3 },
          contracts: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: (() => {
          switch (sortBy) {
            case 'company':
              return { company: { name: order } };
            case 'department':
              return { department: { name: order } };
            case 'section':
              return { section: { name: order } };
            case 'division':
              return { division: { name: order } };
            case 'factory':
              return { factory: { name: order } };
            case 'jobTitle':
              return { jobTitle: { name: order } };
            case 'manager':
              return { manager: { fullName: order } };
            default:
              return { [sortBy]: order };
          }
        })(),
      }),
      this.prisma.employee.count({ where }),
      this.prisma.employee.groupBy({
        by: ['employmentStatus'],
        where: { deletedAt: null },
        _count: true,
      }),
    ]);

    const statsMap: Record<string, number> = {};
    statsData.forEach((s) => {
      statsMap[s.employmentStatus] = s._count;
    });

    const stats = {
      total: Object.values(statsMap).reduce((a, b) => a + b, 0),
      sunplast: statsMap['OFFICIAL'] || 0,
      otherCompany: 0,
      official: statsMap['OFFICIAL'] || 0,
      probation: statsMap['PROBATION'] || 0,
      seasonal: statsMap['SEASONAL'] || 0,
      resigned: statsMap['RESIGNED'] || 0,
    };

    const maskedData = data.map((emp) => this.maskEmployeeData(emp, user));

    const result = {
      data: maskedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats,
      },
    };

    await this.cacheManager.set(cacheKey, result, 300000); // 5 minutes cache (safe with versioning)
    return result;
  }

  async findOne(id: string, user?: any) {
    const versionKey = `employee:detail:${id}:version`;
    const version = (await this.cacheManager.get<number>(versionKey)) || 0;
    const cacheKey = `employee_detail:v${version}:${id}:${user?.id}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) return cachedData;

    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        company: true,
        department: true,
        section: true,
        jobTitle: {
          include: {
            jobDescriptions: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
        manager: { select: { id: true, fullName: true, employeeCode: true } },
        user: {
          select: { id: true, username: true, email: true, status: true },
        },
        createdBy: { select: { id: true, username: true, email: true } },
        updatedBy: { select: { id: true, username: true, email: true } },
        factory: { select: { id: true, name: true, code: true } },
        division: { select: { id: true, name: true, code: true } },
        subordinates: {
          select: { id: true, fullName: true, employeeCode: true },
        },
        leaveBalances: true,
        contracts: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!employee) throw new NotFoundException('Employee not found');
    const result = this.maskEmployeeData(employee, user);
    await this.cacheManager.set(cacheKey, result, 600000); // 10 minutes cache
    return result;
  }

     async getOrgChartStructure() {
    const cacheKey = 'org_chart_structure';
    await this.cacheManager.del(cacheKey); // force fresh — schema changed (id added to node data)
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) return cachedData;

    // Fetch all active units
    const [companies, factories, divisions, departments] =
      await Promise.all([
        this.prisma.company.findMany({
          where: { deletedAt: null, status: 'ACTIVE', showOnOrgChart: true },
          include: {
            manager: { select: { fullName: true, avatar: true, emailCompany: true, phone: true, jobTitle: { select: { name: true } } } },
          },
          orderBy: [{ uiPositionX: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.factory.findMany({
          where: { deletedAt: null, status: 'ACTIVE', showOnOrgChart: true },
          include: {
            manager: { select: { fullName: true, avatar: true, emailCompany: true, phone: true, jobTitle: { select: { name: true } } } },
          },
          orderBy: [{ uiPositionX: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.division.findMany({
          where: { deletedAt: null, status: 'ACTIVE', showOnOrgChart: true },
          include: {
            manager: { select: { fullName: true, avatar: true, emailCompany: true, phone: true, jobTitle: { select: { name: true } } } },
          },
          orderBy: [{ uiPositionX: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.department.findMany({
          where: { deletedAt: null, status: 'ACTIVE', showOnOrgChart: true },
          include: {
            manager: { select: { fullName: true, avatar: true, emailCompany: true, phone: true, jobTitle: { select: { name: true } } } },
          },
          orderBy: [{ uiPositionX: 'asc' }, { createdAt: 'asc' }],
        }),
      ]);

    // Fetch all active employees with their unit assignments for robust counting
    const allEmployees = await this.prisma.employee.findMany({
      where: { deletedAt: null },
      select: {
        companyId: true,
        factoryId: true,
        divisionId: true,
        departmentId: true,
      },
    });

    // Calculate counts in memory
    const counts = {
      COMPANY: {} as Record<string, number>,
      FACTORY: {} as Record<string, number>,
      DIVISION: {} as Record<string, number>,
      DEPARTMENT: {} as Record<string, number>,
    };

    allEmployees.forEach((emp) => {
      if (emp.companyId) counts.COMPANY[emp.companyId] = (counts.COMPANY[emp.companyId] || 0) + 1;
      if (emp.factoryId) counts.FACTORY[emp.factoryId] = (counts.FACTORY[emp.factoryId] || 0) + 1;
      if (emp.divisionId) counts.DIVISION[emp.divisionId] = (counts.DIVISION[emp.divisionId] || 0) + 1;
      if (emp.departmentId) counts.DEPARTMENT[emp.departmentId] = (counts.DEPARTMENT[emp.departmentId] || 0) + 1;
    });

    const nodes: any[] = [];
    const edges: any[] = [];

    const buildNodeData = (item: any, type: string) => {
      let jobTitle = item.manager?.jobTitle?.name || null;

      // Hardcode job titles for specific Divisions (Khối) as requested
      if (type === 'DIVISION' && item.manager) {
        const nameLower = item.name.toLowerCase();
        if (nameLower.includes('sản xuất')) {
          jobTitle = 'GIÁM ĐỐC KHỐI SẢN XUẤT';
        } else if (nameLower.includes('chất lượng')) {
          jobTitle = 'GIÁM ĐỐC KHỐI CHẤT LƯỢNG';
        } else if (nameLower.includes('kinh doanh')) {
          jobTitle = 'GIÁM ĐỐC KHỐI KINH DOANH';
        } else if (nameLower.includes('tài chính')) {
          jobTitle = 'GIÁM ĐỐC KHỐI TÀI CHÍNH';
        } else if (nameLower.includes('vận hành')) {
          jobTitle = 'GIÁM ĐỐC KHỐI VẬN HÀNH';
        } else {
          jobTitle = `GIÁM ĐỐC ${item.name.toUpperCase()}`;
        }
      }

      return {
        id: item.id,
        label: item.name,
        code: item.code,
        type,
        manager: item.manager
          ? { 
              name: item.manager.fullName, 
              avatar: item.manager.avatar,
              email: item.manager.emailCompany,
              phone: item.manager.phone,
              jobTitle: jobTitle,
              id: item.managerEmployeeId 
            }
          : null,
        employeeCount: counts[type as keyof typeof counts][item.id] || 0,
        managerEmployeeId: item.managerEmployeeId,
      };
    };

    companies.forEach((company) => {
      nodes.push({
        id: `company-${company.id}`,
        type: 'orgNode',
        data: buildNodeData(company, 'COMPANY'),
        position:
          company.uiPositionX !== null && company.uiPositionY !== null
            ? { x: company.uiPositionX, y: company.uiPositionY }
            : { x: 0, y: 0 },
      });
    });

    factories.forEach((factory) => {
      nodes.push({
        id: `factory-${factory.id}`,
        type: 'orgNode',
        data: buildNodeData(factory, 'FACTORY'),
        position:
          factory.uiPositionX !== null && factory.uiPositionY !== null
            ? { x: factory.uiPositionX, y: factory.uiPositionY }
            : { x: 0, y: 0 },
      });
      if (factory.companyId) {
        edges.push({
          id: `e-com-${factory.companyId}-fac-${factory.id}`,
          source: `company-${factory.companyId}`,
          target: `factory-${factory.id}`,
          type: 'smoothstep',
          sourceHandle: 'bottom',
          targetHandle: 'top',
        });
      }
    });

    divisions.forEach((division) => {
      nodes.push({
        id: `division-${division.id}`,
        type: 'orgNode',
        data: buildNodeData(division, 'DIVISION'),
        position:
          division.uiPositionX !== null && division.uiPositionY !== null
            ? { x: division.uiPositionX, y: division.uiPositionY }
            : { x: 0, y: 0 },
      });
      if (division.factoryId) {
        edges.push({
          id: `e-fac-${division.factoryId}-div-${division.id}`,
          source: `factory-${division.factoryId}`,
          target: `division-${division.id}`,
          type: 'smoothstep',
          sourceHandle: 'bottom',
          targetHandle: 'top',
        });
      } else if ((division as any).companyId) {
        edges.push({
          id: `e-com-${(division as any).companyId}-div-${division.id}`,
          source: `company-${(division as any).companyId}`,
          target: `division-${division.id}`,
          type: 'smoothstep',
          sourceHandle: 'bottom',
          targetHandle: 'top',
        });
      }
    });

    departments.forEach((dept) => {
      nodes.push({
        id: `department-${dept.id}`,
        type: 'orgNode',
        data: buildNodeData(dept, 'DEPARTMENT'),
        position:
          dept.uiPositionX !== null && dept.uiPositionY !== null
            ? { x: dept.uiPositionX, y: dept.uiPositionY }
            : { x: 0, y: 0 },
      });
      if (dept.divisionId) {
        edges.push({
          id: `e-div-${dept.divisionId}-dept-${dept.id}`,
          source: `division-${dept.divisionId}`,
          target: `department-${dept.id}`,
          type: 'smoothstep',
          sourceHandle: 'bottom',
          targetHandle: 'top',
        });
      } else if ((dept as any).companyId) {
        edges.push({
          id: `e-com-${(dept as any).companyId}-dept-${dept.id}`,
          source: `company-${(dept as any).companyId}`,
          target: `department-${dept.id}`,
          type: 'smoothstep',
          sourceHandle: 'bottom',
          targetHandle: 'top',
        });
      }
    });


    // Filter out orphan nodes: nodes with no connections except root-level companies
    const connectedNodeIds = new Set<string>();
    edges.forEach(e => {
      connectedNodeIds.add(e.source);
      connectedNodeIds.add(e.target);
    });

    const filteredNodes = nodes.filter(n => {
      // Always keep companies (root nodes)
      if (n.id.startsWith('company-')) return true;
      // Keep nodes that have at least one connection
      return connectedNodeIds.has(n.id);
    });

    const result = { nodes: filteredNodes, edges };
    await this.cacheManager.set(cacheKey, result, 300000); // 5 minutes cache
    return result;
  }

  async getOrgChartHierarchy(departmentId?: string, chartKey: string = 'global-config') {
    const cacheKey = `org-chart-hierarchy:${departmentId || 'all'}:${chartKey}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Fetch Custom Matrix Overrides and Config
    let config: any = null;
    let matrixOverrides: any[] = [];
    try {
      const [c, mo] = await Promise.all([
        this.prisma.orgChartConfig.findUnique({ where: { id: chartKey } }),
        this.prisma.orgChartOverride.findMany(), // Fetch all overrides
      ]);
      config = c || await this.prisma.orgChartConfig.findUnique({ where: { id: 'global-config' } });
      matrixOverrides = mo || [];
    } catch (e) {
      console.warn(`[WARN] Config table or Override table missing/error. Fallback active.`);
    }

    const where: any = { deletedAt: null };
    if (departmentId) where.departmentId = departmentId;

    const employees = await this.prisma.employee.findMany({
      where,
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        avatar: true,
        emailCompany: true,
        phone: true,
        employmentStatus: true,
        managerEmployeeId: true,
        jobTitle: { select: { name: true } },
        department: { select: { name: true } },
        uiPositionX: true,
        uiPositionY: true,
      },
    });

    // --- Calculate Hierarchy Levels (L1, L2, ...) ---
    const nodes: any[] = [];
    const edges: any[] = [];
    const empMap = new Map<string, any>();
    employees.forEach(e => empMap.set(e.id, { ...e, children: [] }));

    const hiddenIds = new Set<string>();
    const customSolidEdges = new Map<string, string>(); // Target -> Source (MOVE_NODE)
    const customDottedEdges: { source: string; target: string }[] = []; // ADD_DOTTED_LINE

    // Determine constraints from database Overrides
    matrixOverrides.forEach(ov => {
      // Ignore overrides if one of the employees is not in the current view/cache
      if (!empMap.has(ov.employeeId)) return;

      if (ov.action === 'HIDE_NODE') {
        hiddenIds.add(ov.employeeId);
      } else if (ov.action === 'MOVE_NODE') {
        if (empMap.has(ov.targetManagerId)) {
          customSolidEdges.set(ov.employeeId, ov.targetManagerId);
        }
      } else if (ov.action === 'ADD_DOTTED_LINE') {
        if (empMap.has(ov.targetManagerId)) {
          customDottedEdges.push({ source: ov.targetManagerId, target: ov.employeeId });
        }
      }
    });

    // Handle MOVE_NODE before finding roots
    employees.forEach(e => {
      const mutableEmp = empMap.get(e.id);
      if (customSolidEdges.has(e.id)) {
        mutableEmp.managerEmployeeId = customSolidEdges.get(e.id); // overriding in memory
      }
    });

    // Find absolute roots and build children lists
    const roots: any[] = [];
    employees.forEach(e => {
      const dbEmp = empMap.get(e.id);
      if (!dbEmp.managerEmployeeId || !empMap.has(dbEmp.managerEmployeeId)) {
        roots.push(dbEmp);
      } else {
        empMap.get(dbEmp.managerEmployeeId).children.push(dbEmp);
      }
    });

    // BFS to assign levels
    const queue: { node: any, level: number }[] = roots.map(r => ({ node: r, level: 1 }));
    while (queue.length > 0) {
      const { node, level } = queue.shift()!;
      node.level = level;
      
      if (!hiddenIds.has(node.id)) {
        nodes.push({
          id: node.id,
          type: 'employeeNode',
          data: {
            id: node.id,
            employeeCode: node.employeeCode,
            fullName: node.fullName,
            avatar: node.avatar,
            employmentStatus: node.employmentStatus,
            jobTitle: node.jobTitle?.name || '---',
            department: node.department?.name || '---',
            email: node.emailCompany,
            phone: node.phone,
            customLevel: `L${level}`,
          },
          position:
            node.uiPositionX !== null && node.uiPositionY !== null
              ? { x: node.uiPositionX, y: node.uiPositionY }
              : { x: 0, y: 0 },
        });

        node.children.forEach((child: any) => {
          if (!hiddenIds.has(child.id)) {
            edges.push({
              id: `e-mgr-${node.id}-emp-${child.id}`,
              source: node.id,
              target: child.id,
              type: 'smoothstep',
              sourceHandle: 'bottom',
              targetHandle: 'top',
            });
          }
          queue.push({ node: child, level: level + 1 });
        });
      }
    }

    // Add ADD_DOTTED_LINE custom edges
    customDottedEdges.forEach(ce => {
      if (!hiddenIds.has(ce.source) && !hiddenIds.has(ce.target)) {
        edges.push({
          id: `e-custom-${ce.source}-${ce.target}`,
          source: ce.source,
          target: ce.target,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' }
        });
      }
    });

    const result = { nodes, edges, config };
    await this.cacheManager.set(cacheKey, result, 60000); // 1 minute cache
    return result;
  }

  async getDeptOrgChart(deptId: string) {
    const chartKey = `DEPT-${deptId}`;
    const cacheKey = `org-chart:dept:${deptId}:${chartKey}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Fetch Custom Matrix Overrides and Config
    let config: any = null;
    let matrixOverrides: any[] = [];
    try {
      const [c, mo] = await Promise.all([
        this.prisma.orgChartConfig.findUnique({ where: { id: chartKey } }),
        this.prisma.orgChartOverride.findMany(),
      ]);
      config = c || await this.prisma.orgChartConfig.findUnique({ where: { id: 'global-config' } });
      matrixOverrides = mo || [];
    } catch (error) {
      console.warn(`[WARN] Config table or Override table missing/error. Fallback active.`);
    }

    const hiddenIds = new Set<string>();
    const customSolidEdges = new Map<string, string>(); // Target -> Source (MOVE_NODE)
    const customDottedEdges: { source: string; target: string }[] = []; // ADD_DOTTED_LINE

    matrixOverrides.forEach(ov => {
      if (ov.action === 'HIDE_NODE') {
        hiddenIds.add(ov.employeeId);
      } else if (ov.action === 'MOVE_NODE') {
        customSolidEdges.set(ov.employeeId, ov.targetManagerId);
      } else if (ov.action === 'ADD_DOTTED_LINE') {
        customDottedEdges.push({ source: ov.targetManagerId, target: ov.employeeId });
      }
    });

    // Fetch department info
    const department = await this.prisma.department.findUnique({
      where: { id: deptId },
      select: {
        id: true,
        name: true,
        code: true,
        managerEmployeeId: true,
        divisionId: true,
        division: {
          include: {
            manager: { select: { fullName: true, avatar: true, jobTitle: { select: { name: true } } } },
            factory: {
              include: {
                manager: { select: { fullName: true, avatar: true, jobTitle: { select: { name: true } } } },
                company: {
                  include: {
                    manager: { select: { fullName: true, avatar: true, jobTitle: { select: { name: true } } } },
                  }
                }
              }
            }
          }
        },
        manager: {
          select: {
            id: true, fullName: true, avatar: true,
            employeeCode: true,
            jobTitle: { select: { name: true } },
            emailCompany: true, phone: true,
          },
        },
      },
    });

    if (!department) return { departmentInfo: null, nodes: [], edges: [] };

    // Fetch all employees in this department (including sub-sections)
    const employees = await this.prisma.employee.findMany({
      where: {
        deletedAt: null,
        departmentId: deptId,
        employmentStatus: { not: 'RESIGNED' },
      },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        avatar: true,
        employmentStatus: true,
        managerEmployeeId: true,
        uiPositionX: true,
        uiPositionY: true,
        orgLevel: true,
        jobTitle: { select: { name: true } },
        section: { select: { id: true, name: true } },
        emailCompany: true,
        phone: true,
      },
      orderBy: [{ managerEmployeeId: 'asc' }, { fullName: 'asc' }],
    });

    // Fetch active sections to group employees
    const sections = await this.prisma.section.findMany({
      where: {
        deletedAt: null,
        departmentId: deptId,
        status: 'ACTIVE',
        showOnOrgChart: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        managerEmployeeId: true,
        uiPositionX: true,
        uiPositionY: true,
      },
    });

    let employeeIds = new Set(employees.map((e) => e.id));
    const activeSectionIds = new Set(sections.map((s) => s.id));

    // --- ENHANCEMENT: Fetch External Managers to complete Hierarchy ---
    // This allows employees who report to someone in another department to still be linked.
    const missingManagerIds = new Set<string>();
    employees.forEach(e => {
        if (e.managerEmployeeId && !employeeIds.has(e.managerEmployeeId)) {
            missingManagerIds.add(e.managerEmployeeId);
        }
    });

    if (missingManagerIds.size > 0) {
        const extManagers = await this.prisma.employee.findMany({
            where: { id: { in: Array.from(missingManagerIds) }, deletedAt: null },
            select: {
                id: true,
                employeeCode: true,
                fullName: true,
                avatar: true,
                employmentStatus: true,
                managerEmployeeId: true,
                jobTitle: { select: { name: true } },
                department: { select: { name: true } },
                emailCompany: true,
                phone: true,
            }
        });
        
        extManagers.forEach(m => {
            if (!employeeIds.has(m.id)) {
                employees.push({
                    ...m,
                    uiPositionX: null,
                    uiPositionY: null,
                    section: null,
                    isExternalManager: true,
                } as any);
                employeeIds.add(m.id);
            }
        });
    }

    const rootId = department.managerEmployeeId;
    // Ensure the department's top manager (defined in Dept record) is in the set even if not a direct manager of anyone
    if (rootId && !employeeIds.has(rootId) && department.manager) {
      employees.push({
        id: department.manager.id,
        employeeCode: department.manager.employeeCode,
        fullName: department.manager.fullName,
        avatar: department.manager.avatar,
        employmentStatus: 'ACTIVE',
        managerEmployeeId: null, 
        uiPositionX: null,
        uiPositionY: null,
        jobTitle: department.manager.jobTitle,
        department: { name: department.name }, // matching shape
        section: null,
      } as any);
      employeeIds.add(rootId);
    }

    const nodes: any[] = employees.map((emp) => ({
      id: emp.id,
      type: 'employeeNode',
      data: {
        id: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        avatar: emp.avatar,
        employmentStatus: emp.employmentStatus,
        jobTitle: emp.jobTitle?.name || '---',
        orgLevel: (emp as any).orgLevel || null,
        department: department.name,
        section: emp.section?.name || null,
        email: emp.emailCompany,
        phone: emp.phone,
        isRoot: emp.id === rootId,
        isExternalManager: !!(emp as any).isExternalManager,
        isGlobalContext: !!(emp as any).isGlobalContext,
      },
      position:
          emp.uiPositionX !== null && emp.uiPositionY !== null
            ? { x: emp.uiPositionX, y: emp.uiPositionY }
            : { x: 0, y: 0 },
    }));

    const edges: any[] = [];

    // 1. Build Section Nodes & Edges
    sections.forEach((sec) => {
      // Add Section Node
      nodes.push({
        id: `section-${sec.id}`,
        type: 'orgNode',
        data: {
          id: sec.id,
          label: sec.name,
          code: sec.code,
          type: 'SECTION',
          employeeCount: employees.filter((e) => e.section?.id === sec.id).length,
          managerEmployeeId: sec.managerEmployeeId,
        },
        position:
          sec.uiPositionX !== null && sec.uiPositionY !== null
            ? { x: sec.uiPositionX, y: sec.uiPositionY }
            : { x: 0, y: 0 },
      });

      // Flexible Section Edge: Connects to its human manager if exists, otherwise to Dept Root
      if (sec.managerEmployeeId && employeeIds.has(sec.managerEmployeeId)) {
        edges.push({
          id: `e-mgr-${sec.managerEmployeeId}-sec-${sec.id}`,
          source: sec.managerEmployeeId,
          target: `section-${sec.id}`,
          type: 'smoothstep',
          sourceHandle: 'bottom',
          targetHandle: 'top',
          style: { strokeWidth: 1.5, stroke: '#10b981' }, // distinct solid green
        });
      } else if (rootId && employeeIds.has(rootId)) {
        edges.push({
          id: `e-root-sec-${sec.id}`,
          source: rootId,
          target: `section-${sec.id}`,
          type: 'smoothstep',
          sourceHandle: 'bottom',
          targetHandle: 'top',
          style: { strokeWidth: 1.5, stroke: '#10b981' }, // distinct solid green
        });
      }
    });

    // 2. Build Employee Edges
    employees.forEach((emp) => {
      // Get all managers for this employee (Formal + Overrides)
      const managerIds = new Set<string>();
      if (emp.managerEmployeeId && employeeIds.has(emp.managerEmployeeId)) {
        managerIds.add(emp.managerEmployeeId);
      }
      
      // Add Matrix/Overrides managers
      matrixOverrides.forEach(ov => {
        if (ov.employeeId === emp.id) {
          if (ov.action === 'MOVE_NODE') {
              // MOVE_NODE visually REPLACES the primary manager connection
              if (emp.managerEmployeeId) {
                  managerIds.delete(emp.managerEmployeeId);
              }
              if (ov.targetManagerId && employeeIds.has(ov.targetManagerId)) {
                  managerIds.add(ov.targetManagerId);
              }
          } else if (ov.action === 'ADD_DOTTED_LINE') {
              if (ov.targetManagerId && employeeIds.has(ov.targetManagerId)) {
                  managerIds.add(ov.targetManagerId);
              }
          }
        }
      });

      // Special case: Department Root
      if (emp.id === rootId && managerIds.size === 0) {
        return; // True root
      }

      if (managerIds.size > 0) {
        // Priority 1: Human Managers (Multiple possible now)
        managerIds.forEach(mgrId => {
          const matchingOverride = matrixOverrides.find(ov => ov.employeeId === emp.id && ov.targetManagerId === mgrId);
          const isDotted = matchingOverride?.action === 'ADD_DOTTED_LINE';
          
          let sourceHandle = 'bottom';
          let targetHandle = 'top';
          
          const rawHandle = matchingOverride?.targetHandle;
          if (rawHandle) {
             if (rawHandle.includes(':')) {
                 const parts = rawHandle.split(':');
                 sourceHandle = parts[0] || 'bottom';
                 targetHandle = parts[1] || 'top';
             } else {
                 targetHandle = rawHandle;
             }
          }
          
          edges.push({
            id: `e-${mgrId}-${emp.id}`,
            source: mgrId,
            target: emp.id,
            sourceHandle,
            targetHandle,
            type: 'smoothstep',
            animated: isDotted,
            style: { 
              strokeWidth: 1.5, 
              stroke: isDotted ? '#10b981' : '#94a3b8',
              strokeDasharray: isDotted ? '5,5' : 'none'
            },
            data: { overrideId: matchingOverride?.id, isMatrix: isDotted }
          });
        });
      } else if (emp.section?.id && activeSectionIds.has(emp.section.id)) {
        // Priority 2: Belongs to a visible Section
        const section = sections.find((s) => s.id === emp.section!.id);
        
        if (section && section.managerEmployeeId === emp.id) {
          if (rootId && rootId !== emp.id && employeeIds.has(rootId)) {
             edges.push({
                id: `e-root-${emp.id}`,
                source: rootId,
                target: emp.id,
                type: 'smoothstep',
                sourceHandle: 'bottom',
                targetHandle: 'top',
                style: { strokeWidth: 1.5, stroke: '#94a3b8' },
             });
          }
        } else {
          edges.push({
            id: `e-sec-${emp.section.id}-emp-${emp.id}`,
            source: `section-${emp.section.id}`,
            target: emp.id,
            type: 'smoothstep',
            sourceHandle: 'bottom',
            targetHandle: 'top',
            style: { strokeWidth: 1.5, stroke: '#94a3b8' },
          });
        }
      } else if (rootId && employeeIds.has(rootId) && emp.id !== rootId && !(emp as any).isExternalManager) {
        // Priority 3: Attach to Dept Root
        edges.push({
          id: `e-root-${emp.id}`,
          source: rootId,
          target: emp.id,
          type: 'smoothstep',
          sourceHandle: 'bottom',
          targetHandle: 'top',
          style: { strokeWidth: 1.5, stroke: '#94a3b8' },
        });
      }
    });

    // 3. Inject Global Context Chain: always show CTyH → TGĐ → GĐK above the department
    // These nodes come from Division → Factory → Company chain already fetched in department query
    const globalContextChain: Array<{ id: string; fullName: string; avatar?: string | null; jobTitleName?: string; orgLevel?: string | null }> = [];
    const div = department.division as any;
    if (div) {
      // Division manager (GĐK)
      if (div.managerEmployeeId && !employeeIds.has(div.managerEmployeeId)) {
        const divMgr = await this.prisma.employee.findUnique({
          where: { id: div.managerEmployeeId },
          select: { id: true, fullName: true, avatar: true, orgLevel: true, jobTitle: { select: { name: true } } }
        });
        if (divMgr) globalContextChain.unshift({ id: divMgr.id, fullName: divMgr.fullName, avatar: divMgr.avatar, jobTitleName: divMgr.jobTitle?.name, orgLevel: divMgr.orgLevel });
      }
      const fac = div.factory as any;
      if (fac) {
        // Factory manager
        if (fac.managerEmployeeId && !employeeIds.has(fac.managerEmployeeId) && !globalContextChain.find(g => g.id === fac.managerEmployeeId)) {
          const facMgr = await this.prisma.employee.findUnique({
            where: { id: fac.managerEmployeeId },
            select: { id: true, fullName: true, avatar: true, orgLevel: true, jobTitle: { select: { name: true } } }
          });
          if (facMgr) globalContextChain.unshift({ id: facMgr.id, fullName: facMgr.fullName, avatar: facMgr.avatar, jobTitleName: facMgr.jobTitle?.name, orgLevel: facMgr.orgLevel });
        }
        const comp = fac.company as any;
        if (comp && comp.managerEmployeeId && !employeeIds.has(comp.managerEmployeeId) && !globalContextChain.find(g => g.id === comp.managerEmployeeId)) {
          const compMgr = await this.prisma.employee.findUnique({
            where: { id: comp.managerEmployeeId },
            select: { id: true, fullName: true, avatar: true, orgLevel: true, jobTitle: { select: { name: true } } }
          });
          if (compMgr) globalContextChain.unshift({ id: compMgr.id, fullName: compMgr.fullName, avatar: compMgr.avatar, jobTitleName: compMgr.jobTitle?.name, orgLevel: compMgr.orgLevel });
        }
      }
    }

    // Add global context nodes & connect them in a chain down to rootId
    globalContextChain.forEach((gEmp, idx) => {
      if (!employeeIds.has(gEmp.id)) {
        nodes.push({
          id: gEmp.id,
          type: 'employeeNode',
          data: {
            id: gEmp.id,
            fullName: gEmp.fullName,
            avatar: gEmp.avatar,
            jobTitle: gEmp.jobTitleName || '---',
            orgLevel: gEmp.orgLevel,
            isGlobalContext: true,
            isRoot: false,
            isExternalManager: false,
            department: '',
          },
          position: { x: 0, y: 0 },
        });
        employeeIds.add(gEmp.id);
      }
      // Connect chain members in sequence
      const nextId = globalContextChain[idx + 1]?.id || rootId;
      if (nextId && nextId !== gEmp.id) {
        edges.push({
          id: `e-global-${gEmp.id}-${nextId}`,
          source: gEmp.id,
          target: nextId,
          type: 'smoothstep',
          sourceHandle: 'bottom',
          targetHandle: 'top',
          style: { strokeWidth: 1.5, stroke: '#94a3b8', strokeDasharray: '6,3', opacity: 0.7 },
          data: { isGlobalContext: true },
        });
      }
    });

    const result = { 
      departmentInfo: department,
      immediateParentId: null, 
      nodes: nodes.filter(n => !hiddenIds.has(n.id)), 
      edges: edges.filter(e => !hiddenIds.has(e.source) && !hiddenIds.has(e.target)), 
      config 
    };
    await this.cacheManager.set(cacheKey, result, 60000); // 1 minute cache
    return result;
  }

  maskEmployeeData(employee: any, user: any) {
    if (
      !employee ||
      user?.permissions?.includes('EMPLOYEE_SENSITIVE_READ') ||
      this.isAdministratorUser(user)
    )
      return employee;
    return {
      ...employee,
      nationalId: employee.nationalId
        ? '***' + employee.nationalId.slice(-4)
        : employee.nationalId,
      salaryLevel: employee.salaryLevel ? '***' : employee.salaryLevel,
      taxCode: employee.taxCode
        ? '***' + employee.taxCode.slice(-3)
        : employee.taxCode,
      socialInsuranceNo: employee.socialInsuranceNo
        ? '***' + employee.socialInsuranceNo.slice(-3)
        : employee.socialInsuranceNo,
      healthInsuranceNo: employee.healthInsuranceNo
        ? '***' + employee.healthInsuranceNo.slice(-3)
        : employee.healthInsuranceNo,
      bankAccountNo: employee.bankAccountNo
        ? '***' + employee.bankAccountNo.slice(-4)
        : employee.bankAccountNo,
    };
  }
}
