import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { FactoryStatus } from '@prisma/client';

@Injectable()
export class FactoryExcelService {
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

  async exportFactories(
    res: Response,
    params: { search?: string; status?: string },
    user?: any,
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách Nhà máy');

    // Check if user is admin
    // Handle both string[] and object[] roles
    const isAdmin = user?.roles?.some(
      (r: any) =>
        (typeof r === 'string' && (r === 'ADMIN' || r === 'SUPER_ADMIN')) ||
        (typeof r === 'object' &&
          (r.code === 'ADMIN' || r.code === 'SUPER_ADMIN')),
    );

    // Define columns
    const columns = [
      { header: 'Mã Nhà máy', key: 'code', width: 15 },
      { header: 'Tên Nhà máy', key: 'name', width: 30 },
      { header: 'Địa chỉ', key: 'address', width: 40 },
      { header: 'Trạng thái', key: 'status', width: 15 },
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
      where: { moduleKey: 'factories', name: { equals: "Export", mode: "insensitive" } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!exportConfig) {
      exportConfig = await this.prisma.tableColumnConfig.findFirst({
        where: { moduleKey: 'factories', applyTo: 'ALL' },
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

    // Filters
    const where: any = {};
    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.status) {
      where.status = params.status as FactoryStatus;
    }

    // Fetch data with relations
    const factories = await this.prisma.factory.findMany({
      where,
      include: {
        createdBy: { select: { username: true } },
        updatedBy: { select: { username: true } },
      },
      orderBy: { code: 'asc' },
    });

    const statusMap: Record<string, string> = {
      ACTIVE: 'Hoạt động',
      INACTIVE: 'Ngừng hoạt động',
    };

    factories.forEach((factory: any) => {
      const rowData: any = {
        code: factory.code,
        name: factory.name,
        address: factory.address || '',
        status: statusMap[factory.status] || factory.status,
      };

      if (isAdmin) {
        rowData.createdBy = factory.createdBy?.username || '';
        rowData.createdAt = factory.createdAt
          ? new Date(factory.createdAt).toLocaleDateString('vi-VN')
          : '';
        rowData.updatedBy = factory.updatedBy?.username || '';
        rowData.updatedAt = factory.updatedAt
          ? new Date(factory.updatedAt).toLocaleDateString('vi-VN')
          : '';
      }

      worksheet.addRow(rowData);
    });

    // Write response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Export_Nhamay.xlsx',
    );

    await workbook.xlsx.write(res);
  }

  async downloadTemplate(res: Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Mẫu nhập');

    const defaultHeaders = [
      { header: 'Mã Nhà máy (*)', key: 'code', width: 20 },
      { header: 'Tên Nhà máy (*)', key: 'name', width: 30 },
      { header: 'Địa chỉ', key: 'address', width: 40 },
      { header: 'Trạng thái (*)', key: 'status', width: 25 },
    ];

    // Read Import config → fallback to ALL config
    let importConfig = await this.prisma.tableColumnConfig.findFirst({
      where: { moduleKey: 'factories', name: { equals: "Import", mode: "insensitive" } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!importConfig) {
      importConfig = await this.prisma.tableColumnConfig.findFirst({
        where: { moduleKey: 'factories', applyTo: 'ALL' },
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
      code: 'FACTORY_01',
      name: 'Nhà máy 1',
      address: 'KCN VSIP 1, Bình Dương',
      status: 'Hoạt động',
    });

    // Add instruction text to a merged cell at the top or just rely on column headers.
    // We remove the explicit "Lưu ý" row that acts as data row to prevent import errors.

    // Add Status Validation
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

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Template_Nhamay.xlsx',
    );

    await workbook.xlsx.write(res);
  }

  // ─── Import Preview (Phase 3.1) ──────────────────────────────────────────
  async previewImport(file: Express.Multer.File): Promise<{
    rows: Array<{
      rowNumber: number;
      code: string;
      name: string;
      address?: string;
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
    const MAX_ROWS = 500;

    const toUpperCase = (str: string): string => {
      if (!str) return str;
      return str.toUpperCase();
    };

    const FACTORY_ALIASES: Record<string, string[]> = {
      code: ['mã nhà máy', 'mã nm', 'code'],
      name: ['tên nhà máy', 'tên nm', 'name'],
      address: ['địa chỉ', 'address'],
      status: ['trạng thái', 'status'],
    };

    const colMap: Record<string, number> = {};
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const text = cell.text?.toString().trim().toLowerCase();
      if (!text) return;
      for (const [key, aliasList] of Object.entries(FACTORY_ALIASES)) {
        if (colMap[key]) continue;
        if (aliasList.some((alias) => text.includes(alias))) {
          colMap[key] = colNumber;
        }
      }
    });

    if (!colMap['code'] || !colMap['name']) {
      throw new BadRequestException(
        'File thiếu các cột bắt buộc: Mã Nhà máy, Tên Nhà máy. Vui lòng tải lại file mẫu.',
      );
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const codeRaw = colMap['code']
        ? row.getCell(colMap['code']).text?.toString().trim()
        : undefined;
      const code = codeRaw?.toUpperCase();

      const rawName = colMap['name']
        ? row.getCell(colMap['name']).text?.toString().trim()
        : undefined;

      // Skip rows completely empty or containing instructions
      if (!codeRaw && !rawName) return;
      if (
        typeof codeRaw === 'string' &&
        codeRaw.toLowerCase().includes('lưu ý')
      )
        return;
      if (
        typeof rawName === 'string' &&
        rawName.toLowerCase().includes('lưu ý')
      )
        return;
      const name = toUpperCase(rawName || '');

      if (rows.length >= MAX_ROWS) {
        throw new BadRequestException(
          `File vượt giới hạn ${MAX_ROWS} dòng. Vui lòng chia nhỏ file thành nhiều lần import.`,
        );
      }
      const rawStatus = colMap['status']
        ? row.getCell(colMap['status']).text?.toString().trim()?.toUpperCase()
        : 'ACTIVE';
      const mappedStatus =
        rawStatus === 'NGỪNG HOẠT ĐỘNG' || rawStatus === 'INACTIVE'
          ? 'Ngừng hoạt động'
          : 'Hoạt động';

      rows.push({
        rowNumber,
        code,
        name,
        address: colMap['address']
          ? row.getCell(colMap['address']).text?.toString().trim()
          : undefined,
        status: mappedStatus,
      });
    });

    const validationErrors: string[] = [];
    for (const row of rows) {
      if (!row.code)
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Mã nhà máy] là bắt buộc`,
        );
      if (!row.name)
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Tên nhà máy] là bắt buộc`,
        );
      // Strict Format Check: NM + 5 digits
      if (row.code && !/^NM\d{5}$/.test(row.code)) {
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Mã nhà máy] ${row.code} sai định dạng. Cần NM + 5 chữ số (VD: NM00001)`,
        );
      }
      if (row.name && row.name.length > 200)
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Tên nhà máy] tối đa 200 ký tự`,
        );
    }

