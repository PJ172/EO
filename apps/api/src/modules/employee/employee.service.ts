import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { ExcelService } from '../../shared/excel.service';
import * as fs from 'fs';
import * as path from 'path';
import sharp = require('sharp');
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import {
  CreateEmploymentEventDto,
  UpdateEmploymentEventDto,
} from './dto/employment-event.dto';
import { OrganizationService } from '../organization/organization.service';
import { EmployeeQueryService } from './services/employee-query.service';
import { DashboardService } from '../dashboard/dashboard.service';

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
export class EmployeeService {
  constructor(
    private prisma: PrismaService,
    private excelService: ExcelService,
    private organizationService: OrganizationService,
    private queryService: EmployeeQueryService,
    private dashboardService: DashboardService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /** Auto-detect org level from job title when admin has not set one */
  private autoDetectOrgLevel(jobTitle?: string | null): string {
    if (!jobTitle) return 'L6';
    const jt = jobTitle.toLowerCase();
    if (jt.includes('chủ tịch') || jt.includes('tổng giám đốc')) return 'L1';
    if (
      jt.includes('phó tổng giám đốc') ||
      jt.includes('giám đốc điều hành') ||
      jt.includes('phó giám đốc')
    ) return 'L2';
    if (
      (jt.includes('giám đốc') && (jt.includes('khối') || jt.includes('nhà máy'))) ||
      jt.includes('trưởng khối')
    ) return 'L3';
    if (
      jt.includes('trưởng phòng') ||
      jt.includes('phó phòng') ||
      jt.includes('quản lý')
    ) return 'L4';
    if (
      jt.includes('giám sát') ||
      jt.includes('tổ trưởng') ||
      jt.includes('trưởng bộ phận')
    ) return 'L5';
    if (
      jt.includes('thực tập') ||
      jt.includes('thời vụ') ||
      jt.includes('thử việc')
    ) return 'L7';
    return 'L6'; // default: regular employee
  }

  /**
   * Option D: Smart Auto-Position
   * Calculates canvas (x, y) for a new employee based on their manager's position.
   * Only runs when manager already has a position — never overwrites manual positions.
   */
  private async computeSmartPosition(
    managerEmployeeId: string | null | undefined,
  ): Promise<{ x: number; y: number } | null> {
    if (!managerEmployeeId) return null;

    const manager = await this.prisma.employee.findUnique({
      where: { id: managerEmployeeId },
      select: { uiPositionX: true, uiPositionY: true },
    });

    // If manager has no position yet, we cannot calculate a meaningful smart position
    if (manager?.uiPositionX == null || manager?.uiPositionY == null) {
      return null;
    }

    // Count existing siblings (employees with same manager) to determine horizontal offset
    const siblingCount = await this.prisma.employee.count({
      where: { managerEmployeeId, deletedAt: null },
    });

    const X_GAP = 280; // horizontal gap between siblings on canvas
    const Y_GAP = 200; // vertical gap between manager and direct reports

    return {
      x: manager.uiPositionX + siblingCount * X_GAP,
      y: manager.uiPositionY + Y_GAP,
    };
  }


  private async incrementListCacheVersion() {
    const key = 'employees:list:version';
    const current = (await this.cacheManager.get<number>(key)) || 0;
    await this.cacheManager.set(key, current + 1, 0); // Permanent versioning
    // Also invalidate dashboard as it shows employee counts
    await this.dashboardService.invalidateDashboardCache();
  }

  private async incrementDetailCacheVersion(id: string) {
    const key = `employee:detail:${id}:version`;
    const current = (await this.cacheManager.get<number>(key)) || 0;
    await this.cacheManager.set(key, current + 1, 0);
  }

  async findAll(params: FindAllParams, user: any) {
    return this.queryService.findAll(params, user);
  }

  async findOne(id: string, user?: any) {
    return this.queryService.findOne(id, user);
  }

  async create(dto: CreateEmployeeDto, userId?: string) {
    // Sanitize optional FK fields - convert empty string to undefined/null
    const sanitize = (val: string | undefined): string | undefined =>
      val && val.trim() !== '' ? val : undefined;

    // Capitalize first letter of each word (for address/place fields)
    const capWords = (val: string | undefined): string | undefined => {
      if (!val || val.trim() === '') return undefined;
      return val.trim().replace(/\b\w/g, (c) => c.toUpperCase());
    };

    let age = null;
    if (dto.dob) {
      const dobDate = new Date(dto.dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - dobDate.getFullYear();
      if (
        today.getMonth() < dobDate.getMonth() ||
        (today.getMonth() === dobDate.getMonth() &&
          today.getDate() < dobDate.getDate())
      ) {
        calculatedAge--;
      }
      if (calculatedAge >= 0) age = calculatedAge;
    }

    const result = await this.prisma.employee.create({
      data: {
        employeeCode: dto.employeeCode,
        createdById: userId,
        updatedById: userId,
        age: age,
        fullName: dto.fullName,
        dob: dto.dob ? new Date(dto.dob) : null,
        phone: sanitize(dto.phone),
        emailCompany: sanitize(dto.emailCompany),
        departmentId: sanitize(dto.departmentId),
        jobTitleId: sanitize(dto.jobTitleId),
        managerEmployeeId: sanitize(dto.managerEmployeeId),
        employmentStatus: dto.employmentStatus || 'PROBATION',
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : new Date(),
        // Personal Info
        gender: dto.gender,
        maritalStatus: dto.maritalStatus,
        avatar: dto.avatar,
        note: dto.note,
        permanentAddress: capWords(dto.permanentAddress),
        temporaryAddress: capWords(dto.temporaryAddress),
        birthPlace: capWords(dto.birthPlace),
        ethnicity: capWords(dto.ethnicity),
        religion: capWords(dto.religion),
        personalEmail: sanitize(dto.personalEmail),
        // CMND/CCCD
        nationalId: sanitize(dto.nationalId),
        placeOfIssue: capWords(dto.placeOfIssue),
        dateOfIssue: dto.dateOfIssue ? new Date(dto.dateOfIssue) : null,
        // Bank Info
        bankName: sanitize(dto.bankName),
        bankBranch: sanitize(dto.bankBranch),
        bankAccountNo: sanitize(dto.bankAccountNo),
        // Insurance & Tax
        socialInsuranceNo: sanitize(dto.socialInsuranceNo),
        healthInsuranceNo: sanitize(dto.healthInsuranceNo),
        taxCode: sanitize(dto.taxCode),
        // Uniform & Assets
        recordCode: sanitize(dto.recordCode),
        companyId: sanitize(dto.companyId),
        factoryId: sanitize(dto.factoryId),
        divisionId: sanitize(dto.divisionId),
        sectionId: sanitize(dto.sectionId),
        salaryLevel: sanitize(dto.salaryLevel),
        accessCardId: sanitize(dto.accessCardId),
        accessCardStatus: sanitize(dto.accessCardStatus),
        uniformPantsSize: sanitize(dto.uniformPantsSize),
        uniformShirtSize: sanitize(dto.uniformShirtSize),
        shoeSize: sanitize(dto.shoeSize),
        documentFile: sanitize(dto.documentFile),
        emergencyPhone: sanitize(dto.emergencyPhone),
        emergencyContactName: sanitize(dto.emergencyContactName),
        referrer: sanitize(dto.referrer),
        // Contract (Current)
        contractNumber: sanitize(dto.contractNumber),
        contractType: dto.contractType,
        contractStartDate: dto.contractStartDate
          ? new Date(dto.contractStartDate)
          : null,
        contractEndDate: dto.contractEndDate
          ? new Date(dto.contractEndDate)
          : null,
        // Education
        education: dto.education,
        major: sanitize(dto.major),
        school: sanitize(dto.school),
        graduationYear:
          dto.graduationYear && dto.graduationYear > 0
            ? dto.graduationYear
            : null,
        orgLevel: dto.orgLevel || null, // Admin can set; null triggers auto-display fallback on FE

        // Nested Relations
        contracts: dto.contracts?.length
          ? {
              create: dto.contracts.map((c) => ({
                contractNumber: c.contractNumber,
                contractType: c.contractType,
                startDate: new Date(c.startDate),
                endDate: c.endDate ? new Date(c.endDate) : null,
                note: sanitize(c.note),
              })),
            }
          : undefined,
        familyMembers: dto.familyMembers?.length
          ? {
              create: dto.familyMembers.map((f) => ({
                name: f.name,
                relationship: f.relationship,
                dob: f.dob ? new Date(f.dob) : null,
                phoneNumber: f.phoneNumber,
                job: f.job,
                note: f.note,
              })),
            }
          : undefined,
      },
      include: {
        company: true,
        department: true,
        factory: true,
        division: true,
        section: true,
        jobTitle: true,
        contracts: true,
        familyMembers: true,
        manager: { select: { id: true, fullName: true } },
      },
    });

    await this.incrementListCacheVersion();

    // --- OPTION D: Smart Auto-Position ---
    // After employee is created, calculate canvas position from manager.
    // Only fires if manager exists AND manager already has a canvas position.
    const smartPos = await this.computeSmartPosition(
      sanitize(dto.managerEmployeeId) ?? null,
    );
    if (smartPos) {
      await this.prisma.employee.update({
        where: { id: result.id },
        data: { uiPositionX: smartPos.x, uiPositionY: smartPos.y },
      });
      // Invalidate Org Chart cache so the frontend sees the new node immediately on refresh
      await this.cacheManager.del('org_chart_hierarchy:all:global-config');
      if (result.departmentId) {
        await this.cacheManager.del(
          `org_chart_hierarchy:${result.departmentId}:global-config`,
        );
        await this.cacheManager.del(
          `org-chart:dept:${result.departmentId}:DEPT-${result.departmentId}`,
        );
      }
    }

    return result;
  }

  async update(id: string, dto: UpdateEmployeeDto, user?: any) {
    const emp = await this.findOne(id);

    if (
      !this.queryService.isAdministratorUser(user) &&
      !user?.permissions?.includes('EMPLOYEE_ALL_VIEW')
    ) {
      if (!user?.departmentId) {
        throw new ForbiddenException(
          'Bạn chưa được gán phòng ban, không có quyền ở phạm vi này.',
        );
      }
      const descendantIds =
        await this.organizationService.getDescendantDepartmentIds(
          user.departmentId,
        );
      if (!descendantIds.includes(emp.departmentId)) {
        throw new ForbiddenException(
          'Bạn không có quyền cập nhật nhân viên ngoài phạm vi phòng ban của mình.',
        );
      }
    }

    // Check if employment status is changing to RESIGNED
    if (dto.employmentStatus === 'RESIGNED' && emp.user?.id) {
      // Auto deactivate linked user
      await this.prisma.user.update({
        where: { id: emp.user.id },
        data: { status: 'INACTIVE' },
      });
    }

    // Sanitize optional FK fields - convert empty string to null (clear value)
    const sanitize = (val: string | undefined): string | null | undefined =>
      val === '' ? null : val;

    // Capitalize first letter of each word
    const capWords = (val: string | undefined): string | null | undefined => {
      if (!val || val.trim() === '') return val === '' ? null : undefined;
      return val.trim().replace(/\b\w/g, (c) => c.toUpperCase());
    };

    let age = undefined;
    if (dto.dob !== undefined) {
      if (dto.dob === '' || !dto.dob) {
        age = null;
      } else {
        const dobDate = new Date(dto.dob);
        const today = new Date();
        let calculatedAge = today.getFullYear() - dobDate.getFullYear();
        if (
          today.getMonth() < dobDate.getMonth() ||
          (today.getMonth() === dobDate.getMonth() &&
            today.getDate() < dobDate.getDate())
        ) {
          calculatedAge--;
        }
        if (calculatedAge >= 0) age = calculatedAge;
      }
    }

    const result = await this.prisma.employee.update({
      where: { id },
      data: {
        updatedById: user?.sub,
        age: age !== undefined ? age : emp.age,
        fullName: dto.fullName,
        dob: dto.dob === '' ? null : dto.dob ? new Date(dto.dob) : undefined,
        phone: sanitize(dto.phone),
        emailCompany: sanitize(dto.emailCompany),
        departmentId: dto.departmentId === '' ? null : dto.departmentId,
        jobTitleId: dto.jobTitleId === '' ? null : dto.jobTitleId,
        managerEmployeeId:
          dto.managerEmployeeId === '' ? null : dto.managerEmployeeId,
        employmentStatus: dto.employmentStatus,
        joinedAt:
          dto.joinedAt === ''
            ? null
            : dto.joinedAt
              ? new Date(dto.joinedAt)
              : undefined,
        // Personal Info
        gender: dto.gender,
        maritalStatus: dto.maritalStatus,
        avatar: dto.avatar,
        note: dto.note,
        permanentAddress: capWords(dto.permanentAddress),
        temporaryAddress: capWords(dto.temporaryAddress),
        birthPlace: capWords(dto.birthPlace),
        ethnicity: capWords(dto.ethnicity),
        religion: capWords(dto.religion),
        personalEmail: sanitize(dto.personalEmail),
        // CMND/CCCD
        nationalId: sanitize(dto.nationalId),
        placeOfIssue: capWords(dto.placeOfIssue),
        dateOfIssue:
          dto.dateOfIssue === ''
            ? null
            : dto.dateOfIssue
              ? new Date(dto.dateOfIssue)
              : undefined,
        // Bank Info
        bankName: sanitize(dto.bankName),
        bankBranch: sanitize(dto.bankBranch),
        bankAccountNo: sanitize(dto.bankAccountNo),
        // Insurance & Tax
        socialInsuranceNo: sanitize(dto.socialInsuranceNo),
        healthInsuranceNo: sanitize(dto.healthInsuranceNo),
        taxCode: sanitize(dto.taxCode),
        // Uniform & Assets
        recordCode: sanitize(dto.recordCode),
        companyId: sanitize(dto.companyId),
        factoryId: sanitize(dto.factoryId),
        divisionId: sanitize(dto.divisionId),
        sectionId: sanitize(dto.sectionId),
        salaryLevel: sanitize(dto.salaryLevel),
        accessCardId: sanitize(dto.accessCardId),
        accessCardStatus: sanitize(dto.accessCardStatus),
        uniformPantsSize: sanitize(dto.uniformPantsSize),
        uniformShirtSize: sanitize(dto.uniformShirtSize),
        shoeSize: sanitize(dto.shoeSize),
        documentFile: sanitize(dto.documentFile),
        emergencyPhone: sanitize(dto.emergencyPhone),
        emergencyContactName: sanitize(dto.emergencyContactName),
        referrer: sanitize(dto.referrer),
        // Contract
        contractNumber: sanitize(dto.contractNumber),
        contractType: dto.contractType,
        contractStartDate:
          dto.contractStartDate === ''
            ? null
            : dto.contractStartDate
              ? new Date(dto.contractStartDate)
              : undefined,
        contractEndDate:
          dto.contractEndDate === ''
            ? null
            : dto.contractEndDate
              ? new Date(dto.contractEndDate)
              : undefined,
        // Education
        education: dto.education,
        major: sanitize(dto.major),
        school: sanitize(dto.school),
        graduationYear:
          dto.graduationYear && dto.graduationYear > 0
            ? dto.graduationYear
            : undefined,

        // Nested Relations Update (Replace Strategy)
        contracts: dto.contracts
          ? {
              deleteMany: {},
              create: dto.contracts.map((c) => ({
                contractNumber: c.contractNumber,
                contractType: c.contractType,
                startDate: c.startDate ? new Date(c.startDate) : new Date(),
                endDate: c.endDate ? new Date(c.endDate) : null,
                note: sanitize(c.note),
              })),
            }
          : undefined,
        familyMembers: dto.familyMembers
          ? {
              deleteMany: {},
              create: dto.familyMembers.map((f) => ({
                name: f.name,
                relationship: f.relationship,
                dob: f.dob ? new Date(f.dob) : null,
                phoneNumber: f.phoneNumber,
                job: f.job,
                note: f.note,
              })),
            }
          : undefined,
      },
      include: {
        department: true,
        jobTitle: true,
        contracts: true,
        familyMembers: true,
      },
    });

    // --- AUTO-CLEANUP ORG CHART OVERRIDES ---
    // If core HR manager or department changes, clear 'MOVE_NODE' display overrides to prevent desync
    const managerChanged = dto.managerEmployeeId !== undefined && dto.managerEmployeeId !== emp.managerEmployeeId;
    const deptChanged = dto.departmentId !== undefined && dto.departmentId !== emp.departmentId;
    
    if (managerChanged || deptChanged) {
      await this.prisma.orgChartOverride.deleteMany({
        where: { employeeId: id, action: 'MOVE_NODE' },
      });
      await this.cacheManager.del('org_chart_hierarchy:all:global-config');
      if (emp.departmentId) {
        await this.cacheManager.del(`org_chart_hierarchy:${emp.departmentId}:global-config`);
        await this.cacheManager.del(`org-chart:dept:${emp.departmentId}:DEPT-${emp.departmentId}`);
      }
      if (result.departmentId && result.departmentId !== emp.departmentId) {
         await this.cacheManager.del(`org_chart_hierarchy:${result.departmentId}:global-config`);
         await this.cacheManager.del(`org-chart:dept:${result.departmentId}:DEPT-${result.departmentId}`);
      }
    }

    await Promise.all([
      this.incrementListCacheVersion(),
      this.incrementDetailCacheVersion(id),
    ]);
    return result;
  }

  async uploadAvatar(id: string, file: Express.Multer.File) {
    const emp = await this.findOne(id);

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    const oldDir = path.join(uploadDir, 'old');

    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    if (!fs.existsSync(oldDir)) fs.mkdirSync(oldDir, { recursive: true });

    // --- CLEANUP OLD FILES ---
    // If employee already has an avatar, move it to 'old' directory
    if (emp.avatar && emp.avatar.includes('/uploads/avatars/')) {
      try {
        const oldBaseName = path.basename(emp.avatar);
        const variants = ['', '_thumb.webp', '_medium.webp'];
        
        for (const variant of variants) {
          const oldPath = path.join(uploadDir, variant === '' ? `${oldBaseName}.webp` : `${oldBaseName.replace('.webp', '')}${variant}`);
          // Note: Looking at the code below, baseFilename doesn't have .webp initially, 
          // but variants like _thumb.webp do. Let's be careful with the mapping.
          
          // Re-analyzing existing logic:
          // baseFilename = id-timestamp
          // thumb = baseFilename_thumb.webp
          // medium = baseFilename_medium.webp
          // actual db value = /uploads/avatars/baseFilename
          
          const oldFilesToMove = [
            path.join(uploadDir, `${oldBaseName}_thumb.webp`),
            path.join(uploadDir, `${oldBaseName}_medium.webp`)
          ];

          for (const f of oldFilesToMove) {
            if (fs.existsSync(f)) {
              const dest = path.join(oldDir, path.basename(f));
              // If destination exists (rare), delete it first or overwrite
              if (fs.existsSync(dest)) fs.unlinkSync(dest);
              fs.renameSync(f, dest);
            }
          }
        }
      } catch (err: any) {
        console.error(`Error moving old avatar files for employee ${id}: ${err.message}`);
      }
    }

    const baseFilename = `${id}-${Date.now()}`;
    const thumbPath = path.join(uploadDir, `${baseFilename}_thumb.webp`);
    const mediumPath = path.join(uploadDir, `${baseFilename}_medium.webp`);

    await Promise.all([
      sharp(file.buffer)
        .resize(80, 80, { fit: 'cover' })
        .webp({ quality: 75 })
        .toFile(thumbPath),
        
      sharp(file.buffer)
        .resize({ width: 469, height: 469, fit: 'cover' })
        .webp({ quality: 90 })
        .toFile(mediumPath),
    ]);

    const avatarUrlBase = `/uploads/avatars/${baseFilename}`;

    const result = await this.prisma.employee.update({
      where: { id },
      data: { avatar: avatarUrlBase },
    });

    await Promise.all([
      this.incrementListCacheVersion(),
      this.incrementDetailCacheVersion(id),
    ]);
    return result;
  }

  async delete(id: string, user?: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            status: true,
            roles: {
              include: { role: { select: { code: true, name: true } } },
            },
          },
        },
        department: { select: { id: true } },
        jobTitle: { select: { id: true } },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // --- ROW-LEVEL SECURITY (RLS) FOR DELETE ---
    if (
      !this.queryService.isAdministratorUser(user) &&
      !user?.permissions?.includes('EMPLOYEE_ALL_VIEW')
    ) {
      if (!user?.departmentId) {
        throw new ForbiddenException(
          'Bạn chưa được gán phòng ban, không có quyền ở phạm vi này.',
        );
      }
      const descendantIds =
        await this.organizationService.getDescendantDepartmentIds(
          user.departmentId,
        );
      if (
        !employee.departmentId ||
        !descendantIds.includes(employee.departmentId)
      ) {
        throw new ForbiddenException(
          'Bạn không có quyền xóa nhân viên ngoài phạm vi phòng ban của mình.',
        );
      }
    }

    // --- ADMIN ACCOUNT PROTECTION REMOVED TO ALLOW DECOUPLING ---
    // User can now delete Employee profile even if it's an Admin.
    // The account itself will be preserved in the logic below.

    const { v4: uuidv4 } = await import('uuid');
    const batchId = uuidv4();
    const now = new Date();

    const employeeUpdateData: any = {
      employeeCode: `${employee.employeeCode}_DELETED_${now.getTime()}`,
      deletedAt: now,
      deletedById: user?.sub || null,
      deletedBatchId: batchId,
      // SOLUTION 3: Tự động giải phóng tài khoản và chuyển trạng thái nghỉ việc
      userId: null,
      employmentStatus: 'RESIGNED',
    };

    const tx: any[] = [];

    // Clear manager links in all organization levels
    const orgUpdateData = { managerEmployeeId: null };
    tx.push(this.prisma.company.updateMany({ where: { managerEmployeeId: id }, data: orgUpdateData }));
    tx.push(this.prisma.factory.updateMany({ where: { managerEmployeeId: id }, data: orgUpdateData }));
    tx.push(this.prisma.division.updateMany({ where: { managerEmployeeId: id }, data: orgUpdateData }));
    tx.push(this.prisma.department.updateMany({ where: { managerEmployeeId: id }, data: orgUpdateData }));
    tx.push(this.prisma.section.updateMany({ where: { managerEmployeeId: id }, data: orgUpdateData }));

    // Soft-delete the employee
    tx.push(
      this.prisma.employee.update({
        where: { id },
        data: employeeUpdateData,
      }),
    );

    // If linked user exists, soft-delete user properly ONLY IF it is not an Admin
    if (employee.user) {
      const isAdminAccount = employee.user.roles?.some(
        (r: any) =>
          r.role?.code === 'ADMIN' || r.role?.name === 'Administrator',
      );

      if (!isAdminAccount) {
        tx.push(
          this.prisma.user.update({
            where: { id: employee.user.id },
            data: {
              username: `${employee.user.username}_DELETED_${now.getTime()}`,
              status: 'INACTIVE',
              email: employee.user.email
                ? `${employee.user.email}_DELETED_${now.getTime()}`
                : undefined,
              // FIX: Đảm bảo bản ghi User cũng được đánh dấu xóa để hiện trong Thùng rác
              deletedAt: now,
              deletedById: user?.sub || null,
              deletedBatchId: batchId,
            },
          }),
        );
      }
      // If Admin account, we DON'T delete/deactivate it. 
      // The Employee.update already set userId: null, so the link is broken.
    }

    await this.prisma.$transaction(tx);

    await Promise.all([
      this.incrementListCacheVersion(),
      this.incrementDetailCacheVersion(id),
    ]);

    return { success: true, batchId };
  }

