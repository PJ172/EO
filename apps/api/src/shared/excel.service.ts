import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelExportOptions {
  sheetName?: string;
  columns: ExcelColumn[];
  data: any[];
  headerStyle?: Partial<ExcelJS.Style>;
}

export interface ExcelImportResult<T> {
  success: T[];
  failed: { row: number; error: string; data?: any }[];
}

@Injectable()
export class ExcelService {
  /**
   * Export data to Excel buffer
   */
  async exportToExcel(options: ExcelExportOptions): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'eOffice System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(options.sheetName || 'Data');

    // Set columns
    sheet.columns = options.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20,
    }));

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Add data rows
    options.data.forEach((row) => {
      const dataRow: Record<string, any> = {};
      options.columns.forEach((col) => {
        dataRow[col.key] = this.getCellValue(row, col.key);
      });
      sheet.addRow(dataRow);
    });

    // Add borders to all cells
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Auto-filter
    if (options.data.length > 0) {
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: options.columns.length },
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export multiple sheets to Excel buffer
   */
  async exportMultiSheetExcel(sheets: ExcelExportOptions[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'eOffice System';
    workbook.created = new Date();

    for (const options of sheets) {
      const sheet = workbook.addWorksheet(options.sheetName || 'Data');

      // Set columns
      sheet.columns = options.columns.map((col) => ({
        header: col.header,
        key: col.key,
        width: col.width || 20,
      }));

      // Style header row
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      // Add data rows
      options.data.forEach((row) => {
        const dataRow: Record<string, any> = {};
        options.columns.forEach((col) => {
          dataRow[col.key] = this.getCellValue(row, col.key);
        });
        sheet.addRow(dataRow);
      });

      // Add borders to all cells
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      });

      // Auto-filter (only if data exists)
      if (options.data.length > 0) {
        sheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: options.columns.length },
        };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Create import template with example data
   */
  async createTemplate(
    columns: ExcelColumn[],
    exampleData?: any[],
    sheetName = 'Template',
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName);

    // Set columns
    sheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20,
    }));

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add example data if provided
    if (exampleData && exampleData.length > 0) {
      exampleData.forEach((row) => {
        sheet.addRow(row);
      });

      // Style example row (different color)
      const exampleRow = sheet.getRow(2);
      exampleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' },
      };
      exampleRow.font = { italic: true, color: { argb: 'FF666666' } };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Parse Excel file and return rows as objects
   * @param columns Can be an array of property keys (strings) or ExcelColumn objects to map localized headers to keys
   */
  async parseExcel<T>(
    buffer: Buffer | ArrayBuffer,
    columns: (string | ExcelColumn)[],
    validator?: (row: Record<string, any>, rowNum: number) => T | null,
  ): Promise<ExcelImportResult<T>> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as ArrayBuffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return { success: [], failed: [{ row: 0, error: 'No worksheet found' }] };
    }

    const result: ExcelImportResult<T> = { success: [], failed: [] };

    // Get header row to map column names
    const headerRow = sheet.getRow(1);
    const columnMap: Record<number, string> = {};

    headerRow.eachCell((cell, colNumber) => {
      const header = String(cell.value || '')
        .toLowerCase()
        .trim();
      const matchedCol = columns.find((c) => {
        if (typeof c === 'string') {
          return (
            c.toLowerCase() === header ||
            c.toLowerCase().replace(/[_\s]/g, '') ===
              header.replace(/[_\s]/g, '')
          );
        } else {
          return (
            c.header.toLowerCase() === header ||
            c.key.toLowerCase() === header ||
            c.header.toLowerCase().replace(/[_\s]/g, '') ===
              header.replace(/[_\s]/g, '')
          );
        }
      });

      if (matchedCol) {
        columnMap[colNumber] =
          typeof matchedCol === 'string' ? matchedCol : matchedCol.key;
      }
    });

    // Process data rows (skip header)
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rowData: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const colName = columnMap[colNumber];
        if (colName) {
          rowData[colName] = this.parseCellValue(cell);
        }
      });

      // Skip empty rows
      if (
        Object.values(rowData).every(
          (v) => v === '' || v === null || v === undefined,
        )
      ) {
        return;
      }

      try {
        if (validator) {
          const validated = validator(rowData, rowNumber);
          if (validated) {
            result.success.push(validated);
          } else {
            result.failed.push({
              row: rowNumber,
              error: 'Validation failed',
              data: rowData,
            });
          }
        } else {
          result.success.push(rowData as T);
        }
      } catch (err: any) {
        result.failed.push({
          row: rowNumber,
          error: err.message,
          data: rowData,
        });
      }
    });

    return result;
  }

  private getCellValue(obj: any, key: string): any {
    // Support nested keys like "employee.fullName"
    const keys = key.split('.');
    let value = obj;
    for (const k of keys) {
      value = value?.[k];
    }
    return value ?? '';
  }

  private parseCellValue(cell: ExcelJS.Cell): any {
    if (cell.value === null || cell.value === undefined) {
      return '';
    }

    // Handle different cell types
    if (typeof cell.value === 'object') {
      if ('result' in cell.value) {
        // Formula result
        return cell.value.result;
      }
      if ('richText' in cell.value) {
        // Rich text
        return cell.value.richText.map((rt) => rt.text).join('');
      }
      if (cell.value instanceof Date) {
        return cell.value;
      }
    }

    return cell.value;
  }
}