    const headers = [
      { key: 'code', header: 'Mã nhà máy' },
      { key: 'name', header: 'Tên nhà máy' },
      { key: 'address', header: 'Địa chỉ' },
      { key: 'status', header: 'Trạng thái' },
    ].filter((h) =>
      rows.some(
        (r) => r[h.key] !== undefined && r[h.key] !== null && r[h.key] !== '',
      ),
    );

    return { rows, headers, errors: validationErrors, totalRows: rows.length };
  }

  async importFactories(file: Express.Multer.File, userId?: string) {
    if (!file) throw new BadRequestException('File không được để trống');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new BadRequestException('File Excel không hợp lệ');

    const results = { success: 0, errors: [] as string[] };
    const rows: any[] = [];
    const MAX_ROWS = 500;

    // Helper for Title Case
    const toUpperCase = (str: string): string => {
      if (!str) return str;
      return str.toUpperCase();
    };

    // Config-driven header mapping (Phase 2.2)
    // Add aliases here when column names change — no code changes needed elsewhere
    const FACTORY_ALIASES: Record<string, string[]> = {
      code: ['mã nhà máy', 'mã nm', 'code'],
      name: ['tên nhà máy', 'tên nm', 'name'],
      address: ['địa chỉ', 'address'],
      status: ['trạng thái', 'status'],
    };

    const colMap: Record<string, number> = {};
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const text = cell.text?.toString().trim().toLowerCase();
      if (!text) return;
      for (const [key, aliasList] of Object.entries(FACTORY_ALIASES)) {
        if (colMap[key]) continue;
        if (aliasList.some((alias) => text.includes(alias))) {
          colMap[key] = colNumber;
        }
      }
    });

    if (!colMap['code'] || !colMap['name']) {
      throw new BadRequestException(
        'File thiếu các cột bắt buộc: Mã Nhà máy, Tên Nhà máy. Vui lòng tải lại file mẫu.',
      );
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const codeRaw = colMap['code']
        ? row.getCell(colMap['code']).text?.toString().trim()
        : undefined;
      const code = codeRaw?.toUpperCase();

      const rawName = colMap['name']
        ? row.getCell(colMap['name']).text?.toString().trim()
        : undefined;

      // Skip rows completely empty or containing instructions
      if (!codeRaw && !rawName) return;
      if (
        typeof codeRaw === 'string' &&
        codeRaw.toLowerCase().includes('lưu ý')
      )
        return;
      if (
        typeof rawName === 'string' &&
        rawName.toLowerCase().includes('lưu ý')
      )
        return;
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
        address: colMap['address']
          ? row.getCell(colMap['address']).text?.toString().trim()
          : undefined,
        status: colMap['status']
          ? row.getCell(colMap['status']).text?.toString().trim()?.toUpperCase()
          : 'ACTIVE',
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

    // Row-level validation — return all errors before any DB write (Phase 2.4)
    const validationErrors: string[] = [];
    for (const row of rows) {
      if (!row.code)
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Mã nhà máy] là bắt buộc`,
        );
      if (!row.name)
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Tên nhà máy] là bắt buộc`,
        );
      // Strict Format Check: NM + 5 digits
      if (row.code && !/^NM\d{5}$/.test(row.code)) {
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Mã nhà máy] ${row.code} sai định dạng. Cần NM + 5 chữ số (VD: NM00001)`,
        );
      }
      if (row.name && row.name.length > 200)
        validationErrors.push(
          `Dòng ${row.rowNumber}: [Tên nhà máy] tối đa 200 ký tự`,
        );
    }
    if (validationErrors.length > 0) {
      return { success: 0, errors: validationErrors };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of rows) {
          const status =
            row.status === 'INACTIVE' || row.status === 'NGỪNG HOẠT ĐỘNG'
              ? FactoryStatus.INACTIVE
              : FactoryStatus.ACTIVE;

          await tx.factory.upsert({
            where: { code: row.code },
            update: {
              name: row.name,
              address: row.address,
              status,
              updatedById: userId,
            },
            create: {
              code: row.code,
              name: row.name,
              address: row.address,
              status,
              createdById: userId,
              updatedById: userId,
            },
          });
          results.success++;
        }
      });
      return results;
    } catch (transactionError: any) {
      return { success: 0, errors: [transactionError.message] };
    }
  }
}
