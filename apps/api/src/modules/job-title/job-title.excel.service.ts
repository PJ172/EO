import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class JobTitleExcelService {
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

  async exportJobTitles(res: any, params: { search?: string }, user?: any) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách Chức danh');

    // Check if user is admin
    const isAdmin = user?.roles?.some(
      (r: any) =>
        (typeof r === 'string' && (r === 'ADMIN' || r === 'SUPER_ADMIN')) ||
        (typeof r === 'object' &&
          (r.code === 'ADMIN' || r.code === 'SUPER_ADMIN')),
    );

    // Define columns
    const columns = [
      { header: 'Mã Chức danh', key: 'code', width: 15 },
      { header: 'Tên Chức danh', key: 'name', width: 30 },
      { header: 'Mô tả', key: 'description', width: 40 },
      { header: 'SL Nhân viên', key: 'employeeCount', width: 15 },
    ];

    if (isAdmin) {
      columns.push(
        { header: 'Người tạo', key: 'createdBy', width: 20 },
        { header: 'Ngày tạo', key: 'createdAt', width: 20 },
        { header: 'Người sửa', key: 'updatedBy', width: 20 },
        { header: 'Ngày sửa', key: 'updatedAt', width: 20 },
      );
    }

    // Fetch export config: Export by name → fallback to ALL config
    let exportConfig = await this.prisma.tableColumnConfig.findFirst({
      where: { moduleKey: 'job-titles', name: { equals: "Export", mode: "insensitive" } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!exportConfig) {
      exportConfig = await this.prisma.tableColumnConfig.findFirst({
        where: { moduleKey: 'job-titles', applyTo: 'ALL' },
        orderBy: { updatedAt: 'desc' },
      });
    }

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

    const where: any = {};
    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const jobTitles = await this.prisma.jobTitle.findMany({
      where,
      include: {
        _count: { select: { employees: true } },
        createdBy: isAdmin ? { select: { username: true } } : false,
        updatedBy: isAdmin ? { select: { username: true } } : false,
      },
      orderBy: { code: 'asc' },
    });

    jobTitles.forEach((job: any) => {
      const rowData: any = {
        code: job.code,
        name: job.name,
        description: job.description || '',
        employeeCount: job._count.employees,
      };

      if (isAdmin) {
        rowData.createdBy = job.createdBy?.username || '';
        rowData.createdAt = job.createdAt
          ? new Date(job.createdAt).toLocaleDateString('vi-VN')
          : '';
        rowData.updatedBy = job.updatedBy?.username || '';
        rowData.updatedAt = job.updatedAt
          ? new Date(job.updatedAt).toLocaleDateString('vi-VN')
          : '';
      }

      worksheet.addRow(rowData);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Export_Chucdanh.xlsx',
    );

    await workbook.xlsx.write(res);
  }

  async getTemplate(res: any) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Mẫu nhập');

    const defaultHeaders = [
      { header: 'Mã Chức danh (*)', key: 'code', width: 20 },
      { header: 'Tên Chức danh (*)', key: 'name', width: 30 },
      { header: 'Mô tả', key: 'description', width: 40 },
      { header: 'Trạng thái (*)', key: 'status', width: 25 },
    ];

    // Read Import config → fallback to ALL config
    let importConfig = await this.prisma.tableColumnConfig.findFirst({
      where: { moduleKey: 'job-titles', name: { equals: "Import", mode: "insensitive" } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!importConfig) {
      importConfig = await this.prisma.tableColumnConfig.findFirst({
        where: { moduleKey: 'job-titles', applyTo: 'ALL' },
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
        if (found) {
          let hLabel = c.label || found.header;
          if (found.header.includes('(*)') && !hLabel.includes('(*)'))
            hLabel += ' (*)';
          return { ...found, header: hLabel };
        }
        return { header: c.label, key: c.key, width: 15 };
      });
    }

    worksheet.columns = headers;

    this.formatHeaderRow(worksheet, 'FF2196F3');

    // Examples
    worksheet.addRow({
      code: 'CV00001',
      name: 'Lập trình viên',
      description: 'Phát triển phần mềm',
      status: 'Hoạt động',
    });
    worksheet.addRow({
      code: 'CV00002',
      name: 'Kiểm thử phần mềm',
      description: 'Đảm bảo chất lượng',
      status: 'Hoạt động',
    });
    worksheet.addRow([
      'Lưu ý: (*) là cột bắt buộc. Nếu Mã đã tồn tại, dữ liệu sẽ được cập nhật.',
    ]);

    // Add Status Validation
    const statusColIdx =
      defaultHeaders.findIndex((h) => h.key === 'status') + 1;
    if (statusColIdx > 0) {
      for (let i = 2; i <= 1000; i++) {
        const cell = worksheet.getCell(i, statusColIdx);
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"Hoạt động,Ngừng hoạt động"`],
          showErrorMessage: true,
          errorTitle: 'Giá trị không hợp lệ',
          error: 'Vui lòng chọn Hoạt động hoặc Ngừng hoạt động từ danh sách.',
        };
      }
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Template_Chucvu.xlsx',
    );

    await workbook.xlsx.write(res);
  }

  // ─── Import Preview (Phase 3.1) ──────────────────────────────────────────
  async previewImport(file: Express.Multer.File): Promise<{
    rows: Array<{
      rowNumber: number;
      code: string;
      name: string;
      description?: string;
    }>;
    errors: string[];
    totalRows: number;
  }> {
    if (!file) throw new BadRequestException('File không được để trống');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new BadRequestException('File Excel không hợp lệ');

    const rows: any[] = [];
    const MAX_ROWS = 500;

    const toUpperCase = (str: string): string => {
      if (!str) return str;
      return str.toUpperCase();
    };

    const JOBTITLE_ALIASES: Record<string, string[]> = {
      code: ['mã chức danh', 'mã chức vụ', 'code'],
      name: ['tên chức danh', 'tên chức vụ', 'name'],
      description: ['mô tả', 'description'],
      status: ['trạng thái', 'status'],
    };

    const colMap: Record<string, number> = {};
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const text = cell.text?.toString().trim().toLowerCase();
      if (!text) return;
      for (const [key, aliasList] of Object.entries(JOBTITLE_ALIASES)) {
        if (colMap[key]) continue;
        if (aliasList.some((alias) => text.includes(alias))) {
          colMap[key] = colNumber;
        }
      }
    });

    if (!colMap['code'] || !colMap['name']) {
      throw new BadRequestException(
        'File thiếu các cột bắt buộc: Mã Chức danh, Tên Chức danh. Vui lòng tải lại file mẫu.',
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

      const rawName = colMap['name']
        ? row.getCell(colMap['name']).text?.toString().trim()
        : undefined;
      const name = toUpperCase(rawName || '');

      if (rows.length >= MAX_ROWS) {
        throw new BadRequestException(
          `File vượt giới hạn ${MAX_ROWS} dòng. Vui lòng chia nhỏ file thành nhiều lần import.`,
        );
      }
      rows.push({
        rowNumber,
        code,
        name,
        description: colMap['description']
          ? row.getCell(colMap['description']).text?.toString().trim()
          : '',
        status: colMap['status']
          ? row.getCell(colMap['status']).text?.toString().trim()
          : '',
      });
    });

    const validationErrors: string[] = [];
    for (const row of rows) {
      if (!row.code)
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Mã chức danh] là bắt buộc`,
        );
      if (!row.name)
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Tên chức danh] là bắt buộc`,
        );
      // Strict Format Check: CV + 5 digits
      if (row.code && !/^CV\d{5}$/.test(row.code)) {
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Mã] ${row.code} sai định dạng. Cần CV + 5 chữ số (VD: CV00001)`,
        );
      }
      if (row.name && row.name.length > 200)
        validationErrors.push(`Dòng ${row.rowNumber}: [Tên] tối đa 200 ký tự`);
      if (
        row.status &&
        row.status !== 'Hoạt động' &&
        row.status !== 'Ngừng hoạt động'
      ) {
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Trạng thái] chỉ nhận giá trị "Hoạt động" hoặc "Ngừng hoạt động"`,
        );
      }
    }

    return { rows, errors: validationErrors, totalRows: rows.length };
  }

  async importJobTitles(file: Express.Multer.File, userId?: string) {
    if (!file) throw new BadRequestException('File không được để trống');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new BadRequestException('File Excel không hợp lệ');

    const results = { success: 0, failed: 0, errors: [] as string[] };
    const rows: any[] = [];
    const MAX_ROWS = 500;

    // Helper for Title Case
    const toUpperCase = (str: string): string => {
      if (!str) return str;
      return str.toUpperCase();
    };

    // Config-driven header mapping (Phase 2.2)
    const JOBTITLE_ALIASES: Record<string, string[]> = {
      code: ['mã chức danh', 'mã chức vụ', 'code'],
      name: ['tên chức danh', 'tên chức vụ', 'name'],
      description: ['mô tả', 'description'],
      status: ['trạng thái', 'status'],
    };

    const colMap: Record<string, number> = {};
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const text = cell.text?.toString().trim().toLowerCase();
      if (!text) return;
      for (const [key, aliasList] of Object.entries(JOBTITLE_ALIASES)) {
        if (colMap[key]) continue;
        if (aliasList.some((alias) => text.includes(alias))) {
          colMap[key] = colNumber;
        }
      }
    });

    if (!colMap['code'] || !colMap['name']) {
      throw new BadRequestException(
        'File thiếu các cột bắt buộc: Mã Chức danh, Tên Chức danh. Vui lòng tải lại file mẫu.',
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

      const rawName = colMap['name']
        ? row.getCell(colMap['name']).text?.toString().trim()
        : undefined;
      const name = toUpperCase(rawName || '');

      if (rows.length >= MAX_ROWS) {
        throw new BadRequestException(
          `File vượt giới hạn ${MAX_ROWS} dòng. Vui lòng chia nhỏ file thành nhiều lần import.`,
        );
      }
      rows.push({
        rowNumber,
        code,
        name,
        description: colMap['description']
          ? row.getCell(colMap['description']).text?.toString().trim()
          : '',
        status: colMap['status']
          ? row.getCell(colMap['status']).text?.toString().trim()
          : '',
      });
    });

    // Helper for Null Handling
    const isNullValue = (val: string | undefined): boolean => {
      if (!val) return true;
      const normalized = val.trim().toUpperCase();
      return ['KHÔNG CÓ', 'NULL', '', '-', '(KHÔNG CÓ/NULL)'].includes(
        normalized,
      );
    };

    // Pre-flight row validation — all errors returned before any DB write (Phase 2.4)
    const validationErrors: string[] = [];
    for (const row of rows) {
      if (!row.code)
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Mã chức danh] là bắt buộc`,
        );
      if (!row.name)
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Tên chức danh] là bắt buộc`,
        );
      // Strict Format Check: CV + 5 digits
      if (row.code && !/^CV\d{5}$/.test(row.code)) {
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Mã] ${row.code} sai định dạng. Cần CV + 5 chữ số (VD: CV00001)`,
        );
      }
      if (row.name && row.name.length > 200)
        validationErrors.push(`Dòng ${row.rowNumber}: [Tên] tối đa 200 ký tự`);
      if (
        row.status &&
        row.status !== 'Hoạt động' &&
        row.status !== 'Ngừng hoạt động'
      ) {
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Trạng thái] chỉ nhận giá trị "Hoạt động" hoặc "Ngừng hoạt động"`,
        );
      }
    }
    if (validationErrors.length > 0) {
      return {
        success: 0,
        failed: validationErrors.length,
        errors: validationErrors,
      };
    }

    // Execute all upserts in a single transaction (Phase 1)
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const statusEng =
            row.status === 'Ngừng hoạt động' ? 'INACTIVE' : 'ACTIVE';
          await tx.jobTitle.upsert({
            where: { code: row.code },
            update: {
              name: row.name,
              description: isNullValue(row.description)
                ? null
                : row.description,
              status: statusEng,
              updatedById: userId,
            },
            create: {
              code: row.code,
              name: row.name,
              description: isNullValue(row.description)
                ? null
                : row.description,
              status: statusEng,
              createdById: userId,
              updatedById: userId,
            },
          });
          results.success++;
        }
      });
      return results;
    } catch (transactionError: any) {
      // The transaction failed and was rolled back
      return {
        success: 0,
        failed: rows.length,
        errors: [transactionError.message],
      };
    }
  }
}
