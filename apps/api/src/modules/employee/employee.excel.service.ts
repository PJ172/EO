import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmploymentStatus,
  Gender,
  ContractType,
  EducationLevel,
  MaritalStatus,
} from './dto/employee.dto';
import * as bcrypt from 'bcrypt';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { OrganizationService } from '../organization/organization.service';

@Injectable()
export class EmployeeExcelService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private organizationService: OrganizationService,
  ) {}

  private formatHeaderRow(worksheet: ExcelJS.Worksheet, bgColor: string) {
    const headerRow = worksheet.getRow(1);
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor },
    };
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    headerRow.eachCell((cell) => {
      let text = cell.value?.toString() || '';
      if (
        typeof cell.value === 'object' &&
        cell.value !== null &&
        'richText' in cell.value
      ) {
        text = (cell.value as any).richText
          .map((rt: any) => rt.text)
          .join('')
          .trim();
      }

      if (text.includes('(*)')) {
        const baseText = text.replace(/\(\*\)/g, '').trim();
        cell.value = {
          richText: [
            {
              font: { bold: true, color: { argb: 'FFFFFFFF' } },
              text: baseText + ' ',
            },
            { font: { bold: true, color: { argb: 'FFFF0000' } }, text: '(*)' },
          ],
        };
      } else {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      }
    });
  }

  // Helper to format date for Excel
  private formatDate(date: Date | null | undefined): string {
    return date ? date.toISOString().split('T')[0] : '';
  }

  // Mapping helpers
  private readonly STATUS_MAP: Record<string, string> = {
    PROBATION: 'Thử việc',
    OFFICIAL: 'Chính thức',
    RESIGNED: 'Đã nghỉ việc',
  };

  private readonly GENDER_MAP: Record<string, string> = {
    MALE: 'Nam',
    FEMALE: 'Nữ',
    OTHER: 'Khác',
  };

  private readonly MARITAL_MAP: Record<string, string> = {
    SINGLE: 'Độc thân',
    MARRIED: 'Đã kết hôn',
    DIVORCED: 'Ly hôn',
    WIDOWED: 'Góa',
  };

  private readonly CONTRACT_MAP: Record<string, string> = {
    PROBATION: 'Thử việc',
    ONE_YEAR: '1 Năm',
    TWO_YEARS: '2 Năm',
    THREE_YEARS: '3 Năm',
    INDEFINITE_TERM: 'Không thời hạn',
    SEASONAL: 'Thời vụ',
  };

  private readonly EDUCATION_MAP: Record<string, string> = {
    PRIMARY: 'Tiểu học',
    SECONDARY: 'THCS',
    HIGH_SCHOOL: 'THPT',
    VOCATIONAL: 'Trung cấp',
    COLLEGE: 'Cao đẳng',
    UNIVERSITY: 'Đại học',
    MASTER: 'Thạc sĩ',
    DOCTOR: 'Tiến sĩ',
    GRADE_12_12: '12/12',
    GRADE_11_12: '11/12',
    GRADE_10_12: '10/12',
    GRADE_9_12: '9/12',
    GRADE_8_12: '8/12',
    GRADE_7_12: '7/12',
    GRADE_6_12: '6/12',
    GRADE_5_12: '5/12',
    GRADE_4_12: '4/12',
    GRADE_3_12: '3/12',
    GRADE_2_12: '2/12',
    GRADE_1_12: '1/12',
  };

  private getOrgPath(department: any) {
    let company = '',
      factory = '',
      division = '',
      deptName = '',
      section = '';

    let current = department;
    while (current) {
      if (current.type === 'SECTION' || current.type === 'GROUP')
        section = current.name;
      else if (current.type === 'DEPARTMENT') deptName = current.name;
      else if (current.type === 'DIVISION') division = current.name;
      else if (current.type === 'FACTORY') factory = current.name;
      else if (current.type === 'COMPANY') company = current.name;

      current = current.parent;
    }

    return { company, factory, division, deptName, section };
  }

  async exportEmployees(
    res: Response,
    filters?: {
      search?: string;
      status?: string;
      departmentId?: string;
    },
    user?: any,
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách nhân viên');

    const defaultHeaders = [
      // Basic Info
      { header: 'Mã nhân viên (*)', key: 'employeeCode', width: 12 },
      { header: 'Họ và tên (*)', key: 'fullName', width: 25 },
      { header: 'Giới tính', key: 'gender', width: 10 },
      { header: 'Ngày sinh', key: 'dob', width: 12 },
      { header: 'Tuổi', key: 'age', width: 10 },
      { header: 'Tình trạng hôn nhân', key: 'maritalStatus', width: 15 },
      { header: 'Nơi sinh', key: 'birthPlace', width: 20 },
      { header: 'Dân tộc', key: 'ethnicity', width: 12 },
      { header: 'Tôn giáo', key: 'religion', width: 12 },
      { header: 'SĐT', key: 'phone', width: 12 },
      { header: 'Email công ty', key: 'emailCompany', width: 25 },
      { header: 'Email cá nhân', key: 'personalEmail', width: 25 },
      { header: 'SĐT khẩn cấp', key: 'emergencyPhone', width: 15 },
      { header: 'Tên người LH khẩn', key: 'emergencyContactName', width: 20 },
      { header: 'Người giới thiệu', key: 'referrer', width: 20 },
      { header: 'Địa chỉ thường trú', key: 'permanentAddress', width: 40 },
      { header: 'Địa chỉ tạm trú', key: 'temporaryAddress', width: 40 },
      // CMND
      { header: 'Số CMND/CCCD', key: 'nationalId', width: 15 },
      { header: 'Ngày cấp CMND', key: 'dateOfIssue', width: 12 },
      { header: 'Nơi cấp', key: 'placeOfIssue', width: 30 },
      // Bank
      { header: 'Ngân hàng', key: 'bankName', width: 20 },
      { header: 'Chi nhánh NH', key: 'bankBranch', width: 20 },
      { header: 'Số TK', key: 'bankAccountNo', width: 18 },
      // Insurance
      { header: 'Số BHXH', key: 'socialInsuranceNo', width: 15 },
      { header: 'Số BHYT', key: 'healthInsuranceNo', width: 15 },
      { header: 'Mã số thuế', key: 'taxCode', width: 15 },
      { header: 'Thẻ từ', key: 'accessCardStatus', width: 15 },
      { header: 'Size quần', key: 'uniformPantsSize', width: 10 },
      { header: 'Size áo', key: 'uniformShirtSize', width: 10 },
      { header: 'Size giầy', key: 'shoeSize', width: 10 },
      // Contract
      { header: 'Số hợp đồng', key: 'contractNumber', width: 15 },
      { header: 'Loại HĐ', key: 'contractType', width: 15 },
      { header: 'Ngày bắt đầu HĐ', key: 'contractStartDate', width: 15 },
      { header: 'Ngày kết thúc HĐ', key: 'contractEndDate', width: 15 },
      // Education
      { header: 'Trình độ', key: 'education', width: 12 },
      { header: 'Chuyên ngành', key: 'major', width: 20 },
      { header: 'Trường', key: 'school', width: 25 },
      { header: 'Năm TN', key: 'graduationYear', width: 10 },
      // Family Members
      { header: 'Thông tin gia đình', key: 'familyMembers', width: 40 },
      // Work Info - Standardized Org Hierarchy
      { header: 'Công ty', key: 'company', width: 25 },
      { header: 'Nhà máy', key: 'factory', width: 20 },
      { header: 'Khối', key: 'division', width: 15 },
      { header: 'Phòng ban', key: 'department', width: 20 },
      { header: 'Bộ phận', key: 'section', width: 20 },
      { header: 'Chức danh', key: 'jobTitle', width: 20 },
      { header: 'Vị trí công việc', key: 'jobPosition', width: 20 },
      { header: 'Quản lý', key: 'manager', width: 25 },
      { header: 'Trạng thái', key: 'employmentStatus', width: 12 },
      { header: 'Ngày vào làm', key: 'joinedAt', width: 12 },
      { header: 'Ngày nghỉ việc', key: 'resignedAt', width: 12 },
      // Other Data
      { header: 'Mã hồ sơ', key: 'recordCode', width: 15 },
      { header: 'Bậc lương', key: 'salaryLevel', width: 15 },
      { header: 'Mã thẻ từ', key: 'accessCardId', width: 15 },
      { header: 'File đính kèm', key: 'documentFile', width: 30 },
      { header: 'Ghi chú', key: 'note', width: 40 },
      // Audit
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
      { header: 'Người tạo', key: 'createdBy', width: 20 },
      { header: 'Ngày cập nhật', key: 'updatedAt', width: 20 },
      { header: 'Người cập nhật', key: 'updatedBy', width: 20 },
    ];

    // Fetch export config: Export by name → fallback to ALL config
    let exportConfig = await this.prisma.tableColumnConfig.findFirst({
      where: { moduleKey: 'employees', name: { equals: "Export", mode: "insensitive" } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!exportConfig) {
      exportConfig = await this.prisma.tableColumnConfig.findFirst({
        where: { moduleKey: 'employees', applyTo: 'ALL' },
        orderBy: { updatedAt: 'desc' },
      });
    }

    let headers = defaultHeaders;
    if (exportConfig && Array.isArray(exportConfig.columns)) {
      const configCols = exportConfig.columns as any[];
      const visibleCols = configCols
        .filter((c) => c.visible !== false)
        .sort((a, b) => a.order - b.order);
      const headerMap = new Map(defaultHeaders.map((h) => [h.key, h]));
      headers = visibleCols.map((c) => {
        const found = headerMap.get(c.key);
        let headerText = c.label || (found ? found.header : c.label);

        // Ensure required columns have (*)
        if (
          ['employeeCode', 'fullName'].includes(c.key) &&
          headerText &&
          !headerText.includes('(*)')
        ) {
          headerText += ' (*)';
        }

        if (found) {
          return { ...found, header: headerText };
        }
        return { header: headerText, key: c.key, width: 15 };
      });
    }

    worksheet.columns = headers;

    // Style header
    this.formatHeaderRow(worksheet, 'FF4CAF50');

    // Build filter where clause (Phase 3.5)
    const where: any = { deletedAt: null };
    if (filters?.search) {
      where.OR = [
        { employeeCode: { contains: filters.search, mode: 'insensitive' } },
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.status) {
      where.employmentStatus = filters.status as any;
    }

    // --- ROW-LEVEL SECURITY (RLS) ---
    // If not super admin / hr global view, filter by user's department tree
    if (!user?.permissions?.includes('EMPLOYEE_ALL_VIEW')) {
      if (user?.departmentId) {
        const descendantIds =
          await this.organizationService.getDescendantDepartmentIds(
            user.departmentId,
          );
        // If they already searched a specific department, make sure it's within their tree
        if (where.departmentId || filters?.departmentId) {
          const targetDept = where.departmentId || filters?.departmentId;
          if (!descendantIds.includes(targetDept)) {
            // Searched for a department they don't have access to -> return empty
            where.departmentId = 'UNAUTHORIZED-ACCESS';
          } else {
            where.departmentId = targetDept;
          }
        } else {
          where.departmentId = { in: descendantIds };
        }
      } else {
        // User has no department and no ALL_VIEW permission -> return none
        where.departmentId = 'NO-DEPARTMENT-ASSIGNED';
      }
    } else if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }

    // Fetch data with all relations
    const employeesRaw = await this.prisma.employee.findMany({
      where,
      include: {
        department: {
          include: {
            division: {
              select: { name: true, code: true },
            },
          },
        },
        jobTitle: true,
        manager: { select: { fullName: true } },
        familyMembers: true,
        createdBy: { select: { username: true } },
        updatedBy: { select: { username: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });

    // Mask data before exporting if needed
    const employees = employeesRaw.map((emp) =>
      this.maskEmployeeData(emp, user),
    );

    // Add rows with all fields
    employees.forEach((emp) => {
      const { company, factory, division, deptName, section } = this.getOrgPath(
        emp.department,
      );

      worksheet.addRow({
        // Basic Info
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        gender: emp.gender ? this.GENDER_MAP[emp.gender] || emp.gender : '',
        dob: this.formatDate(emp.dob),
        age: emp.age || '',
        maritalStatus: emp.maritalStatus
          ? this.MARITAL_MAP[emp.maritalStatus] || emp.maritalStatus
          : '',
        birthPlace: emp.birthPlace || '',
        ethnicity: emp.ethnicity || '',
        religion: emp.religion || '',
        phone: emp.phone || '',
        emailCompany: emp.emailCompany || '',
        personalEmail: emp.personalEmail || '',
        emergencyPhone: emp.emergencyPhone || '',
        emergencyContactName: emp.emergencyContactName || '',
        referrer: emp.referrer || '',
        permanentAddress: emp.permanentAddress || '',
        temporaryAddress: emp.temporaryAddress || '',
        // CMND
        nationalId: emp.nationalId || '',
        dateOfIssue: this.formatDate(emp.dateOfIssue),
        placeOfIssue: emp.placeOfIssue || '',
        // Bank
        bankName: emp.bankName || '',
        bankBranch: emp.bankBranch || '',
        bankAccountNo: emp.bankAccountNo || '',
        // Insurance
        socialInsuranceNo: emp.socialInsuranceNo || '',
        healthInsuranceNo: emp.healthInsuranceNo || '',
        taxCode: emp.taxCode || '',
        accessCardStatus:
          emp.accessCardStatus === 'ISSUED'
            ? 'Đã cấp'
            : emp.accessCardStatus === 'NOT_ISSUED'
              ? 'Chưa cấp'
              : emp.accessCardStatus === 'DAMAGED'
                ? 'Hư hỏng'
                : emp.accessCardStatus === 'LOST'
                  ? 'Mất'
                  : emp.accessCardStatus || '',
        uniformPantsSize: emp.uniformPantsSize || '',
        uniformShirtSize: emp.uniformShirtSize || '',
        shoeSize: emp.shoeSize || '',
        // Contract
        contractNumber: emp.contractNumber || '',
        contractType: emp.contractType
          ? this.CONTRACT_MAP[emp.contractType] || emp.contractType
          : '',
        contractStartDate: this.formatDate(emp.contractStartDate),
        contractEndDate: this.formatDate(emp.contractEndDate),
        // Education
        education: emp.education
          ? this.EDUCATION_MAP[emp.education] || emp.education
          : '',
        major: emp.major || '',
        school: emp.school || '',
        // Family
        familyMembers:
          emp.familyMembers
            ?.map((f: any) => {
              const relMap: any = {
                MOTHER: 'Mẹ',
                FATHER: 'Bố',
                SPOUSE: 'Vợ/Chồng',
                WIFE: 'Vợ',
                HUSBAND: 'Chồng',
                CHILD: 'Con',
                SIBLING: 'Anh/Chị/Em',
                BROTHER: 'Anh/Em trai',
                SISTER: 'Chị/Em gái',
                DEPENDENT: 'Người phụ thuộc',
                OTHER: 'Khác',
              };
              const relStr = relMap[f.relationship] || f.relationship;
              return `${f.name} (${relStr}) - ${f.phoneNumber || 'Không SĐT'}`;
            })
            .join('\n') || '',
        // Work Info - Standardized
        company,
        factory,
        division,
        department: deptName,
        section,
        jobTitle: emp.jobTitle?.name || '',
        manager: emp.manager?.fullName || '',
        employmentStatus:
          this.STATUS_MAP[emp.employmentStatus] || emp.employmentStatus,
        joinedAt: this.formatDate(emp.joinedAt),
        resignedAt: this.formatDate(emp.resignedAt),
        recordCode: emp.recordCode || '',
        salaryLevel: emp.salaryLevel || '',
        accessCardId: emp.accessCardId || '',
        documentFile: emp.documentFile || '',
        note: emp.note || '',
        createdAt: emp.createdAt
          ? new Date(emp.createdAt).toLocaleString('vi-VN')
          : '',
        createdBy: emp.createdBy?.username || '',
        updatedAt: emp.updatedAt
          ? new Date(emp.updatedAt).toLocaleString('vi-VN')
          : '',
        updatedBy: emp.updatedBy?.username || '',
      });
    });

    // Write response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=employees_export.xlsx',
    );

    await workbook.xlsx.write(res);
  }

  async downloadTemplate(res: Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Mẫu nhập liệu');

    // ALL import columns list
    const defaultHeaders = [
      { header: 'Mã NV (*)', key: 'employeeCode', width: 15 },
      { header: 'Họ và tên (*)', key: 'fullName', width: 25 },
      { header: 'Giới tính', key: 'gender', width: 20 },
      { header: 'Ngày sinh', key: 'dob', width: 20 },
      { header: 'Tình trạng hôn nhân', key: 'maritalStatus', width: 20 },
      { header: 'Nơi sinh', key: 'birthPlace', width: 20 },
      { header: 'Dân tộc', key: 'ethnicity', width: 15 },
      { header: 'Tôn giáo', key: 'religion', width: 15 },
      { header: 'SĐT', key: 'phone', width: 15 },
      { header: 'Email công ty', key: 'emailCompany', width: 25 },
      { header: 'Email cá nhân', key: 'personalEmail', width: 25 },
      { header: 'SĐT khẩn cấp', key: 'emergencyPhone', width: 15 },
      { header: 'Người LH khẩn cấp', key: 'emergencyContactName', width: 20 },
      { header: 'Người giới thiệu', key: 'referrer', width: 20 },
      { header: 'Địa chỉ thường trú', key: 'permanentAddress', width: 40 },
      { header: 'Địa chỉ tạm trú', key: 'temporaryAddress', width: 40 },
      { header: 'Số CMND/CCCD', key: 'nationalId', width: 15 },
      { header: 'Ngày cấp', key: 'dateOfIssue', width: 20 },
      { header: 'Nơi cấp', key: 'placeOfIssue', width: 30 },
      { header: 'Tên ngân hàng', key: 'bankName', width: 20 },
      { header: 'Chi nhánh', key: 'bankBranch', width: 20 },
      { header: 'Số tài khoản', key: 'bankAccountNo', width: 18 },
      { header: 'Số BHXH', key: 'socialInsuranceNo', width: 15 },
      { header: 'Số BHYT', key: 'healthInsuranceNo', width: 15 },
      { header: 'Mã số thuế', key: 'taxCode', width: 15 },
      { header: 'Thẻ từ', key: 'accessCardStatus', width: 15 },
      { header: 'Size quần', key: 'uniformPantsSize', width: 10 },
      { header: 'Size áo', key: 'uniformShirtSize', width: 10 },
      { header: 'Size giầy', key: 'shoeSize', width: 10 },
      { header: 'Số hợp đồng', key: 'contractNumber', width: 15 },
      { header: 'Loại HĐ', key: 'contractType', width: 20 },
      { header: 'Ngày bắt đầu HĐ', key: 'contractStartDate', width: 25 },
      { header: 'Ngày kết thúc HĐ', key: 'contractEndDate', width: 25 },
      { header: 'Trình độ', key: 'education', width: 15 },
      { header: 'Chuyên ngành', key: 'major', width: 20 },
      { header: 'Trường', key: 'school', width: 25 },
      { header: 'Năm tốt nghiệp', key: 'graduationYear', width: 15 },
      { header: 'Tên Công ty', key: 'companyCode', width: 25 },
      { header: 'Tên Nhà máy', key: 'factoryCode', width: 25 },
      { header: 'Tên Khối', key: 'divisionCode', width: 25 },
      { header: 'Tên Phòng ban', key: 'departmentCode', width: 25 },
      { header: 'Tên Bộ phận', key: 'sectionCode', width: 25 },
      { header: 'Tên Chức danh', key: 'jobTitleCode', width: 25 },
      { header: 'Tên Vị trí công việc', key: 'jobPositionCode', width: 25 },
      { header: 'Quản lý trực tiếp', key: 'managerCode', width: 15 },
      { header: 'Trạng thái', key: 'employmentStatus', width: 15 },
      { header: 'Ngày vào làm', key: 'joinedAt', width: 25 },
      { header: 'Ngày nghỉ việc', key: 'resignedAt', width: 20 },
      { header: 'Mã hồ sơ', key: 'recordCode', width: 15 },
      { header: 'Bậc lương', key: 'salaryLevel', width: 15 },
      { header: 'Mã thẻ từ', key: 'accessCardId', width: 15 },
      { header: 'File đính kèm', key: 'documentFile', width: 30 },
      { header: 'Ghi chú', key: 'note', width: 40 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
      { header: 'Người tạo', key: 'createdBy', width: 20 },
      { header: 'Ngày cập nhật', key: 'updatedAt', width: 20 },
      { header: 'Người cập nhật', key: 'updatedBy', width: 20 },
    ];

    // Fetch import config: Import by name → fallback to ALL config
    let importConfig = await this.prisma.tableColumnConfig.findFirst({
      where: { moduleKey: 'employees', name: { equals: "Import", mode: "insensitive" } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!importConfig) {
      importConfig = await this.prisma.tableColumnConfig.findFirst({
        where: { moduleKey: 'employees', applyTo: 'ALL' },
        orderBy: { updatedAt: 'desc' },
      });
    }

    let headers = defaultHeaders;
    if (importConfig && Array.isArray(importConfig.columns)) {
      const configCols = importConfig.columns as any[];
      const visibleCols = configCols
        .filter((c) => c.visible !== false)
        .sort((a, b) => a.order - b.order);
      const headerMap = new Map(defaultHeaders.map((h) => [h.key, h]));
      headers = visibleCols.map((c) => {
        const found = headerMap.get(c.key);
        let headerText = c.label || (found ? found.header : c.label);
        if (
          ['employeeCode', 'fullName'].includes(c.key) &&
          headerText &&
          !headerText.includes('(*)')
        ) {
          headerText += ' (*)';
        }
        if (found) return { ...found, header: headerText };
        return { header: headerText, key: c.key, width: 15 };
      });
    }

    worksheet.columns = headers;

    this.formatHeaderRow(worksheet, 'FF2196F3');

    worksheet.addRow({
      employeeCode: 'NV001',
      fullName: 'Nguyễn Văn A',
      gender: 'Nam',
      dob: '15/01/1990',
      maritalStatus: 'Độc thân',
      birthPlace: 'Bình Dương',
      ethnicity: 'Kinh',
      religion: 'Không',
      phone: '0901234567',
      emailCompany: 'a.nguyen@sunplast.vn',
      personalEmail: 'nvana@gmail.com',
      emergencyPhone: '0987654321',
      emergencyContactName: 'Nguyễn Văn B',
      referrer: 'Trần C',
      permanentAddress: '123 Đường ABC, Phường 1, TP.HCM',
      temporaryAddress: '',
      nationalId: '079090001234',
      dateOfIssue: '15/06/2020',
      placeOfIssue: 'Cục CSĐKQL',
      bankName: 'Vietcombank',
      bankBranch: 'Bình Dương',
      bankAccountNo: '0123456789',
      socialInsuranceNo: '1234567890',
      healthInsuranceNo: 'DN1234567890',
      taxCode: '1234567890',
      accessCardStatus: 'Đã cấp',
      uniformPantsSize: '30',
      uniformShirtSize: 'M',
      shoeSize: '40',
      contractNumber: 'HD-001/HD',
      contractType: 'Không thời hạn',
      contractStartDate: '01/01/2023',
      contractEndDate: '',
      education: 'Đại học',
      major: 'Công nghệ thông tin',
      school: 'Đại học Bách Khoa',
      graduationYear: '2012',
      companyCode: 'Thái Dương',
      factoryCode: 'Nhà máy 1',
      divisionCode: 'Khối sản xuất',
      departmentCode: 'Phòng sản xuất',
      sectionCode: 'Tổ cơ khí',
      jobTitleCode: 'DEV',
      jobPositionCode: 'DEV_LEAD',
      managerCode: 'ADMIN',
      employmentStatus: 'Thử việc',
      joinedAt: '01/01/2024',
      recordCode: 'HS_001',
      salaryLevel: 'L1',
      accessCardId: '123456789',
      documentFile: '',
      note: 'Nhân sự mới',
      createdAt: '01/01/2024',
      createdBy: 'admin',
      updatedAt: '01/01/2024',
      updatedBy: 'admin',
    });

    // Add notes
    worksheet.addRow([]);
    const noteRow = worksheet.addRow(['Ghi chú (Hồ sơ):']);
    noteRow.getCell(1).font = { bold: true };
    worksheet.addRow(['- (*) là các cột bắt buộc']);
    worksheet.addRow(['- Giới tính: Nam / Nữ / Khác']);
    worksheet.addRow([
      '- Loại HĐ: Thử việc / Có thời hạn / 1 năm / 2 năm / 3 năm / Không thời hạn / Thời vụ',
    ]);
    worksheet.addRow([
      '- Trình độ: Tiểu học / THCS / THPT / Trung cấp / Cao đẳng / Đại học / Thạc sĩ / Tiến sĩ ...',
    ]);
    worksheet.addRow([
      '- Trạng thái: Thử việc / Chính thức / Thời vụ / Thai sản / Đã nghỉ việc',
    ]);
    worksheet.addRow(['- Ngày tháng định dạng: DD/MM/YYYY (VD: 15/01/1990)']);

    // --- Add Data Validation (Dropdowns) ---
    const addDropdownValidation = (colKey: string, formulas: string[]) => {
      const colNumber = headers.findIndex((h) => h.key === colKey) + 1;
      if (colNumber > 0) {
        // Apply validation from row 2 to 1000
        for (let i = 2; i <= 1000; i++) {
          worksheet.getCell(i, colNumber).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`"${formulas.join(',')}"`],
          };
        }
      }
    };

    addDropdownValidation('gender', ['Nam', 'Nữ', 'Khác']);
    addDropdownValidation('maritalStatus', [
      'Độc thân',
      'Đã kết hôn',
      'Ly hôn',
      'Góa',
    ]);
    addDropdownValidation('accessCardStatus', [
      'Đã cấp',
      'Chưa cấp',
      'Hư hỏng',
      'Mất',
    ]);
    addDropdownValidation('contractType', [
      'Thử việc',
      '1 Năm',
      '2 Năm',
      '3 Năm',
      'Không thời hạn',
      'Thời vụ',
    ]);
    addDropdownValidation('education', [
      'Tiểu học',
      'THCS',
      'THPT',
      'Trung cấp',
      'Cao đẳng',
      'Đại học',
      'Thạc sĩ',
      'Tiến sĩ',
      '12/12',
      '11/12',
      '10/12',
      '9/12',
      '8/12',
      '7/12',
      '6/12',
      '5/12',
      '4/12',
      '3/12',
      '2/12',
      '1/12',
    ]);
    addDropdownValidation('employmentStatus', [
      'Thử việc',
      'Chính thức',
      'Thời vụ',
      'Thai sản',
      'Đã nghỉ việc',
    ]);

    // Removed worksheet protection to allow users to easily insert data and avoid locked cell issues

    // --- Create Data Dictionary Sheet ---
    const dictionarySheet = workbook.addWorksheet('Danh Mục', { state: 'veryHidden' });
    dictionarySheet.columns = [
      { header: 'Công Ty', key: 'company', width: 25 },
      { header: 'Nhà Máy', key: 'factory', width: 25 },
      { header: 'Khối', key: 'division', width: 25 },
      { header: 'Phòng Ban', key: 'department', width: 25 },
      { header: 'Bộ Phận', key: 'section', width: 25 },
      { header: 'Chức Danh', key: 'jobTitle', width: 25 },
      { header: 'Vị trí CV', key: 'jobPosition', width: 25 },
    ];
    this.formatHeaderRow(dictionarySheet, 'FF9E9E9E');

    // Fetch dynamic data with Redis Cache (TTL: 5 minutes)
    const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    const getCached = async <T>(
      key: string,
      fetcher: () => Promise<T>,
    ): Promise<T> => {
      const cached = await this.cacheManager.get<T>(key);
      if (cached) return cached;
      const data = await fetcher();
      await this.cacheManager.set(key, data, CACHE_TTL_MS);
      return data;
    };

    const [companies, factories, divisions, depts, sections, jobTitles, jobPositions] =
      await Promise.all([
        getCached('lookup:companies', () =>
          this.prisma.company.findMany({
            where: { deletedAt: null, status: 'ACTIVE', excludeFromFilters: false },
            select: { name: true, code: true },
          }),
        ),
        getCached('lookup:factories', () =>
          this.prisma.factory.findMany({
            where: { deletedAt: null, status: 'ACTIVE', excludeFromFilters: false },
            select: { name: true, code: true },
          }),
        ),
        getCached('lookup:divisions', () =>
          this.prisma.division.findMany({
            where: { deletedAt: null, status: 'ACTIVE', excludeFromFilters: false },
            select: { name: true, code: true },
          }),
        ),
        getCached('lookup:departments', () =>
          this.prisma.department.findMany({
            where: { deletedAt: null, status: 'ACTIVE', excludeFromFilters: false },
            select: { name: true, code: true },
          }),
        ),
        getCached('lookup:sections', () =>
          this.prisma.section.findMany({
            where: { deletedAt: null, status: 'ACTIVE', excludeFromFilters: false },
            select: { name: true, code: true },
          }),
        ),
        getCached('lookup:job-titles', () =>
          this.prisma.jobTitle.findMany({
            where: { deletedAt: null, status: 'ACTIVE' },
            select: { name: true, code: true },
          }),
        ),
        getCached('lookup:job-positions', () =>
          this.prisma.jobPosition.findMany({
            where: { deletedAt: null, status: 'ACTIVE' },
            select: { name: true, code: true },
          }),
        ),
      ]);

    const formatOpt = (obj: any) => (obj ? `${obj.code} | ${obj.name}` : '');

    const optsCompany = ['Không có', ...companies.map(formatOpt)];
    const optsFactory = ['Không có', ...factories.map(formatOpt)];
    const optsDivision = ['Không có', ...divisions.map(formatOpt)];
    const optsDept = ['Không có', ...depts.map(formatOpt)];
    const optsSection = ['Không có', ...sections.map(formatOpt)];
    const optsJobTitle = ['Không có', ...jobTitles.map(formatOpt)];
    const optsJobPosition = ['Không có', ...jobPositions.map(formatOpt)];

    const maxRows = Math.max(
      optsCompany.length,
      optsFactory.length,
      optsDivision.length,
      optsDept.length,
      optsSection.length,
      optsJobTitle.length,
      optsJobPosition.length,
    );

    for (let i = 0; i < maxRows; i++) {
      dictionarySheet.addRow({
        company: optsCompany[i] || '',
        factory: optsFactory[i] || '',
        division: optsDivision[i] || '',
        department: optsDept[i] || '',
        section: optsSection[i] || '',
        jobTitle: optsJobTitle[i] || '',
        jobPosition: optsJobPosition[i] || '',
      });
    }

    // Add dynamic validation referencing the Data Dictionary
    const addDynamicDropdown = (
      colKey: string,
      dictColLetter: string,
      rowCount: number,
    ) => {
      if (rowCount === 0) return;
      const colNumber = headers.findIndex((h) => h.key === colKey) + 1;
      if (colNumber > 0) {
        for (let i = 2; i <= 1000; i++) {
          worksheet.getCell(i, colNumber).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `'Danh Mục'!$${dictColLetter}$2:$${dictColLetter}$${rowCount + 1}`,
            ],
            showErrorMessage: false, // Turn off error block to allow typing to search in Excel
          };
        }
      }
    };

    addDynamicDropdown('companyCode', 'A', optsCompany.length);
    addDynamicDropdown('factoryCode', 'B', optsFactory.length);
    addDynamicDropdown('divisionCode', 'C', optsDivision.length);
    addDynamicDropdown('departmentCode', 'D', optsDept.length);
    addDynamicDropdown('sectionCode', 'E', optsSection.length);
    addDynamicDropdown('jobTitleCode', 'F', optsJobTitle.length);
    addDynamicDropdown('jobPositionCode', 'G', optsJobPosition.length);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=employee_import_template.xlsx',
    );

    await workbook.xlsx.write(res);
  }

  async importEmployees(
    file: Express.Multer.File,
    isPreview: boolean = false,
    userId?: string,
    autoCreateUser: boolean = true,
  ): Promise<any> {
    if (!file) throw new BadRequestException('File không được để trống');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new BadRequestException('File Excel không hợp lệ');

    const results = { success: 0, errors: [] as string[] };
    const rows: any[] = [];
    const MAX_ROWS = 500;

    // Date parser helper
    const parseDate = (val: any): Date | null => {
      if (!val) return null;
      if (val instanceof Date) {
        return isNaN(val.getTime()) ? null : val;
      }
      if (typeof val === 'string') {
        // Handle DD/MM/YYYY
        const parts = val.trim().split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // 0-indexed
          const year = parseInt(parts[2], 10);
          const d = new Date(year, month, day);
          return isNaN(d.getTime()) ? null : d;
        }
        // Fallback to standard parse
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    };

    const REVERSE_STATUS_MAP: Record<string, EmploymentStatus> = {
      'THỬ VIỆC': EmploymentStatus.PROBATION,
      'CHÍNH THỨC': EmploymentStatus.OFFICIAL,
      'ĐÃ NGHỈ VIỆC': EmploymentStatus.RESIGNED,
      PROBATION: EmploymentStatus.PROBATION,
      OFFICIAL: EmploymentStatus.OFFICIAL,
      RESIGNED: EmploymentStatus.RESIGNED,
    };

    const REVERSE_GENDER_MAP: Record<string, Gender> = {
      NAM: Gender.MALE,
      NỮ: Gender.FEMALE,
      KHÁC: Gender.OTHER,
      MALE: Gender.MALE,
      FEMALE: Gender.FEMALE,
      OTHER: Gender.OTHER,
    };

    const REVERSE_CONTRACT_MAP: Record<string, ContractType> = {
      'THỬ VIỆC': ContractType.PROBATION,
      'CÓ THỜI HẠN': ContractType.ONE_YEAR, // Mặc định 1 năm nếu chỉ ghi "Có thời hạn"
      '1 NĂM': ContractType.ONE_YEAR,
      '2 NĂM': ContractType.TWO_YEARS,
      '3 NĂM': ContractType.THREE_YEARS,
      'KHÔNG THỜI HẠN': ContractType.INDEFINITE_TERM,
      'THỜI VỤ': ContractType.SEASONAL,
      PROBATION: ContractType.PROBATION,
      // 'DEFINITE_TERM': ContractType.DEFINITE_TERM, // Removed
      ONE_YEAR: ContractType.ONE_YEAR,
      TWO_YEARS: ContractType.TWO_YEARS,
      THREE_YEARS: ContractType.THREE_YEARS,
      INDEFINITE_TERM: ContractType.INDEFINITE_TERM,
      SEASONAL: ContractType.SEASONAL,
    };

    const REVERSE_EDUCATION_MAP: Record<string, EducationLevel> = {
      'TIỂU HỌC': EducationLevel.PRIMARY,
      THCS: EducationLevel.SECONDARY,
      THPT: EducationLevel.HIGH_SCHOOL,
      'TRUNG CẤP': EducationLevel.VOCATIONAL,
      'CAO ĐẲNG': EducationLevel.COLLEGE,
      'ĐẠI HỌC': EducationLevel.UNIVERSITY,
      'THẠC SĨ': EducationLevel.MASTER,
      'TIẾN SĨ': EducationLevel.DOCTOR,
      PRIMARY: EducationLevel.PRIMARY,
      SECONDARY: EducationLevel.SECONDARY,
      HIGH_SCHOOL: EducationLevel.HIGH_SCHOOL,
      VOCATIONAL: EducationLevel.VOCATIONAL,
      COLLEGE: EducationLevel.COLLEGE,
      UNIVERSITY: EducationLevel.UNIVERSITY,
      MASTER: EducationLevel.MASTER,
      DOCTOR: EducationLevel.DOCTOR,
      '12/12': EducationLevel.GRADE_12_12,
      '11/12': EducationLevel.GRADE_11_12,
      '10/12': EducationLevel.GRADE_10_12,
      '9/12': EducationLevel.GRADE_9_12,
      '8/12': EducationLevel.GRADE_8_12,
      '7/12': EducationLevel.GRADE_7_12,
      '6/12': EducationLevel.GRADE_6_12,
      '5/12': EducationLevel.GRADE_5_12,
      '4/12': EducationLevel.GRADE_4_12,
      '3/12': EducationLevel.GRADE_3_12,
      '2/12': EducationLevel.GRADE_2_12,
      '1/12': EducationLevel.GRADE_1_12,
    };

    const MARITAL_STATUS_MAP: Record<string, MaritalStatus> = {
      'ĐỘC THÂN': MaritalStatus.SINGLE,
      'ĐÃ KẾT HÔN': MaritalStatus.MARRIED,
      'LY HÔN': MaritalStatus.DIVORCED,
      GÓA: MaritalStatus.WIDOWED,
      SINGLE: MaritalStatus.SINGLE,
      MARRIED: MaritalStatus.MARRIED,
      DIVORCED: MaritalStatus.DIVORCED,
      WIDOWED: MaritalStatus.WIDOWED,
    };

    // ALL import columns list (must match downloadTemplate exactly)
    const defaultHeaders = [
      { header: 'Mã NV (*)', key: 'employeeCode' },
      { header: 'Họ và tên (*)', key: 'fullName' },
      { header: 'Giới tính (NAM/NỮ/KHÁC)', key: 'gender' },
      { header: 'Ngày sinh (DD/MM/YYYY)', key: 'dob' },
      { header: 'Tình trạng hôn nhân', key: 'maritalStatus' },
      { header: 'Nơi sinh', key: 'birthPlace' },
      { header: 'Dân tộc', key: 'ethnicity' },
      { header: 'Tôn giáo', key: 'religion' },
      { header: 'SĐT', key: 'phone' },
      { header: 'Email công ty', key: 'emailCompany' },
      { header: 'Email cá nhân', key: 'personalEmail' },
      { header: 'SĐT khẩn cấp', key: 'emergencyPhone' },
      { header: 'Người LH khẩn cấp', key: 'emergencyContactName' },
      { header: 'Người giới thiệu', key: 'referrer' },
      { header: 'Địa chỉ thường trú', key: 'permanentAddress' },
      { header: 'Địa chỉ tạm trú', key: 'temporaryAddress' },
      { header: 'Số CMND/CCCD', key: 'nationalId' },
      { header: 'Ngày cấp (DD/MM/YYYY)', key: 'dateOfIssue' },
      { header: 'Nơi cấp', key: 'placeOfIssue' },
      { header: 'Tên ngân hàng', key: 'bankName' },
      { header: 'Chi nhánh', key: 'bankBranch' },
      { header: 'Số tài khoản', key: 'bankAccountNo' },
      { header: 'Số BHXH', key: 'socialInsuranceNo' },
      { header: 'Số BHYT', key: 'healthInsuranceNo' },
      { header: 'Mã số thuế', key: 'taxCode' },
      { header: 'Thẻ từ', key: 'accessCardStatus' },
      { header: 'Size quần', key: 'uniformPantsSize' },
      { header: 'Size áo', key: 'uniformShirtSize' },
      { header: 'Size giầy', key: 'shoeSize' },
      { header: 'Số hợp đồng', key: 'contractNumber' },
      { header: 'Loại HĐ', key: 'contractType' },
      { header: 'Ngày bắt đầu HĐ (DD/MM/YYYY)', key: 'contractStartDate' },
      { header: 'Ngày kết thúc HĐ (DD/MM/YYYY)', key: 'contractEndDate' },
      { header: 'Trình độ', key: 'education' },
      { header: 'Chuyên ngành', key: 'major' },
      { header: 'Trường', key: 'school' },
      { header: 'Năm tốt nghiệp', key: 'graduationYear' },
      { header: 'Công ty', key: 'companyCode' },
      { header: 'Nhà máy', key: 'factoryCode' },
      { header: 'Khối', key: 'divisionCode' },
      { header: 'Phòng ban', key: 'departmentCode' },
      { header: 'Bộ phận', key: 'sectionCode' },
      { header: 'Chức danh', key: 'jobTitleCode' },
      { header: 'Quản lý trực tiếp', key: 'managerCode' },
      { header: 'Trạng thái', key: 'employmentStatus' },
      { header: 'Ngày vào làm (DD/MM/YYYY)', key: 'joinedAt' },
      { header: 'Ngày nghỉ việc', key: 'resignedAt' },
      { header: 'Mã hồ sơ', key: 'recordCode' },
      { header: 'Bậc lương', key: 'salaryLevel' },
      { header: 'Mã thẻ từ', key: 'accessCardId' },
      { header: 'File đính kèm', key: 'documentFile' },
      { header: 'Ghi chú', key: 'note' },
      { header: 'Ngày tạo', key: 'createdAt' },
      { header: 'Người tạo', key: 'createdBy' },
      { header: 'Ngày cập nhật', key: 'updatedAt' },
      { header: 'Người cập nhật', key: 'updatedBy' },
    ];

    let importConfig = await this.prisma.tableColumnConfig.findFirst({
      where: { moduleKey: 'employees', name: { equals: "Import", mode: "insensitive" } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!importConfig) {
      importConfig = await this.prisma.tableColumnConfig.findFirst({
        where: { moduleKey: 'employees', applyTo: 'ALL' },
        orderBy: { updatedAt: 'desc' },
      });
    }

    let expectedHeaders = defaultHeaders;
    if (importConfig && Array.isArray(importConfig.columns)) {
      const configCols = importConfig.columns as any[];
      const visibleCols = configCols
        .filter((c) => c.visible !== false)
        .sort((a, b) => a.order - b.order);
      const headerMap = new Map(defaultHeaders.map((h) => [h.key, h]));
      expectedHeaders = visibleCols.map((c) => {
        const found = headerMap.get(c.key);
        let headerText = c.label || (found ? found.header : c.label);
        if (
          ['employeeCode', 'fullName'].includes(c.key) &&
          headerText &&
          !headerText.includes('(*)')
        ) {
          headerText += ' (*)';
        }
        return { header: headerText, key: c.key };
      });
    }

    const headerToKeyMap = new Map(
      expectedHeaders.map((h) => [h.header.trim().toLowerCase(), h.key]),
    );

    const headerRow = worksheet.getRow(1);
    const colMap: Record<string, number> = {};

    headerRow.eachCell((cell, colNumber) => {
      let val = cell.text?.toString().trim();
      if (!val) {
        if (
          cell.value &&
          typeof cell.value === 'object' &&
          'richText' in cell.value
        ) {
          val = (cell.value as any).richText
            .map((rt: any) => rt.text)
            .join('')
            .trim();
        } else if (cell.value) {
          val = cell.value.toString().trim();
        }
      }
      if (!val) return;

      const exactValLower = val.toLowerCase();

      // 1. Try exact match from Import config
      if (headerToKeyMap.has(exactValLower)) {
        colMap[headerToKeyMap.get(exactValLower)!] = colNumber;
        return;
      }

      // 2. Fallback to fuzzy matching
      const lowerVal = exactValLower.replace(/\s+/g, ' ');

      if (lowerVal.includes('mã nv') || lowerVal.includes('mã nhân viên'))
        colMap['employeeCode'] = colNumber;
      else if (
        lowerVal.includes('họ và tên') ||
        lowerVal.includes('họ tên') ||
        lowerVal.includes('tên nhân viên')
      )
        colMap['fullName'] = colNumber;
      else if (lowerVal.includes('giới tính')) colMap['gender'] = colNumber;
      else if (lowerVal.includes('ngày sinh')) colMap['dob'] = colNumber;
      else if (
        lowerVal.includes('tình trạng hôn nhân') ||
        lowerVal.includes('hôn nhân')
      )
        colMap['maritalStatus'] = colNumber;
      else if (lowerVal.includes('nơi sinh')) colMap['birthPlace'] = colNumber;
      else if (lowerVal.includes('dân tộc')) colMap['ethnicity'] = colNumber;
      else if (lowerVal.includes('tôn giáo')) colMap['religion'] = colNumber;
      else if (
        lowerVal === 'sđt' ||
        lowerVal.includes('số điện thoại') ||
        lowerVal.includes('điện thoại')
      )
        colMap['phone'] = colNumber;
      else if (lowerVal.includes('email công ty'))
        colMap['emailCompany'] = colNumber;
      else if (lowerVal.includes('email cá nhân'))
        colMap['personalEmail'] = colNumber;
      else if (
        lowerVal.includes('sđt khẩn cấp') ||
        lowerVal.includes('điện thoại khẩn') ||
        lowerVal.includes('số đt khẩn cấp') ||
        lowerVal.includes('số điện thoại khẩn cấp')
      )
        colMap['emergencyPhone'] = colNumber;
      else if (
        lowerVal.includes('người lh khẩn') ||
        lowerVal.includes('liên hệ khẩn') ||
        lowerVal.includes('liên hệ khẩn cấp') ||
        lowerVal.includes('người liên hệ khẩn cấp')
      )
        colMap['emergencyContactName'] = colNumber;
      else if (lowerVal.includes('người giới thiệu'))
        colMap['referrer'] = colNumber;
      else if (lowerVal.includes('thường trú'))
        colMap['permanentAddress'] = colNumber;
      else if (lowerVal.includes('tạm trú'))
        colMap['temporaryAddress'] = colNumber;
      else if (lowerVal.includes('ngày cấp')) colMap['dateOfIssue'] = colNumber;
      else if (lowerVal.includes('nơi cấp')) colMap['placeOfIssue'] = colNumber;
      else if (lowerVal.includes('cmnd') || lowerVal.includes('cccd'))
        colMap['nationalId'] = colNumber;
      else if (
        lowerVal.includes('ngân hàng') ||
        lowerVal.includes('tên ngân hàng')
      )
        colMap['bankName'] = colNumber;
      else if (lowerVal.includes('chi nhánh')) colMap['bankBranch'] = colNumber;
      else if (lowerVal.includes('tài khoản') || lowerVal.includes('số tk'))
        colMap['bankAccountNo'] = colNumber;
      else if (
        lowerVal.includes('bhxh') ||
        lowerVal.includes('bảo hiểm xã hội')
      )
        colMap['socialInsuranceNo'] = colNumber;
      else if (lowerVal.includes('bhyt') || lowerVal.includes('bảo hiểm y tế'))
        colMap['healthInsuranceNo'] = colNumber;
      else if (lowerVal.includes('mã số thuế') || lowerVal.includes('mst'))
        colMap['taxCode'] = colNumber;
      else if (lowerVal.includes('thẻ từ'))
        colMap['accessCardStatus'] = colNumber;
      else if (lowerVal.includes('size quần'))
        colMap['uniformPantsSize'] = colNumber;
      else if (lowerVal.includes('size áo'))
        colMap['uniformShirtSize'] = colNumber;
      else if (lowerVal.includes('size giầy') || lowerVal.includes('size giày'))
        colMap['shoeSize'] = colNumber;
      else if (lowerVal.includes('số hợp đồng') || lowerVal.includes('số hđ'))
        colMap['contractNumber'] = colNumber;
      else if (
        lowerVal.includes('loại hđ') ||
        lowerVal.includes('loại hợp đồng')
      )
        colMap['contractType'] = colNumber;
      else if (
        lowerVal.includes('ngày bắt đầu hđ') ||
        lowerVal.includes('hđ bắt đầu') ||
        lowerVal.includes('bắt đầu hợp đồng') ||
        lowerVal.includes('bắt đầu hđ') ||
        lowerVal.includes('ngày hiệu lực')
      )
        colMap['contractStartDate'] = colNumber;
      else if (
        lowerVal.includes('ngày kết thúc hđ') ||
        lowerVal.includes('hđ kết thúc') ||
        lowerVal.includes('kết thúc hợp đồng') ||
        lowerVal.includes('kết thúc hđ') ||
        lowerVal.includes('ngày hết hạn')
      )
        colMap['contractEndDate'] = colNumber;
      else if (lowerVal.includes('trình độ')) colMap['education'] = colNumber;
      else if (lowerVal.includes('chuyên ngành')) colMap['major'] = colNumber;
      else if (
        lowerVal === 'trường' ||
        lowerVal.includes('trường tốt nghiệp') ||
        lowerVal.includes('tên trường') ||
        lowerVal === 'trường đt' ||
        lowerVal === 'trường đào tạo'
      )
        colMap['school'] = colNumber;
      else if (
        lowerVal.includes('năm tốt nghiệp') ||
        lowerVal.includes('năm tn')
      )
        colMap['graduationYear'] = colNumber;
      else if (
        lowerVal.includes('mã đơn vị') ||
        lowerVal.includes('phòng ban') ||
        lowerVal.includes('đơn vị')
      )
        colMap['departmentCode'] = colNumber;
      else if (lowerVal.includes('công ty')) colMap['companyCode'] = colNumber;
      else if (lowerVal.includes('nhà máy')) colMap['factoryCode'] = colNumber;
      else if (lowerVal.includes('khối')) colMap['divisionCode'] = colNumber;
      else if (lowerVal.includes('bộ phận')) colMap['sectionCode'] = colNumber;
      else if (lowerVal.includes('chức danh') || lowerVal.includes('mã chức vụ') || lowerVal.includes('chức vụ'))
        colMap['jobTitleCode'] = colNumber;
      else if (lowerVal.includes('quản lý') || lowerVal.includes('mã quản lý'))
        colMap['managerCode'] = colNumber;
      else if (
        lowerVal.includes('trạng thái') ||
        lowerVal.includes('tình trạng')
      )
        colMap['employmentStatus'] = colNumber;
      else if (
        lowerVal.includes('ngày vào làm') ||
        lowerVal.includes('ngày vào')
      )
        colMap['joinedAt'] = colNumber;
      else if (
        lowerVal.includes('ngày nghỉ việc') ||
        lowerVal.includes('ngày nghỉ')
      )
        colMap['resignedAt'] = colNumber;
      else if (lowerVal.includes('mã hồ sơ')) colMap['recordCode'] = colNumber;
      else if (lowerVal.includes('bậc lương') || lowerVal.includes('mức lương'))
        colMap['salaryLevel'] = colNumber;
      else if (lowerVal.includes('mã thẻ từ') || lowerVal.includes('mã thẻ'))
        colMap['accessCardId'] = colNumber;
      else if (
        lowerVal.includes('file đính kèm') ||
        lowerVal.includes('file hồ sơ') ||
        lowerVal.includes('tài liệu')
      )
        colMap['documentFile'] = colNumber;
      else if (lowerVal.includes('ghi chú')) colMap['note'] = colNumber;
      else if (lowerVal.includes('ngày tạo')) colMap['createdAt'] = colNumber;
      else if (lowerVal.includes('người tạo')) colMap['createdBy'] = colNumber;
      else if (lowerVal.includes('ngày cập nhật'))
        colMap['updatedAt'] = colNumber;
      else if (lowerVal.includes('người cập nhật'))
        colMap['updatedBy'] = colNumber;
    });

    if (!colMap['employeeCode'])
      throw new BadRequestException(
        `Không tìm thấy cột 'Mã nhân viên' trong file Excel. Yêu cầu tải file mẫu chuẩn.`,
      );
    if (!colMap['fullName'])
      throw new BadRequestException(
        `Không tìm thấy cột 'Họ và tên' trong file Excel. Yêu cầu tải file mẫu chuẩn.`,
      );

    // Parse rows based on dynamic matching
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const firstCell = row.getCell(1).value?.toString() || '';
      if (
        firstCell.startsWith('Ghi chú (Hồ sơ)') ||
        firstCell.startsWith('-') ||
        !firstCell.trim()
      )
        return;

      const getVal = (key: string) => {
        if (!colMap[key]) return undefined;
        const c = row.getCell(colMap[key]);
        if (c.value === null || c.value === undefined) return undefined;

        let val = '';
        if (typeof c.value === 'object') {
          if (c.value instanceof Date) {
            val = `${c.value.getDate().toString().padStart(2, '0')}/${(c.value.getMonth() + 1).toString().padStart(2, '0')}/${c.value.getFullYear()}`;
          } else if ('richText' in c.value) {
            val = (c.value as any).richText.map((rt: any) => rt.text).join('');
          } else if ('text' in c.value) {
            val = String((c.value as any).text); // hyperlink
          } else if ('result' in c.value) {
            const rawRes = (c.value as any).result;
            // Xử lý lỗi công thức (VD: #N/A)
            if (rawRes && typeof rawRes === 'object' && 'error' in rawRes) {
              val = '';
            } else {
              val = String(rawRes); // formula result
            }
          } else if ('formula' in c.value) {
            val = '';
          } else {
            val = c.text || JSON.stringify(c.value); // fallback
          }
        } else {
          val = c.text ? c.text.toString() : String(c.value);
        }
        return val ? val.trim() : undefined;
      };

      const getCodeVal = (key: string) => {
        const val = getVal(key);
        if (!val || typeof val !== 'string') return val;
        const trimmed = val.trim();
        if (trimmed.toLowerCase() === 'không có') return undefined;
        return trimmed.split('|')[0].trim();
      };

      if (rows.length >= MAX_ROWS) {
        throw new BadRequestException(
          `File vượt giới hạn ${MAX_ROWS} dòng dữ liệu nhân viên. Vui lòng chia nhỏ file thành nhiều lần import.`,
        );
      }
      rows.push({
        rowNumber,
        employeeCode: getVal('employeeCode'),
        fullName: getVal('fullName')?.toUpperCase(),
        gender: getVal('gender'),
        dob: getVal('dob'),
        maritalStatus: getVal('maritalStatus'),
        birthPlace: getVal('birthPlace'),
        ethnicity: getVal('ethnicity'),
        religion: getVal('religion'),
        phone: getVal('phone'),
        emailCompany: getVal('emailCompany'),
        personalEmail: getVal('personalEmail'),
        emergencyPhone: getVal('emergencyPhone'),
        emergencyContactName: getVal('emergencyContactName'),
        referrer: getVal('referrer'),
        permanentAddress: getVal('permanentAddress'),
        temporaryAddress: getVal('temporaryAddress'),
        nationalId: getVal('nationalId'),
        dateOfIssue: getVal('dateOfIssue'),
        placeOfIssue: getVal('placeOfIssue'),
        bankName: getVal('bankName'),
        bankBranch: getVal('bankBranch'),
        bankAccountNo: getVal('bankAccountNo'),
        socialInsuranceNo: getVal('socialInsuranceNo'),
        healthInsuranceNo: getVal('healthInsuranceNo'),
        taxCode: getVal('taxCode'),
        accessCardStatus: getVal('accessCardStatus'),
        uniformPantsSize: getVal('uniformPantsSize'),
        uniformShirtSize: getVal('uniformShirtSize'),
        shoeSize: getVal('shoeSize'),
        contractNumber: getVal('contractNumber'),
        contractType: getVal('contractType'),
        contractStartDate: getVal('contractStartDate'),
        contractEndDate: getVal('contractEndDate'),
        education: getVal('education'),
        major: getVal('major'),
        school: getVal('school'),
        graduationYear: getVal('graduationYear'),
        companyCode: getCodeVal('companyCode'),
        factoryCode: getCodeVal('factoryCode'),
        divisionCode: getCodeVal('divisionCode'),
        departmentCode: getCodeVal('departmentCode'),
        sectionCode: getCodeVal('sectionCode'),
        jobTitleCode: getCodeVal('jobTitleCode'),
        managerCode: getCodeVal('managerCode'),
        employmentStatus: getVal('employmentStatus'),
        joinedAt: getVal('joinedAt'),
        resignedAt: getVal('resignedAt'),
        recordCode: getVal('recordCode'),
        salaryLevel: getVal('salaryLevel'),
        accessCardId: getVal('accessCardId'),
        documentFile: getVal('documentFile'),
        note: getVal('note'),
        createdAt: getVal('createdAt'),
        createdBy: getVal('createdBy'),
        updatedAt: getVal('updatedAt'),
        updatedBy: getVal('updatedBy'),
      });
    });

    const defaultPasswordHash = await bcrypt.hash('@SPC123', 10);

    // --- PRE-FLIGHT VALIDATION (Phase 3.9) ---
    // Record errors as: { rowIndex: { columnKey: errorMessage } }
    const cellErrors: Record<number, Record<string, string>> = {};
    const globalErrors: string[] = [];
    const codesInFile = new Set<string>();

    const addCellError = (rowIndex: number, colKey: string, msg: string) => {
      if (!cellErrors[rowIndex]) cellErrors[rowIndex] = {};
      cellErrors[rowIndex][colKey] = msg;
    };

    rows.forEach((row, index) => {
      const actualRowIndex = index; // 0-based array index used in frontend mapping

      if (!row.employeeCode) {
        addCellError(
          actualRowIndex,
          'employeeCode',
          'Thiếu Mã nhân viên bât buộc',
        );
      } else {
        if (codesInFile.has(row.employeeCode)) {
          addCellError(
            actualRowIndex,
            'employeeCode',
            `Mã NV bị trùng lặp trong file`,
          );
        }
        codesInFile.add(row.employeeCode);
      }

      if (!row.fullName) {
        addCellError(actualRowIndex, 'fullName', 'Thiếu Họ và tên bắt buộc');
      }
    });

    if (Object.keys(cellErrors).length > 0 || globalErrors.length > 0) {
      if (isPreview) {
        return {
          rows,
          errors:
            globalErrors.length > 0
              ? globalErrors
              : ['Kiểm tra lỗi tại các ô tô đỏ'],
          cellErrors,
          totalRows: rows.length,
          headers: expectedHeaders,
        };
      }
      throw new BadRequestException(
        'File Excel chứa dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
      );
    }
    // --- END PRE-FLIGHT VALIDATION ---

    const affectedDepartments = new Set<string>();

    try {
      await this.prisma.$transaction(
        async (tx) => {
          // Use a standard for loop to track actual 0-based index for frontend mapping
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const actualRowIndex = i;

            // Send WebSocket progress every 50 rows (only during real import, not preview)
            if (
              !isPreview &&
              userId &&
              (i % 50 === 0 || i === rows.length - 1)
            ) {
              const percent = Math.round(((i + 1) / rows.length) * 100);
              this.notificationsGateway.sendToUser(userId, 'import:progress', {
                processed: i + 1,
                total: rows.length,
                percent,
                message: `Đã xử lý ${i + 1}/${rows.length} nhân viên (${percent}%)`,
              });
            }

            try {
              let departmentId = null;
              if (row.departmentCode) {
                const dept = await tx.department.findFirst({
                  where: {
                    OR: [
                      { code: row.departmentCode },
                      {
                        name: {
                          equals: row.departmentCode,
                          mode: 'insensitive',
                        },
                      },
                    ],
                    deletedAt: null,
                  },
                });
                if (dept) {
                  departmentId = dept.id;
                } else {
                  addCellError(
                    actualRowIndex,
                    'departmentCode',
                    `Phòng ban/Đơn vị "${row.departmentCode}" không tồn tại hoặc đã bị xóa`,
                  );
                }
              }

              let companyId = null;
              if (row.companyCode) {
                const comp = await tx.company.findFirst({
                  where: {
                    OR: [
                      { code: row.companyCode },
                      {
                        name: { equals: row.companyCode, mode: 'insensitive' },
                      },
                    ],
                    deletedAt: null,
                  },
                });
                if (comp) {
                  companyId = comp.id;
                } else {
                  addCellError(
                    actualRowIndex,
                    'companyCode',
                    `Công ty "${row.companyCode}" không tồn tại hoặc đã bị xóa`,
                  );
                }
              }

              let factoryId = null;
              if (row.factoryCode) {
                const factory = await tx.factory.findFirst({
                  where: {
                    OR: [
                      { code: row.factoryCode },
                      {
                        name: { equals: row.factoryCode, mode: 'insensitive' },
                      },
                    ],
                    deletedAt: null,
                  },
                });
                if (factory) {
                  factoryId = factory.id;
                } else {
                  addCellError(
                    actualRowIndex,
                    'factoryCode',
                    `Nhà máy "${row.factoryCode}" không tồn tại hoặc đã bị xóa`,
                  );
                }
              }

              let divisionId = null;
              if (row.divisionCode) {
                const div = await tx.division.findFirst({
                  where: {
                    OR: [
                      { code: row.divisionCode },
                      {
                        name: { equals: row.divisionCode, mode: 'insensitive' },
                      },
                    ],
                    deletedAt: null,
                  },
                });
                if (div) {
                  divisionId = div.id;
                } else {
                  addCellError(
                    actualRowIndex,
                    'divisionCode',
                    `Khối "${row.divisionCode}" không tồn tại hoặc đã bị xóa`,
                  );
                }
              }

              let sectionId = null;
              if (row.sectionCode) {
                const sec = await tx.section.findFirst({
                  where: {
                    OR: [
                      { code: row.sectionCode },
                      {
                        name: { equals: row.sectionCode, mode: 'insensitive' },
                      },
                    ],
                    deletedAt: null,
                  },
                });
                if (sec) {
                  sectionId = sec.id;
                } else {
                  addCellError(
                    actualRowIndex,
                    'sectionCode',
                    `Bộ phận/Tổ "${row.sectionCode}" không tồn tại hoặc đã bị xóa`,
                  );
                }
              }

              let jobTitleId = null;
              if (row.jobTitleCode) {
                const job = await tx.jobTitle.findFirst({
                  where: {
                    OR: [
                      { code: row.jobTitleCode },
                      {
                        name: { equals: row.jobTitleCode, mode: 'insensitive' },
                      },
                    ],
                    deletedAt: null,
                  },
                });
                if (job) {
                  jobTitleId = job.id;
                } else {
                  addCellError(
                    actualRowIndex,
                    'jobTitleCode',
                    `Chức danh "${row.jobTitleCode}" không tồn tại hoặc đã bị xóa`,
                  );
                }
              }

              let managerEmployeeId = null;
              if (row.managerCode) {
                const mgrCodeTrimmed = row.managerCode.trim();
                const mgr = await tx.employee.findFirst({
                  where: {
                    OR: [
                      { employeeCode: mgrCodeTrimmed },
                      {
                        fullName: {
                          equals: mgrCodeTrimmed,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                });
                if (mgr) {
                  managerEmployeeId = mgr.id;
                } else {
                  addCellError(
                    actualRowIndex,
                    'managerCode',
                    `Quản lý "${row.managerCode}" không tồn tại`,
                  );
                }
              }

              let createdById: string | null = userId || null;
              if (!createdById && row.createdBy) {
                const cuser = await tx.user.findFirst({
                  where: { username: row.createdBy },
                });
                createdById = cuser?.id || null;
              }
              let updatedById: string | null = userId || null;
              if (!updatedById && row.updatedBy) {
                const uuser = await tx.user.findFirst({
                  where: { username: row.updatedBy },
                });
                updatedById = uuser?.id || null;
              }

              // Parse enums
              const status =
                REVERSE_STATUS_MAP[row.employmentStatus?.toUpperCase()] ||
                EmploymentStatus.PROBATION;
              const gender = row.gender
                ? REVERSE_GENDER_MAP[row.gender.toUpperCase()]
                : null;
              const maritalStatusEnum = row.maritalStatus
                ? MARITAL_STATUS_MAP[row.maritalStatus.toUpperCase()]
                : null;
              const contractType = row.contractType
                ? REVERSE_CONTRACT_MAP[row.contractType.toUpperCase()]
                : null;
              const education = row.education
                ? REVERSE_EDUCATION_MAP[row.education.toUpperCase()]
                : null;

              // Parse accessCardStatus Enum
              let accessCardStatusEnum: any = null;
              if (row.accessCardStatus) {
                const mapCard: any = {
                  'ĐÃ CẤP': 'ISSUED',
                  'CHƯA CẤP': 'NOT_ISSUED',
                  'HƯ HỎNG': 'DAMAGED',
                  HỎNG: 'DAMAGED',
                  MẤT: 'LOST',
                };
                accessCardStatusEnum =
                  mapCard[row.accessCardStatus.toUpperCase()] || null;
              }

              if (isPreview) {
                continue; // If just previewing, don't execute UPSERT
              }

              const email =
                row.emailCompany || `${row.employeeCode}@sunplast.vn`;
              let user = undefined;

              const existingUser = await tx.user.findFirst({
                where: {
                  OR: [
                    { username: row.employeeCode },
                    {
                      username: { startsWith: `${row.employeeCode}_DELETED_` },
                    },
                  ],
                },
                orderBy: { createdAt: 'desc' },
              });

              if (existingUser) {
                user = await tx.user.update({
                  where: { id: existingUser.id },
                  data: {
                    username: row.employeeCode,
                    email,
                    status: 'ACTIVE',
                    deletedAt: null,
                    deletedById: null,
                    deletedBatchId: null,
                  },
                });
              } else if (autoCreateUser) {
                user = await tx.user.create({
                  data: {
                    username: row.employeeCode,
                    email,
                    passwordHash: defaultPasswordHash,
                    status: 'ACTIVE',
                    roles: {
                      create: { role: { connect: { code: 'EMPLOYEE' } } },
                    },
                  },
                });
              }

              // Shared employee field data
              const employeeData = {
                fullName: row.fullName,
                // Basic Info
                gender,
                dob: parseDate(row.dob),
                maritalStatus: maritalStatusEnum,
                birthPlace: row.birthPlace || null,
                ethnicity: row.ethnicity || null,
                religion: row.religion || null,
                phone: row.phone || null,
                emailCompany: row.emailCompany || null,
                personalEmail: row.personalEmail || null,
                emergencyPhone: row.emergencyPhone || null,
                emergencyContactName: row.emergencyContactName || null,
                referrer: row.referrer || null,
                permanentAddress: row.permanentAddress || null,
                temporaryAddress: row.temporaryAddress || null,
                // CMND
                nationalId: row.nationalId || null,
                dateOfIssue: parseDate(row.dateOfIssue),
                placeOfIssue: row.placeOfIssue || null,
                // Bank
                bankName: row.bankName || null,
                bankBranch: row.bankBranch || null,
                bankAccountNo: row.bankAccountNo || null,
                // Insurance
                socialInsuranceNo: row.socialInsuranceNo || null,
                healthInsuranceNo: row.healthInsuranceNo || null,
                taxCode: row.taxCode || null,
                accessCardStatus: accessCardStatusEnum,
                recordCode: row.recordCode || null,
                salaryLevel: row.salaryLevel || null,
                accessCardId: row.accessCardId || null,
                documentFile: row.documentFile || null,
                note: row.note || null,
                uniformPantsSize: row.uniformPantsSize || null,
                uniformShirtSize: row.uniformShirtSize || null,
                shoeSize: row.shoeSize || null,
                // Contract
                contractNumber: row.contractNumber || null,
                contractType,
                contractStartDate: parseDate(row.contractStartDate),
                contractEndDate: parseDate(row.contractEndDate),
                // Education
                education,
                major: row.major || null,
                school: row.school || null,
                graduationYear: row.graduationYear
                  ? parseInt(row.graduationYear, 10)
                  : null,
                // Work
                companyId,
                factoryId,
                divisionId,
                departmentId,
                sectionId,
                jobTitleId,
                managerEmployeeId,
                employmentStatus: status,
                joinedAt: parseDate(row.joinedAt) || new Date(),
                resignedAt: parseDate(row.resignedAt),
                createdById,
                updatedById,
                // Restore if previously soft-deleted
                deletedAt: null,
              };

              const existingEmployee = await tx.employee.findFirst({
                where: {
                  OR: [
                    { employeeCode: row.employeeCode },
                    {
                      employeeCode: {
                        startsWith: `${row.employeeCode}_DELETED_`,
                      },
                    },
                  ],
                },
                orderBy: { createdAt: 'desc' },
              });

              if (existingEmployee) {
                const changedDept = employeeData.departmentId !== existingEmployee.departmentId;
                const changedMgr = employeeData.managerEmployeeId !== existingEmployee.managerEmployeeId;

                await tx.employee.update({
                  where: { id: existingEmployee.id },
                  data: {
                    ...employeeData,
                    employeeCode: row.employeeCode,
                    userId: user?.id || existingEmployee.userId,
                    deletedAt: null,
                    deletedById: null,
                    deletedBatchId: null,
                    updatedAt: parseDate(row.updatedAt) || new Date(),
                  },
                });

                if (changedDept || changedMgr) {
                  await tx.orgChartOverride.deleteMany({
                    where: { employeeId: existingEmployee.id, action: 'MOVE_NODE' },
                  });
                }
                if (existingEmployee.departmentId) affectedDepartments.add(existingEmployee.departmentId);
                if (employeeData.departmentId) affectedDepartments.add(employeeData.departmentId);

              } else {
                await tx.employee.create({
                  data: {
                    userId: user?.id,
                    employeeCode: row.employeeCode,
                    ...employeeData,
                    createdAt: parseDate(row.createdAt) || undefined,
                    updatedAt: parseDate(row.updatedAt) || undefined,
                  },
                });
                if (employeeData.departmentId) affectedDepartments.add(employeeData.departmentId);
              }

              results.success++;
            } catch (error: any) {
              let errorMsg = error.message;

              if (error?.code === 'P2002') {
                const target = error.meta?.target || [];
                if (target.includes('email')) {
                  errorMsg = `Email "${row.emailCompany || `${row.employeeCode}@esunplast.vn`}" đã được sử dụng.`;
                } else if (target.includes('username')) {
                  errorMsg = `Tên đăng nhập "${row.employeeCode}" đã tồn tại.`;
                } else if (target.includes('employee_code')) {
                  errorMsg = `Mã nhân viên "${row.employeeCode}" đã tồn tại trên một hồ sơ khác.`;
                } else {
                  errorMsg = `Trùng lặp dữ liệu quan trọng (${target.join(', ')}).`;
                }
              } else if (error?.code === 'P2003') {
                errorMsg = `Lỗi khoá ngoại: Không tìm thấy dữ liệu liên kết.`;
              } else if (error?.code === 'P2025') {
                errorMsg = `Lỗi truy vấn: Bản ghi không tồn tại hoặc đã bị xoá.`;
              }

              // Gắn lỗi vào dòng hiện tại
              addCellError(actualRowIndex, 'recordCode', errorMsg);

              // Fast-fail: Ném ngay lỗi để ngưng vòng lặp vì Transaction đã bị abort
              throw new BadRequestException('ROLLBACK_IMPORT');
            }
          }

          if (
            !isPreview &&
            (Object.keys(cellErrors).length > 0 || globalErrors.length > 0)
          ) {
            throw new BadRequestException('ROLLBACK_IMPORT');
          }
        },
        {
          maxWait: 15000,
          timeout: 40000,
        },
      );
    } catch (e: any) {
      if (e instanceof BadRequestException && e.message === 'ROLLBACK_IMPORT') {
        results.success = 0;
        results.errors = Object.values(cellErrors)
          .map((rowErrors) => Object.values(rowErrors))
          .flat();
      } else {
        throw e;
      }
    }

    if (isPreview) {
      return {
        rows,
        errors:
          globalErrors.length > 0
            ? globalErrors
            : ['Kiểm tra lỗi tại các ô tô đỏ'],
        cellErrors,
        totalRows: rows.length,
        headers: expectedHeaders,
      };
    }

    // Invalidate cache after successful import
    if (results.success > 0) {
      const key = 'employees:list:version';
      const current = (await this.cacheManager.get<number>(key)) || 0;
      await this.cacheManager.set(key, current + 1, 0);

      // Invalidate org chart caches
      await this.cacheManager.del('org_chart_hierarchy:all:global-config');
      for (const deptId of affectedDepartments) {
         await this.cacheManager.del(`org_chart_hierarchy:${deptId}:global-config`);
         await this.cacheManager.del(`org-chart:dept:${deptId}:DEPT-${deptId}`);
      }
    }

    return results;
  }

  /**
   * Helper function for Data Masking (Bảo mật cấp trường) cho Excel Export
   * Che giấu dữ liệu nhạy cảm nếu User không có quyền EMPLOYEE_SENSITIVE_READ
   */
  private maskEmployeeData(employee: any, user: any) {
    if (!employee) return employee;

    // Nếu có quyền xem dữ liệu nhạy cảm, trả về nguyên bản
    if (user?.permissions?.includes('EMPLOYEE_SENSITIVE_READ')) {
      return employee;
    }

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
