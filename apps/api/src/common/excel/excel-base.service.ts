import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import type { Response } from 'express';
import { PrismaService } from '../../modules/prisma/prisma.service';

export interface ColDef {
  header: string;
  key: string;
  width?: number;
}

/**
 * Alias map: each key maps to a list of accepted header strings (lowercase).
 * Usage:
 *   { code: ['mã nhà máy', 'mã công ty', 'code'], name: ['tên nhà máy', 'name'] }
 */
export type HeaderAliasMap = Record<string, string[]>;

export interface RowValidationError {
  row: number;
  field: string;
  message: string;
}

@Injectable()
export class ExcelBaseService {
  constructor(protected prisma: PrismaService) {}

  // ─── isAdmin ──────────────────────────────────────────────────────────
  protected isAdminUser(user: any): boolean {
    return !!user?.roles?.some(
      (r: any) =>
        (typeof r === 'string' && (r === 'ADMIN' || r === 'SUPER_ADMIN')) ||
        (typeof r === 'object' &&
          (r.code === 'ADMIN' || r.code === 'SUPER_ADMIN')),
    );
  }

  // ─── Style header row ─────────────────────────────────────────────────
  protected styleHeaderRow(
    worksheet: ExcelJS.Worksheet,
    bgColor = 'FF2196F3',
    rowIndex = 1,
  ): void {
    const row = worksheet.getRow(rowIndex);
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor },
    };
    row.alignment = { vertical: 'middle', horizontal: 'left' };
  }

  // ─── Apply PJ-Export / PJ-Import column config from DB ───────────────
  protected async applyColumnConfig(
    moduleKey: string,
    configName: 'PJ - Export' | 'PJ - Import',
    defaultCols: ColDef[],
  ): Promise<ColDef[]> {
    const config = await this.prisma.tableColumnConfig.findFirst({
      where: { moduleKey, name: configName },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config || !Array.isArray(config.columns)) return defaultCols;

    const configCols = config.columns as any[];
    const visibleCols = configCols
      .filter((c) => c.visible !== false)
      .sort((a, b) => a.order - b.order);
    const colMap = new Map(defaultCols.map((h) => [h.key, h]));

    return visibleCols.map((c) => {
      const found = colMap.get(c.key);
      if (found) return { ...found, header: c.label || found.header };
      return { header: c.label, key: c.key, width: 15 };
    });
  }

  // ─── Send workbook as HTTP download ───────────────────────────────────
  protected async sendExcelResponse(
    res: Response,
    workbook: ExcelJS.Workbook,
    filename: string,
  ): Promise<void> {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
  }

  // ─── Title Case ───────────────────────────────────────────────────────
  protected toTitleCase(str: string): string {
    if (!str) return str;
    return str.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
  }

  // ─── Config-driven header parser (Phase 2.2) ──────────────────────────
  // Scans header row and maps column indices using alias lists.
  // Any future column rename only requires updating the alias list, not code.
  //
  // Example aliases:
  //   { code: ['mã nhà máy', 'mã công ty', 'code'],
  //     name: ['tên nhà máy', 'tên công ty', 'name'] }
  protected parseHeaderRow(
    headerRow: ExcelJS.Row,
    aliases: HeaderAliasMap,
  ): Record<string, number> {
    const colMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const text = cell.text?.toString().trim().toLowerCase();
      if (!text) return;
      for (const [key, aliasList] of Object.entries(aliases)) {
        if (colMap[key]) continue; // already mapped
        if (aliasList.some((alias) => text.includes(alias))) {
          colMap[key] = colNumber;
        }
      }
    });
    return colMap;
  }

  // ─── Assert required columns exist ────────────────────────────────────
  protected assertRequiredCols(
    colMap: Record<string, number>,
    required: string[],
    labels?: Record<string, string>,
  ): void {
    const missing = required.filter((k) => !colMap[k]);
    if (missing.length > 0) {
      const names = missing.map((k) => labels?.[k] ?? k).join(', ');
      throw new BadRequestException(
        `File thiếu các cột bắt buộc: ${names}. Vui lòng tải lại file mẫu.`,
      );
    }
  }

  // ─── Row-level validation (Phase 2.4) ─────────────────────────────────
  // Validates all rows at once. Returns errors WITHOUT throwing so every
  // row is checked and the user sees all problems in one go.
  //
  // Schema example:
  //   { code: { required: true, maxLength: 50, label: 'Mã' },
  //     name: { required: true, maxLength: 200, label: 'Tên' } }
  protected validateRows(
    rows: Array<{ rowNumber: number; [key: string]: any }>,
    schema: Record<
      string,
      {
        required?: boolean;
        maxLength?: number;
        label?: string;
        match?: { pattern: RegExp; message: string };
      }
    >,
  ): RowValidationError[] {
    const errors: RowValidationError[] = [];

    for (const row of rows) {
      for (const [field, rules] of Object.entries(schema)) {
        const value = row[field];
        const label = rules.label ?? field;

        if (rules.required && (!value || value.toString().trim() === '')) {
          errors.push({
            row: row.rowNumber,
            field,
            message: `Dòng ${row.rowNumber}: [${label}] là bắt buộc`,
          });
          continue;
        }

        if (
          value &&
          rules.maxLength &&
          value.toString().length > rules.maxLength
        ) {
          errors.push({
            row: row.rowNumber,
            field,
            message: `Dòng ${row.rowNumber}: [${label}] tối đa ${rules.maxLength} ký tự`,
          });
        }

        if (
          value &&
          rules.match &&
          !rules.match.pattern.test(value.toString())
        ) {
          errors.push({
            row: row.rowNumber,
            field,
            message: `Dòng ${row.rowNumber}: [${label}] ${rules.match.message}`,
          });
        }
      }
    }

    return errors;
  }
}
