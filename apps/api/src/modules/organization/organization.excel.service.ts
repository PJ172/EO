import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { OrgStatus } from './dto/base-org-node.dto';

@Injectable()
export class OrganizationExcelService {
  constructor(private prisma: PrismaService) {}

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
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    headerRow.eachCell((cell) => {
      let text = cell.value?.toString() || '';
      if (
        typeof cell.value === 'object' &&
        cell.value !== null &&
        'richText' in cell.value
      ) {
        text = (cell.value as any).richText.map((rt: any) => rt.text).join('');
      }

      if (text.includes('(*)')) {
        const parts = text.split('(*)');
        cell.value = {
          richText: [
            {
              text: parts[0],
              font: { bold: true, color: { argb: 'FFFFFFFF' } },
            },
            { text: '(*)', font: { bold: true, color: { argb: 'FFFF0000' } } },
            {
              text: parts[1] || '',
              font: { bold: true, color: { argb: 'FFFFFFFF' } },
            },
          ],
        };
      }
    });
  }

  async exportDepartments(
    res: Response,
    user?: any,
    type?: string,
    params?: { search?: string; status?: string; parentCode?: string },
  ) {
    const workbook = new ExcelJS.Workbook();

    let sheetName = 'Danh sách Phòng ban';
    let fileName = 'Export_Phongban.xlsx';

    if (type === 'COMPANY') {
      sheetName = 'Danh sách Công ty';
      fileName = 'Export_Congty.xlsx';
    } else if (type === 'DIVISION') {
      sheetName = 'Danh sách Khối';
      fileName = 'Export_Khoi.xlsx';
    } else if (type === 'SECTION') {
      sheetName = 'Danh sách Bộ phận';
      fileName = 'Export_Bophan.xlsx';
    } else if (type === 'GROUP') {
      sheetName = 'Danh sách Nhóm';
      fileName = 'Export_Tonhom.xlsx';
    }

    const worksheet = workbook.addWorksheet(sheetName);

    // Check if user is admin
    const isAdmin = user?.roles?.some(
      (r: any) =>
        (typeof r === 'string' && (r === 'ADMIN' || r === 'SUPER_ADMIN')) ||
        (typeof r === 'object' &&
          (r.code === 'ADMIN' || r.code === 'SUPER_ADMIN')),
    );

    // Define columns
    // Define columns
    let columns: any[] = [];

    if (type === 'COMPANY') {
      columns = [
        { header: 'Mã công ty', key: 'code', width: 15 },
        { header: 'Tên công ty', key: 'name', width: 30 },
        { header: 'Ghi chú', key: 'note', width: 30 },
        { header: 'Trạng thái', key: 'status', width: 15 },
      ];
    } else if (type === 'DIVISION') {
      columns = [
        { header: 'Mã Khối', key: 'code', width: 15 },
        { header: 'Tên Khối', key: 'name', width: 30 },
        { header: 'Trực thuộc', key: 'parentName', width: 30 }, // Simplified header as per UI
        { header: 'Mã nhân viên', key: 'managerCode', width: 15 },
        { header: 'Quản lý phòng', key: 'managerName', width: 30 },
        { header: 'Trạng thái', key: 'status', width: 15 },
      ];
    } else if (type === 'DEPARTMENT') {
      columns = [
        { header: 'Mã Phòng ban', key: 'code', width: 15 },
        { header: 'Tên Phòng ban', key: 'name', width: 30 },
        { header: 'Trực thuộc', key: 'parentName', width: 30 },
        { header: 'Mã nhân viên', key: 'managerCode', width: 15 },
        { header: 'Quản lý phòng', key: 'managerName', width: 30 },
        { header: 'Trạng thái', key: 'status', width: 15 },
      ];
    } else if (type === 'SECTION') {
      columns = [
        { header: 'Mã Bộ phận', key: 'code', width: 15 },
        { header: 'Tên Bộ phận', key: 'name', width: 30 },
        { header: 'Trực thuộc', key: 'parentName', width: 30 },
        { header: 'Mã nhân viên', key: 'managerCode', width: 15 },
        { header: 'Quản lý phòng', key: 'managerName', width: 30 },
        { header: 'Trạng thái', key: 'status', width: 15 },
      ];
    } else if (type === 'GROUP') {
      columns = [
        { header: 'Mã Nhóm', key: 'code', width: 15 },
        { header: 'Tên Nhóm', key: 'name', width: 30 },
        { header: 'Trực thuộc', key: 'parentName', width: 30 },
        { header: 'Mã nhân viên', key: 'managerCode', width: 15 },
        { header: 'Quản lý phòng', key: 'managerName', width: 30 },
        { header: 'Trạng thái', key: 'status', width: 15 },
      ];
    } else {
      columns = [
        { header: 'Mã Phòng ban', key: 'code', width: 15 },
        { header: 'Tên Phòng ban', key: 'name', width: 30 },
        { header: 'Loại Phòng ban', key: 'type', width: 15 },
        { header: 'Mã Phòng ban Cấp trên', key: 'parentCode', width: 20 },
        { header: 'Tên Phòng ban Cấp trên', key: 'parentName', width: 30 },
        { header: 'Mã nhân viên', key: 'managerCode', width: 15 },
        { header: 'Quản lý phòng', key: 'managerName', width: 30 },
        { header: 'Trạng thái', key: 'status', width: 15 },
      ];
    }

    if (isAdmin) {
      columns.push(
        { header: 'Người tạo', key: 'createdBy', width: 20 },
        { header: 'Ngày tạo', key: 'createdAt', width: 20 },
        { header: 'Người sửa', key: 'updatedBy', width: 20 },
        { header: 'Ngày sửa', key: 'updatedAt', width: 20 },
      );
    }

    const moduleKeyMap: Record<string, string> = {
      COMPANY: 'companies',
      FACTORY: 'factories',
      DIVISION: 'divisions',
      DEPARTMENT: 'departments',
      SECTION: 'sections',
      GROUP: 'groups',
    };
    const currentModuleKey = type
      ? moduleKeyMap[type] || 'departments'
      : 'departments';

    // Fetch export config if 'PJ - Export' config name exists
    const exportConfig = await this.prisma.tableColumnConfig.findFirst({
      where: { moduleKey: currentModuleKey, name: 'PJ - Export' },
      orderBy: { updatedAt: 'desc' },
    });

    let headers = columns;
    if (exportConfig && Array.isArray(exportConfig.columns)) {
      const configCols = exportConfig.columns as any[];
      const visibleCols = configCols
        .filter((c) => c.visible !== false)
        .sort((a, b) => a.order - b.order);
      const headerMap = new Map(columns.map((h) => [h.key, h]));
      headers = visibleCols.map((c) => {
        const found = headerMap.get(c.key);
        if (found) {
          return { ...found, header: c.label || found.header };
        }
        return { header: c.label, key: c.key, width: 15 };
      });
    }

    worksheet.columns = headers;

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Fetch data — route to correct Prisma table based on type
    const statusMap: Record<string, string> = {
      ACTIVE: 'Hoạt động',
      INACTIVE: 'Ngừng hoạt động',
    };

    const searchWhere = params?.search
      ? {
          OR: [
            { code: { contains: params.search, mode: 'insensitive' as const } },
            { name: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const statusWhere = params?.status ? { status: params.status as any } : {};

    let rows: any[] = [];

    if (type === 'COMPANY') {
      // ── Query dedicated company table ──────────────────────────────────
      rows = await this.prisma.company.findMany({
        where: { deletedAt: null, ...searchWhere, ...statusWhere },
        include: {
          createdBy: isAdmin ? { select: { username: true } } : false,
          updatedBy: isAdmin ? { select: { username: true } } : false,
        },
        orderBy: { code: 'asc' },
      });

      rows.forEach((item) => {
        const rowData: any = {
          code: item.code,
          name: item.name,
          note: item.note || '',
          status: statusMap[item.status] || item.status,
        };
        if (isAdmin) {
          rowData.createdBy = item.createdBy?.username || '';
          rowData.createdAt = item.createdAt
            ? new Date(item.createdAt).toLocaleDateString('vi-VN')
            : '';
          rowData.updatedBy = item.updatedBy?.username || '';
          rowData.updatedAt = item.updatedAt
            ? new Date(item.updatedAt).toLocaleDateString('vi-VN')
            : '';
        }
        worksheet.addRow(rowData);
      });
    } else if (type === 'DIVISION') {
      // ── Query dedicated division table ─────────────────────────────────
      rows = await this.prisma.division.findMany({
        where: { deletedAt: null, ...searchWhere, ...statusWhere },
        include: {
          factory: { select: { name: true } },
          manager: { select: { employeeCode: true, fullName: true } },
          createdBy: isAdmin ? { select: { username: true } } : false,
          updatedBy: isAdmin ? { select: { username: true } } : false,
        },
        orderBy: { code: 'asc' },
      });

      rows.forEach((item) => {
        const rowData: any = {
          code: item.code,
          name: item.name,
          parentName: item.factory?.name || '',
          managerCode: item.manager?.employeeCode || '',
          managerName: item.manager?.fullName || '',
          status: statusMap[item.status] || item.status,
        };
        if (isAdmin) {
          rowData.createdBy = item.createdBy?.username || '';
          rowData.createdAt = item.createdAt
            ? new Date(item.createdAt).toLocaleDateString('vi-VN')
            : '';
          rowData.updatedBy = item.updatedBy?.username || '';
          rowData.updatedAt = item.updatedAt
            ? new Date(item.updatedAt).toLocaleDateString('vi-VN')
            : '';
        }
        worksheet.addRow(rowData);
      });
    } else if (type === 'SECTION') {
      // ── Query dedicated section table ──────────────────────────────────
      rows = await this.prisma.section.findMany({
        where: { deletedAt: null, ...searchWhere, ...statusWhere },
        include: {
          department: { select: { name: true } },
          manager: { select: { employeeCode: true, fullName: true } },
          createdBy: isAdmin ? { select: { username: true } } : false,
          updatedBy: isAdmin ? { select: { username: true } } : false,
        },
        orderBy: { code: 'asc' },
      });

      rows.forEach((item) => {
        const rowData: any = {
          code: item.code,
          name: item.name,
          parentName: item.department?.name || '',
          managerCode: item.manager?.employeeCode || '',
          managerName: item.manager?.fullName || '',
          status: statusMap[item.status] || item.status,
        };
        if (isAdmin) {
          rowData.createdBy = item.createdBy?.username || '';
          rowData.createdAt = item.createdAt
            ? new Date(item.createdAt).toLocaleDateString('vi-VN')
            : '';
          rowData.updatedBy = item.updatedBy?.username || '';
          rowData.updatedAt = item.updatedAt
            ? new Date(item.updatedAt).toLocaleDateString('vi-VN')
            : '';
        }
        worksheet.addRow(rowData);
      });
    } else {
      // ── DEPARTMENT / GROUP / default → department table ────────────────
      const deptWhere: any = { ...searchWhere, ...statusWhere };
      if (type) deptWhere.type = type;

      const departments = await this.prisma.department.findMany({
        where: deptWhere,
        include: {
          division: true,
          manager: true,
          createdBy: isAdmin ? { select: { username: true } } : false,
          updatedBy: isAdmin ? { select: { username: true } } : false,
        },
        orderBy: { code: 'asc' },
      });

      departments.forEach((dept) => {
        const rowData: any = {
          code: dept.code,
          name: dept.name,
          parentName: (dept as any).division?.name || '',
          managerCode: dept.manager?.employeeCode || '',
          managerName: dept.manager?.fullName || '',
          status: statusMap[dept.status] || dept.status,
        };

        if (isAdmin) {
          rowData.createdBy = (dept as any).createdBy?.username || '';
          rowData.createdAt = dept.createdAt
            ? new Date(dept.createdAt).toLocaleDateString('vi-VN')
            : '';
          rowData.updatedBy = (dept as any).updatedBy?.username || '';
          rowData.updatedAt = dept.updatedAt
            ? new Date(dept.updatedAt).toLocaleDateString('vi-VN')
            : '';
        }
        worksheet.addRow(rowData);
      });
    }

    // Write response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
  }

  async downloadTemplate(res: Response, type?: string) {
    const workbook = new ExcelJS.Workbook();

    // ── Type-specific config ──────────────────────────────────────────
    type OrgType =
      | 'COMPANY'
      | 'FACTORY'
      | 'DIVISION'
      | 'DEPARTMENT'
      | 'SECTION'
      | 'GROUP';
    const TYPE_META: Record<
      OrgType,
      {
        sheetName: string;
        filename: string;
        headers: { header: string; key: string; width: number }[];
        examples: any[];
        moduleKey: string;
      }
    > = {
      COMPANY: {
        sheetName: 'Mẫu nhập Công ty',
        filename: 'Template_Congty.xlsx',
        moduleKey: 'companies',
        headers: [
          { header: 'Mã công ty (*)', key: 'code', width: 20 },
          { header: 'Tên công ty (*)', key: 'name', width: 30 },
          { header: 'Ghi chú', key: 'note', width: 30 },
          { header: 'Trạng thái (*)', key: 'status', width: 20 },
        ],
        examples: [
          {
            code: 'EOFFICE_CORP',
            name: 'Tập đoàn eOffice',
            note: 'Hội sở chính',
            status: 'Hoạt động',
          },
        ],
      },
      FACTORY: {
        sheetName: 'Mẫu nhập Nhà máy',
        filename: 'Template_Nhamay.xlsx',
        moduleKey: 'factories',
        headers: [
          { header: 'Mã nhà máy (*)', key: 'code', width: 20 },
          { header: 'Tên nhà máy (*)', key: 'name', width: 30 },
          { header: 'Địa chỉ', key: 'address', width: 40 },
          { header: 'Trạng thái (*)', key: 'status', width: 20 },
        ],
        examples: [
          {
            code: 'FACTORY_HCM',
            name: 'Nhà máy Hồ Chí Minh',
            address: '123 Nguyễn Văn Cừ, Q.5, TP.HCM',
            status: 'ACTIVE',
          },
        ],
      },
      DIVISION: {
        sheetName: 'Mẫu nhập Khối',
        filename: 'Template_Khoi.xlsx',
        moduleKey: 'divisions',
        headers: [
          { header: 'Mã Khối (*)', key: 'code', width: 20 },
          { header: 'Tên Khối (*)', key: 'name', width: 30 },
          { header: 'Đơn vị cấp trên (*)', key: 'parentCode', width: 25 },
          { header: 'Quản lý khối (*)', key: 'managerCode', width: 35 },
          { header: 'Trạng thái (*)', key: 'status', width: 20 },
        ],
        examples: [
          {
            code: 'DIV_KT',
            name: 'Khối Kinh doanh',
            parentCode: 'Tổng giám đốc',
            managerCode: '24201 | Nguyễn Văn A',
            status: 'Hoạt động',
          },
        ],
      },
      DEPARTMENT: {
        sheetName: 'Mẫu nhập Phòng ban',
        filename: 'Template_Phongban.xlsx',
        moduleKey: 'departments',
        headers: [
          { header: 'Mã Phòng ban (*)', key: 'code', width: 20 },
          { header: 'Tên Phòng ban (*)', key: 'name', width: 30 },
          { header: 'Khối trực thuộc (*)', key: 'parentCode', width: 35 },
          { header: 'Quản lý phòng (*)', key: 'managerCode', width: 35 },
          { header: 'Trạng thái (*)', key: 'status', width: 20 },
        ],
        examples: [
          {
            code: 'PB_IT',
            name: 'Phòng Công nghệ thông tin',
            parentCode: 'DIV_KT | Khối Kinh doanh',
            managerCode: '24207 | Lê Văn B',
            status: 'Hoạt động',
          },
        ],
      },
      SECTION: {
        sheetName: 'Mẫu nhập Bộ phận',
        filename: 'Template_Bophan.xlsx',
        moduleKey: 'sections',
        headers: [
          { header: 'Mã Bộ phận (*)', key: 'code', width: 20 },
          { header: 'Tên Bộ phận (*)', key: 'name', width: 30 },
          { header: 'Phòng ban trực thuộc (*)', key: 'parentCode', width: 35 },
          { header: 'Quản lý bộ phận (*)', key: 'managerCode', width: 35 },
          { header: 'Trạng thái (*)', key: 'status', width: 20 },
        ],
        examples: [
          {
            code: 'BP_DEVOPS',
            name: 'Bộ phận DevOps',
            parentCode: 'PB_IT | Phòng Công nghệ thông tin',
            managerCode: '24210 | Trần Thị C',
            status: 'Hoạt động',
          },
        ],
      },
      GROUP: {
        sheetName: 'Mẫu nhập Nhóm',
        filename: 'Template_Tonhom.xlsx',
        moduleKey: 'groups',
        headers: [
          { header: 'Mã Nhóm (*)', key: 'code', width: 20 },
          { header: 'Tên Nhóm (*)', key: 'name', width: 30 },
          { header: 'Bộ phận cấp trên (*)', key: 'parentCode', width: 35 },
          { header: 'Quản lý nhóm (*)', key: 'managerCode', width: 35 },
          { header: 'Trạng thái (*)', key: 'status', width: 20 },
        ],
        examples: [
          {
            code: 'NHOM_K8S',
            name: 'Nhóm Kubernetes',
            parentCode: 'BP_DEVOPS | Bộ phận DevOps',
            managerCode: '24215 | Phạm Văn D',
            status: 'Hoạt động',
          },
        ],
      },
    };

    const orgType = (type?.toUpperCase() as OrgType) || null;
    const meta = orgType && TYPE_META[orgType] ? TYPE_META[orgType] : null;

    const sheetName = meta?.sheetName ?? 'Mẫu nhập Đơn vị';
    const filename = meta?.filename ?? 'Template_Donvi.xlsx';
    const worksheet = workbook.addWorksheet(sheetName);

    let defaultHeaders = meta?.headers ?? [
      { header: 'Mã Đơn vị (*)', key: 'code', width: 20 },
      { header: 'Tên Đơn vị (*)', key: 'name', width: 30 },
      {
        header:
          'Loại đơn vị (COMPANY/FACTORY/DIVISION/DEPARTMENT/SECTION/GROUP)',
        key: 'type',
        width: 40,
      },
      { header: 'Mã Đơn vị Cấp trên', key: 'parentCode', width: 20 },
      { header: 'Mã Quản lý (Mã NV)', key: 'managerCode', width: 20 },
    ];

    // Apply PJ-Import config if exists
    const moduleKey = meta?.moduleKey ?? 'departments';
    const importConfig = await this.prisma.tableColumnConfig.findFirst({
      where: { moduleKey, name: 'PJ - Import' },
      orderBy: { updatedAt: 'desc' },
    });

    if (importConfig && Array.isArray(importConfig.columns)) {
      const configCols = importConfig.columns as any[];
      const visibleCols = configCols
        .filter((c) => c.visible !== false)
        .sort((a, b) => a.order - b.order);
      const headerMap = new Map(defaultHeaders.map((h) => [h.key, h]));
      defaultHeaders = visibleCols.map((c) => {
        const found = headerMap.get(c.key);
        if (found) {
          let hLabel = c.label || found.header;
          if (found.header.includes('(*)') && !hLabel.includes('(*)'))
            hLabel += ' (*)';
          return { ...found, header: hLabel };
        }
        return { header: c.label, key: c.key, width: 15 };
      });
    }

    worksheet.columns = defaultHeaders;

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2196F3' },
    };

    // Add type-specific examples (or generic ones)
    const examples = meta?.examples ?? [
      {
        code: 'FACTORY_HCM',
        name: 'Nhà máy HCM',
        type: 'FACTORY',
        parentCode: 'EOFFICE_CORP',
      },
      {
        code: 'PB_IT',
        name: 'Phòng IT',
        type: 'DEPARTMENT',
        parentCode: 'FACTORY_HCM',
        managerCode: '24207',
      },
    ];
    examples.forEach((ex) => worksheet.addRow(ex));

    worksheet.addRow([
      'Lưu ý: (*) là cột bắt buộc. Mã đơn vị cấp trên phải tồn tại trong hệ thống hoặc trong file này.',
    ]);

    // --- Add Status Validation ---
    const statusColIdx =
      defaultHeaders.findIndex((h) => h.key === 'status') + 1;
    if (statusColIdx > 0) {
      for (let i = 2; i <= 1000; i++) {
        worksheet.getCell(i, statusColIdx).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"Hoạt động,Ngừng hoạt động"`],
          showErrorMessage: true,
          errorTitle: 'Giá trị không hợp lệ',
          error: 'Vui lòng chọn Hoạt động hoặc Ngừng hoạt động từ danh sách.',
        };
      }
    }

    // --- Create Data Dictionary for Parent codes and Employees ---
    const parentColIdx =
      defaultHeaders.findIndex((h) => h.key === 'parentCode') + 1;
    const managerColIdx =
      defaultHeaders.findIndex((h) => h.key === 'managerCode') + 1;

    if (
      (parentColIdx > 0 || managerColIdx > 0) &&
      orgType &&
      ['FACTORY', 'DIVISION', 'DEPARTMENT', 'SECTION', 'GROUP'].includes(
        orgType,
      )
    ) {
      const dictionarySheet = workbook.addWorksheet('Danh Mục');
      dictionarySheet.state = 'hidden'; // Hide the dictionary sheet
      dictionarySheet.columns = [
        { header: 'Đơn Vị Cấp Trên', key: 'parent', width: 40 },
        { header: 'Nhân Viên', key: 'employee', width: 40 },
      ];

      // 1. Populate Parents (Column A)
      if (parentColIdx > 0) {
        let parentItems: any[] = [];
        if (orgType === 'FACTORY') {
          parentItems = await this.prisma.company.findMany({
            where: { deletedAt: null, status: 'ACTIVE' },
            select: { code: true, name: true },
          });
        } else if (orgType === 'DIVISION') {
          parentItems = [{ code: 'Tổng giám đốc', name: '' }];
        } else if (orgType === 'DEPARTMENT') {
          parentItems = await this.prisma.division.findMany({
            where: { deletedAt: null, status: 'ACTIVE' },
            select: { code: true, name: true },
          });
        } else if (orgType === 'SECTION') {
          parentItems = await this.prisma.department.findMany({
            where: { deletedAt: null, status: 'ACTIVE' },
            select: { code: true, name: true },
          });
        } else if (orgType === 'GROUP') {
          parentItems = await this.prisma.section.findMany({
            where: { deletedAt: null, status: 'ACTIVE' },
            select: { code: true, name: true },
          });
        }

        dictionarySheet.getCell('A2').value = 'Không có';
        parentItems.forEach((item, i) => {
          dictionarySheet.getCell(`A${i + 3}`).value =
            orgType === 'DIVISION' ? item.code : `${item.code} | ${item.name}`;
        });

        const rowCount = parentItems.length + 2;

        for (let i = 2; i <= 1000; i++) {
          worksheet.getCell(i, parentColIdx).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`'Danh Mục'!$A$2:$A$${rowCount}`],
            showErrorMessage: true,
            errorTitle: 'Giá trị không hợp lệ',
            error: 'Vui lòng chọn mã đơn vị hợp lệ từ danh sách.',
          };
        }
      }

      // 2. Populate Employees (Column B)
      if (managerColIdx > 0) {
        const employees = await this.prisma.employee.findMany({
          where: { deletedAt: null },
          select: { employeeCode: true, fullName: true },
        });

        dictionarySheet.getCell('B2').value = 'Không có';
        employees.forEach((emp, i) => {
          dictionarySheet.getCell(`B${i + 3}`).value =
            `${emp.employeeCode} | ${emp.fullName}`;
        });

        const empRowCount = employees.length + 2;
        for (let i = 2; i <= 1000; i++) {
          worksheet.getCell(i, managerColIdx).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`'Danh Mục'!$B$2:$B$${empRowCount}`],
            showErrorMessage: true,
            errorTitle: 'Giá trị không hợp lệ',
            error: 'Vui lòng chọn mã nhân viên hợp lệ từ danh sách.',
          };
        }
      }
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
  }

  // ─── Import Preview (Phase 3.1) ──────────────────────────────────────────
  // Parse file and return rows WITHOUT writing to DB.
  // Same logic as importDepartments — just no Prisma calls.
  async previewImport(
    file: Express.Multer.File,
    type?: string,
  ): Promise<{
    rows: Array<{
      rowNumber: number;
      code: string;
      name: string;
      type: string;
      parentCode?: string;
      managerCode?: string;
      status?: string;
    }>;
    headers?: { key: string; header: string }[];
    errors: string[];
    totalRows: number;
  }> {
    if (!file) throw new BadRequestException('File không được để trống');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new BadRequestException('File Excel không hợp lệ');

    const rows: any[] = [];
    const MAX_ROWS = 1000;

    const getCellValue = (cell: ExcelJS.Cell): string => {
      if (!cell || cell.value === null || cell.value === undefined) return '';
      if (typeof cell.value === 'object' && 'richText' in (cell.value as any)) {
        return (cell.value as any).richText
          .map((rt: any) => rt.text)
          .join('')
          .trim();
      }
      return cell.text?.toString().trim() || cell.value.toString().trim();
    };

    const toUpperCase = (str: string): string => {
      if (!str) return str;
      return str.toUpperCase();
    };

    const reverseTypeMap: Record<string, string> = {
      'CÔNG TY': 'COMPANY',
      'NHÀ MÁY': 'FACTORY',
      KHỐI: 'DIVISION',
      'PHÒNG BAN': 'DEPARTMENT',
      'BỘ PHẬN': 'SECTION',
      NHÓM: 'GROUP',
      TỔ: 'GROUP',
    };

    const headerRow = worksheet.getRow(1);
    const colMap: Record<string, number> = {};

    headerRow.eachCell((cell, colNumber) => {
      const header = getCellValue(cell).toLowerCase();
      if (!header) return;
      if (
        !header.includes('cấp trên') &&
        !header.includes('nhân viên') &&
        (header.startsWith('mã ') || header === 'mã' || header === 'code')
      ) {
        colMap['code'] = colNumber;
      } else if (
        !header.includes('cấp trên') &&
        (header.startsWith('tên ') || header === 'tên' || header === 'name')
      ) {
        colMap['name'] = colNumber;
      } else if (header.includes('loại') || header === 'type') {
        colMap['type'] = colNumber;
      } else if (
        header.includes('cấp trên') ||
        header.includes('trực thuộc') ||
        header === 'parentcode'
      ) {
        colMap['parentCode'] = colNumber;
      } else if (
        header.includes('quản lý') ||
        header.includes('mã nhân viên') ||
        header === 'managercode'
      ) {
        colMap['managerCode'] = colNumber;
      } else if (header.includes('trạng thái') || header === 'status') {
        colMap['status'] = colNumber;
      }
    });

    if (!colMap['code'] || !colMap['name']) {
      throw new BadRequestException(
        'File thiếu các cột bắt buộc: cột Mã và cột Tên',
      );
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const firstCell = row.getCell(1).value?.toString() || '';
      if (firstCell.startsWith('Lưu ý')) return;

      const code = colMap['code']
        ? row.getCell(colMap['code']).text?.toString().trim()?.toUpperCase()
        : undefined;
      if (!code) return;

      if (rows.length >= MAX_ROWS)
        throw new BadRequestException(`File vượt giới hạn ${MAX_ROWS} dòng`);

      const rawType = colMap['type']
        ? row.getCell(colMap['type']).text?.toString().trim()?.toUpperCase()
        : undefined;
      const mappedType = rawType
        ? reverseTypeMap[rawType] || rawType
        : type?.toUpperCase() || 'DEPARTMENT';

      const rawStatus = colMap['status']
        ? row.getCell(colMap['status']).text?.toString().trim()
        : undefined;
      const mappedStatus =
        rawStatus === 'Hoạt động' || rawStatus === 'ACTIVE'
          ? 'ACTIVE'
          : rawStatus === 'Ngừng hoạt động' || rawStatus === 'INACTIVE'
            ? 'INACTIVE'
            : 'ACTIVE'; // default ACTIVE

      const vnTypeMap: Record<string, string> = {
        COMPANY: 'Công ty',
        FACTORY: 'Nhà máy',
        DIVISION: 'Khối',
        DEPARTMENT: 'Phòng ban',
        SECTION: 'Bộ phận',
        GROUP: 'Nhóm',
      };
      const vnStatusMap: Record<string, string> = {
        ACTIVE: 'Hoạt động',
        INACTIVE: 'Ngừng hoạt động',
      };

      rows.push({
        rowNumber,
        code,
        name: colMap['name']
          ? toUpperCase(getCellValue(row.getCell(colMap['name'])))
          : '',
        type: vnTypeMap[mappedType] || mappedType,
        parentCode: colMap['parentCode']
          ? getCellValue(row.getCell(colMap['parentCode']))
              .split(' | ')[0]
              ?.trim()
              ?.toUpperCase()
          : undefined,
        managerCode: colMap['managerCode']
          ? getCellValue(row.getCell(colMap['managerCode']))
              .split(' | ')[0]
              ?.trim()
              ?.toUpperCase()
          : undefined,
        status: vnStatusMap[mappedStatus] || mappedStatus,
      });
    });

    const errors: string[] = [];
    for (const row of rows) {
      if (!row.code) errors.push(`Dòng ${row.rowNumber}: [Mã] là bắt buộc`);
      if (!row.name) errors.push(`Dòng ${row.rowNumber}: [Tên] là bắt buộc`);
      // Strict Format Check: 2 letters + 5 digits
      if (row.code && !/^[A-Z]{2}\d{5}$/.test(row.code)) {
        errors.push(
          `Dòng ${row.rowNumber}: [Mã] ${row.code} sai định dạng. Cần 7 ký tự (VD: PB00001)`,
        );
      }
      if (row.name?.length > 200)
        errors.push(`Dòng ${row.rowNumber}: [Tên] tối đa 200 ký tự`);
    }

    const headers = [
      { key: 'code', header: 'Mã' },
      { key: 'name', header: 'Tên' },
      { key: 'type', header: 'Loại' },
      { key: 'parentCode', header: 'Đơn vị cấp trên' },
      { key: 'managerCode', header: 'Mã quản lý' },
      { key: 'status', header: 'Trạng thái' },
    ].filter((h) =>
      rows.some(
        (r) => r[h.key] !== undefined && r[h.key] !== null && r[h.key] !== '',
      ),
    );

    return { rows, headers, errors, totalRows: rows.length };
  }

  async importDepartments(
    file: Express.Multer.File,
    type?: string,
    userId?: string,
  ) {
    if (!file) throw new BadRequestException('File không được để trống');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new BadRequestException('File Excel không hợp lệ');

    const results = { success: 0, errors: [] as string[] };
    const rows: any[] = [];
    const MAX_ROWS = 1000;

    const getCellValue = (cell: ExcelJS.Cell): string => {
      if (!cell || cell.value === null || cell.value === undefined) return '';
      if (typeof cell.value === 'object' && 'richText' in (cell.value as any)) {
        return (cell.value as any).richText
          .map((rt: any) => rt.text)
          .join('')
          .trim();
      }
      return cell.text?.toString().trim() || cell.value.toString().trim();
    };

    // Helper for Title Case
    const toUpperCase = (str: string): string => {
      if (!str) return str;
      return str.toUpperCase();
    };

    // Reverse Type Map (VN -> Enum)
    const reverseTypeMap: Record<string, string> = {
      'CÔNG TY': 'COMPANY',
      'NHÀ MÁY': 'FACTORY',
      KHỐI: 'DIVISION',
      'PHÒNG BAN': 'DEPARTMENT',
      'BỘ PHẬN': 'SECTION',
      NHÓM: 'GROUP',
      TỔ: 'GROUP', // Support legacy
    };

    // Header Mapping — covers all org-unit column name variants
    const headerRow = worksheet.getRow(1);
    const colMap: Record<string, number> = {};

    headerRow.eachCell((cell, colNumber) => {
      const header = getCellValue(cell).toLowerCase();
      if (!header) return;

      // Code column — any "mã ..." variant but NOT "mã ... cấp trên" / "mã nhân viên"
      if (
        !header.includes('cấp trên') &&
        !header.includes('nhân viên') &&
        (header.startsWith('mã ') || header === 'mã' || header === 'code')
      ) {
        colMap['code'] = colNumber;
      }
      // Name column — any "tên ..." variant but NOT "tên ... cấp trên"
      else if (
        !header.includes('cấp trên') &&
        (header.startsWith('tên ') || header === 'tên' || header === 'name')
      ) {
        colMap['name'] = colNumber;
      }
      // Type column
      else if (header.includes('loại') || header === 'type') {
        colMap['type'] = colNumber;
      }
      // Parent code — "mã ... cấp trên" or "trực thuộc" or legacy keys
      else if (
        header.includes('cấp trên') ||
        header.includes('trực thuộc') ||
        header === 'parentcode'
      ) {
        colMap['parentCode'] = colNumber;
      }
      // Manager employee code
      else if (
        header.includes('quản lý') ||
        header.includes('mã nhân viên') ||
        header === 'managercode'
      ) {
        colMap['managerCode'] = colNumber;
      }
      // Status
      else if (header.includes('trạng thái') || header === 'status') {
        colMap['status'] = colNumber;
      }
    });

    if (!colMap['code'] || !colMap['name']) {
      throw new BadRequestException(
        'File thiếu các cột bắt buộc: cột Mã và cột Tên (vd: Mã công ty, Tên công ty)',
      );
    }

    // Step 1: Read all rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const firstCell = row.getCell(1).value?.toString() || '';
      if (firstCell.startsWith('Lưu ý')) return;

      // Use mapped columns
      const code = colMap['code']
        ? row.getCell(colMap['code']).text?.toString().trim()?.toUpperCase()
        : undefined;
      if (!code) return; // Skip empty rows

      const rawType = colMap['type']
        ? row.getCell(colMap['type']).text?.toString().trim()?.toUpperCase()
        : undefined;
      // Use URL ?type param as fallback when file has no "Loại đơn vị" column
      const mappedType = rawType
        ? reverseTypeMap[rawType] || rawType
        : type?.toUpperCase() || 'DEPARTMENT';

      if (rows.length >= MAX_ROWS) {
        throw new BadRequestException(
          `File vượt giới hạn ${MAX_ROWS} dòng. Vui lòng chia nhỏ file thành nhiều lần import.`,
        );
      }
      rows.push({
        rowNumber,
        code: code,
        name: colMap['name']
          ? toUpperCase(getCellValue(row.getCell(colMap['name'])))
          : undefined,
        type: mappedType,
        parentCode: colMap['parentCode']
          ? getCellValue(row.getCell(colMap['parentCode']))
              .split(' | ')[0]
              ?.trim()
              ?.toUpperCase()
          : undefined,
        managerCode: colMap['managerCode']
          ? getCellValue(row.getCell(colMap['managerCode']))
              .split(' | ')[0]
              ?.trim()
              ?.toUpperCase()
          : undefined,
        status: (() => {
          const s = colMap['status']
            ? getCellValue(row.getCell(colMap['status']))
            : undefined;
          return s === 'Hoạt động' || s === 'ACTIVE'
            ? 'ACTIVE'
            : s === 'Ngừng hoạt động' || s === 'INACTIVE'
              ? 'INACTIVE'
              : 'ACTIVE';
        })(),
      });
    });

    // Helper for Null Handling (User Request)
    const isNullValue = (val: string | undefined): boolean => {
      if (!val) return true;
      const normalized = val.trim().toUpperCase();
      return ['KHÔNG CÓ', 'NULL', '', '-', '(KHÔNG CÓ/NULL)'].includes(
        normalized,
      );
    };

    // Step 1.5: Row-level validation — catch data errors before touching the DB
    const validationErrors = rows
      .map((row) => {
        const errs: string[] = [];
        if (!row.code) errs.push(`Dòng ${row.rowNumber}: [Mã] là bắt buộc`);
        if (!row.name) errs.push(`Dòng ${row.rowNumber}: [Tên] là bắt buộc`);
        // Flexible Format Check: Allow any code with at least 3 characters
        if (row.code && row.code.length < 3) {
          errs.push(
            `Dòng ${row.rowNumber}: [Mã] ${row.code} quá ngắn. Cần tối thiểu 3 ký tự (Khuyến nghị 7 ký tự như PB00001)`,
          );
        }
        if (row.name && row.name.length > 200)
          errs.push(`Dòng ${row.rowNumber}: [Tên] tối đa 200 ký tự`);
        return errs;
      })
      .flat();

    if (validationErrors.length > 0) {
      return { success: 0, errors: validationErrors };
    }

    // ─── Helper: get the correct Prisma delegate based on org-type ───────────
    const getModel = (tx: any, orgType: string) => {
      switch (orgType?.toUpperCase()) {
        case 'COMPANY':
          return tx.company;
        case 'FACTORY':
          return tx.factory;
        case 'DIVISION':
          return tx.division;
        case 'SECTION':
          return tx.section;
        default:
          return tx.department;
      }
    };

    // ─── Pass 1 & 2 wrapped in a single transaction for Atomicity (Atomic Import) ───
    try {
      await this.prisma.$transaction(async (tx) => {
        // Pass 1: Upsert base records
        for (const row of rows) {
          const uType = (row.type as string)?.toUpperCase();
          const model = getModel(tx, uType);

          const baseData: any = {
            name: row.name,
            status: row.status,
            updatedById: userId,
          };

          if (uType === 'COMPANY') {
            await model.upsert({
              where: { code: row.code },
              update: baseData,
              create: { ...baseData, code: row.code, createdById: userId },
            });
          } else if (uType === 'FACTORY') {
            await model.upsert({
              where: { code: row.code },
              update: baseData,
              create: { ...baseData, code: row.code, createdById: userId },
            });
          } else if (uType === 'DIVISION') {
            await model.upsert({
              where: { code: row.code },
              update: baseData,
              create: { ...baseData, code: row.code, createdById: userId },
            });
          } else if (uType === 'SECTION') {
            await model.upsert({
              where: { code: row.code },
              update: baseData,
              create: { ...baseData, code: row.code, createdById: userId },
            });
          } else {
            await model.upsert({
              where: { code: row.code },
              update: baseData,
              create: { ...baseData, code: row.code, createdById: userId },
            });
          }
        }

        // Pass Pass 2: Update Relations
        for (const row of rows) {
          const uType = (row.type as string)?.toUpperCase();
          const model = getModel(tx, uType);
          const dataToUpdate: any = { updatedById: userId };

          // 1. Handle Parent FK
          if (uType !== 'COMPANY') {
            if (isNullValue(row.parentCode)) {
              // Explicitly set to null if template says "null" or is empty
              if (uType === 'FACTORY') dataToUpdate.companyId = null;
              else if (uType === 'DIVISION') dataToUpdate.factoryId = null;
              else if (uType === 'SECTION') dataToUpdate.departmentId = null;
              else dataToUpdate.divisionId = null;
            } else {
              // Lookup parent - if not found, THROW to trigger rollback
              let parentId: string | null = null;
              if (uType === 'FACTORY') {
                const p = await tx.company.findFirst({
                  where: {
                    OR: [
                      { code: row.parentCode },
                      { name: { equals: row.parentCode, mode: 'insensitive' } },
                    ],
                  },
                });
                if (p) parentId = p.id;
                if (!p)
                  throw new BadRequestException(
                    `Dòng ${row.rowNumber}: Không tìm thấy công ty "${row.parentCode}"`,
                  );
                dataToUpdate.companyId = parentId;
              } else if (uType === 'DIVISION') {
                const p = await tx.factory.findFirst({
                  where: {
                    OR: [
                      { code: row.parentCode },
                      { name: { equals: row.parentCode, mode: 'insensitive' } },
                    ],
                  },
                });
                if (p) parentId = p.id;
                if (!p)
                  throw new BadRequestException(
                    `Dòng ${row.rowNumber}: Không tìm thấy nhà máy "${row.parentCode}"`,
                  );
                dataToUpdate.factoryId = parentId;
              } else if (uType === 'SECTION') {
                const p = await tx.department.findFirst({
                  where: {
                    OR: [
                      { code: row.parentCode },
                      { name: { equals: row.parentCode, mode: 'insensitive' } },
                    ],
                  },
                });
                if (p) parentId = p.id;
                if (!p)
                  throw new BadRequestException(
                    `Dòng ${row.rowNumber}: Không tìm thấy phòng ban "${row.parentCode}"`,
                  );
                dataToUpdate.departmentId = parentId;
              } else {
                const p = await tx.division.findFirst({
                  where: {
                    OR: [
                      { code: row.parentCode },
                      { name: { equals: row.parentCode, mode: 'insensitive' } },
                    ],
                  },
                });
                if (p) parentId = p.id;
                if (!p)
                  throw new BadRequestException(
                    `Dòng ${row.rowNumber}: Không tìm thấy khối "${row.parentCode}"`,
                  );
                dataToUpdate.divisionId = parentId;
              }
            }
          }

          // 2. Handle Manager FK
          if (isNullValue(row.managerCode)) {
            dataToUpdate.managerEmployeeId = null;
          } else {
            const manager = await tx.employee.findFirst({
              where: {
                OR: [
                  { employeeCode: row.managerCode },
                  {
                    fullName: { equals: row.managerCode, mode: 'insensitive' },
                  },
                ],
              },
            });
            if (manager) dataToUpdate.managerEmployeeId = manager.id;
            else
              throw new BadRequestException(
                `Dòng ${row.rowNumber}: Không tìm thấy nhân viên quản lý "${row.managerCode}"`,
              );
          }

          await model.update({ where: { code: row.code }, data: dataToUpdate });
          results.success++;
        }
      });
      return results;
    } catch (e: any) {
      // Any error triggers rollback, return it in the error list
      return { success: 0, errors: [e.message] };
    }
  }
}