  async bulkDelete(ids: string[], user?: any) {
    const { v4: uuidv4 } = await import('uuid');
    const batchId = uuidv4();
    const now = new Date();

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        employeeCode: true,
        departmentId: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            roles: {
              include: { role: { select: { code: true, name: true } } },
            },
          },
        },
      },
    });

    if (!employees.length) {
      return { success: true, count: 0, batchId };
    }

    // --- ROW-LEVEL SECURITY (RLS) FOR BULK DELETE ---
    if (
      !this.queryService.isAdministratorUser(user) &&
      !user?.permissions?.includes('EMPLOYEE_ALL_VIEW')
    ) {
      if (!user?.departmentId) {
        throw new ForbiddenException(
          'Bạn chưa được gán phòng ban, không có quyền ở phạm vi này.',
        );
      }
      const descendantIds =
        await this.organizationService.getDescendantDepartmentIds(
          user.departmentId,
        );
      const unauthorizedEmps = employees.filter(
        (emp) => !emp.departmentId || !descendantIds.includes(emp.departmentId),
      );

      if (unauthorizedEmps.length > 0) {
        throw new ForbiddenException(
          'Một vài nhân viên được chọn nằm ngoài phạm vi phòng ban của bạn. Vui lòng kiểm tra lại.',
        );
      }
    }

    // Separate updates for employee and user to prevent "User record not found for nested update"
    const tx: any[] = [];

    // Clear manager links for all deleted employees in organization levels
    const orgUpdateData = { managerEmployeeId: null };
    tx.push(this.prisma.company.updateMany({ where: { managerEmployeeId: { in: ids } }, data: orgUpdateData }));
    tx.push(this.prisma.factory.updateMany({ where: { managerEmployeeId: { in: ids } }, data: orgUpdateData }));
    tx.push(this.prisma.division.updateMany({ where: { managerEmployeeId: { in: ids } }, data: orgUpdateData }));
    tx.push(this.prisma.department.updateMany({ where: { managerEmployeeId: { in: ids } }, data: orgUpdateData }));
    tx.push(this.prisma.section.updateMany({ where: { managerEmployeeId: { in: ids } }, data: orgUpdateData }));

    employees.forEach((emp) => {
      const employeeUpdateData: any = {
        employeeCode: `${emp.employeeCode}_DELETED_${now.getTime()}`,
        deletedAt: now,
        deletedById: user?.sub || null,
        deletedBatchId: batchId,
        // SOLUTION 3: Tự động giải phóng tài khoản và trạng thái nghỉ việc
        userId: null,
        employmentStatus: 'RESIGNED',
      };

      tx.push(
        this.prisma.employee.update({
          where: { id: emp.id },
          data: employeeUpdateData,
        }),
      );

      if (emp.user) {
        // --- ADMIN ACCOUNT PROTECTION REMOVED TO ALLOW DECOUPLING ---
        const isAdminAccount = emp.user.roles?.some(
          (r: any) =>
            r.role?.code === 'ADMIN' || r.role?.name === 'Administrator',
        );

        if (!isAdminAccount) {
          tx.push(
            this.prisma.user.update({
              where: { id: emp.user.id },
              data: {
                username: `${emp.user.username}_DELETED_${now.getTime()}`,
                status: 'INACTIVE',
                email: emp.user.email
                  ? `${emp.user.email}_DELETED_${now.getTime()}`
                  : undefined,
                // FIX: Đảm bảo bản ghi User cũng được đánh dấu xóa hàng loạt
                deletedAt: now,
                deletedById: user?.sub || null,
                deletedBatchId: batchId,
              },
            }),
          );
        }
      }
    });

    await this.prisma.$transaction(tx);

    const detailP = employees.map((emp) =>
      this.incrementDetailCacheVersion(emp.id),
    );
    await Promise.all([this.incrementListCacheVersion(), ...detailP]);

    return { success: true, count: employees.length, batchId };
  }

  async restore(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id, deletedAt: { not: null } },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException('Không tìm thấy nhân viên trong thùng rác');
    }

    const updateData: any = {
      employeeCode: employee.employeeCode.split('_DELETED_')[0],
      deletedAt: null,
      deletedById: null,
      deletedBatchId: null,
    };

    if (employee.user) {
      updateData.user = {
        update: {
          username: employee.user.username.split('_DELETED_')[0],
          status: 'ACTIVE',
          email: employee.user.email
            ? employee.user.email.split('_DELETED_')[0]
            : null,
        },
      };
    }

    await this.prisma.employee.update({
      where: { id },
      data: updateData,
    });

    await Promise.all([
      this.incrementListCacheVersion(),
      this.incrementDetailCacheVersion(id),
    ]);

    return { success: true, message: 'Đã khôi phục nhân viên thành công' };
  }

  async hardDelete(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id, deletedAt: { not: null } },
    });

    if (!employee) {
      throw new NotFoundException(
        'Không tìm thấy nhân viên trong thùng rác để xóa vĩnh viễn',
      );
    }

    await this.prisma.employee.delete({
      where: { id },
    });

    await Promise.all([
      this.incrementListCacheVersion(),
      this.incrementDetailCacheVersion(id),
    ]);

    return { success: true, message: 'Đã xóa vĩnh viễn nhân viên' };
  }

  async getLeaveRequests(employeeId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { employeeId },
      include: {
        leaveType: true,
        approvals: {
          include: {
            approver: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getAttendance(employeeId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().setDate(1));
    const toDate = to ? new Date(to) : new Date();

    return this.prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  // ===================== EXCEL EXPORT/IMPORT (DELEGATED TO EMPLOYEEEXCELSERVICE) =====================
  // Note: These methods are now mainly handled by EmployeeExcelService directly in the controller.
  // We keep the skeleton here if other services rely on EmployeeService for Excel.

  async exportToExcel(): Promise<Buffer> {
    throw new BadRequestException('Use EmployeeExcelService for export');
  }

  async getExcelTemplate(): Promise<Buffer> {
    throw new BadRequestException('Use EmployeeExcelService for template');
  }

  async importFromExcel(buffer: Buffer): Promise<any> {
    throw new BadRequestException('Use EmployeeExcelService for import');
  }

  // ... existing code ...

  // ===================== EMPLOYMENT EVENTS =====================

  async getEmploymentEvents(employeeId: string) {
    return this.prisma.employmentEvent.findMany({
      where: { employeeId },
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createEmploymentEvent(
    employeeId: string,
    dto: CreateEmploymentEventDto,
  ) {
    const employee = await this.findOne(employeeId);

    // 1. Create the event
    const event = await this.prisma.employmentEvent.create({
      data: {
        employeeId,
        eventType: dto.eventType,
        effectiveDate: new Date(dto.effectiveDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        decisionNumber: dto.decisionNumber,
        reason: dto.reason,
        note: dto.note,
      },
    });

    // 2. Sync Employee status with the latest event
    await this.syncEmploymentStatus(employeeId);

    await Promise.all([
      this.incrementListCacheVersion(),
      this.incrementDetailCacheVersion(employeeId),
    ]);

    return event;
  }

  async deleteEmploymentEvent(employeeId: string, eventId: string) {
    const event = await this.prisma.employmentEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.employeeId !== employeeId) {
      throw new NotFoundException('Event not found');
    }

    await this.prisma.employmentEvent.delete({
      where: { id: eventId },
    });

    // Sync Employee status with the latest remaining event
    await this.syncEmploymentStatus(employeeId);

    await Promise.all([
      this.incrementListCacheVersion(),
      this.incrementDetailCacheVersion(employeeId),
    ]);

    return { success: true };
  }

  async updateEmploymentEvent(
    employeeId: string,
    eventId: string,
    dto: UpdateEmploymentEventDto,
  ) {
    const event = await this.prisma.employmentEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.employeeId !== employeeId) {
      throw new NotFoundException('Event not found');
    }

    const updatedEvent = await this.prisma.employmentEvent.update({
      where: { id: eventId },
      data: {
        eventType: dto.eventType,
        effectiveDate: dto.effectiveDate
          ? new Date(dto.effectiveDate)
          : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        decisionNumber: dto.decisionNumber,
        reason: dto.reason,
        note: dto.note,
      },
    });

    // 2. Sync Employee status with the latest event
    await this.syncEmploymentStatus(employeeId);

    await Promise.all([
      this.incrementListCacheVersion(),
      this.incrementDetailCacheVersion(employeeId),
    ]);

    return updatedEvent;
  }

  // ===================== ORG CHART (DELEGATED TO EMPLOYEEQUERYSERVICE) =====================

  async getOrgChartStructure() {
    return this.queryService.getOrgChartStructure();
  }

  async getOrgChartHierarchy(departmentId?: string, chartKey?: string) {
    return this.queryService.getOrgChartHierarchy(departmentId, chartKey);
  }

  async saveOrgChartConfig(id: string, data: any, userId: string) {
    const result = await (this.prisma as any).orgChartConfig.upsert({
      where: { id },
      update: {
        ...data,
        updatedById: userId,
      },
      create: {
        id,
        ...data,
        updatedById: userId,
      },
    });
    // Invalidate caches
    try {
      if (typeof (this.cacheManager as any).clear === 'function') {
        await (this.cacheManager as any).clear();
      } else if (typeof (this.cacheManager as any).reset === 'function') {
        await (this.cacheManager as any).reset();
      }
    } catch (e) {
      console.warn('Cache clear failed', e);
    }
    return result;
  }

  async saveOrgChartViewOverride(chartKey: string, data: any, userId: string) {
    const result = await (this.prisma as any).orgChartViewOverride.upsert({
      where: { chartKey },
      update: {
        ...data,
        updatedById: userId,
      },
      create: {
        chartKey,
        ...data,
        updatedById: userId,
      },
    });
    // Invalidate caches
    try {
      if (typeof (this.cacheManager as any).clear === 'function') {
        await (this.cacheManager as any).clear();
      } else if (typeof (this.cacheManager as any).reset === 'function') {
        await (this.cacheManager as any).reset();
      }
    } catch (e) {
      console.warn('Cache clear failed', e);
    }
    return result;
  }

  async getDeptOrgChart(deptId: string) {
    return this.queryService.getDeptOrgChart(deptId);
  }

  private async syncEmploymentStatus(employeeId: string) {
    const latestEvent = await this.prisma.employmentEvent.findFirst({
      where: { employeeId },
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    });

    if (!latestEvent) return;

    const updateData: any = {};
    switch (latestEvent.eventType) {
      case 'PROBATION':
        updateData.employmentStatus = 'PROBATION';
        updateData.resignedAt = null;
        break;
      case 'OFFICIAL':
      case 'RETURN_TO_WORK':
        updateData.employmentStatus = 'OFFICIAL';
        updateData.resignedAt = null;
        break;
      case 'MATERNITY_LEAVE':
        updateData.employmentStatus = 'MATERNITY_LEAVE';
        break;
      case 'RESIGNED':
        updateData.employmentStatus = 'RESIGNED';
        updateData.resignedAt = latestEvent.effectiveDate;
        break;
      case 'SUSPENDED':
        // For SUSPENDED, we don't change the main status as per current schema options
        // unless we want to map it to something. For now, we keep it as is.
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: updateData,
      });
    }
  }

  private maskEmployeeData(employee: any, user: any) {
    return this.queryService.maskEmployeeData(employee, user);
  }
}
