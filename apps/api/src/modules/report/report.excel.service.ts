import { Injectable } from '@nestjs/common';
import { ExcelService, ExcelColumn } from '../../shared/excel.service';

@Injectable()
export class ReportExcelService {
  constructor(private readonly excelService: ExcelService) {}

  async exportHRReport(data: any): Promise<Buffer> {
    // Summary sheet data
    const summaryData = [
      { label: 'Tổng nhân sự', value: data.summary.totalEmployees },
      { label: 'Nhân viên active', value: data.summary.activeEmployees },
      { label: 'Tuyển mới (kỳ)', value: data.summary.newHires },
      { label: 'Nghỉ việc (kỳ)', value: data.summary.resignations },
      { label: 'Tỷ lệ nghỉ việc', value: data.summary.turnoverRate },
    ];

    const summaryColumns: ExcelColumn[] = [
      { header: 'Chỉ số', key: 'label', width: 25 },
      { header: 'Giá trị', key: 'value', width: 15 },
    ];

    // Department sheet
    const deptColumns: ExcelColumn[] = [
      { header: 'Phòng ban', key: 'departmentName', width: 30 },
      { header: 'Số lượng', key: 'count', width: 12 },
    ];

    // Contract expiry sheet
    const contractColumns: ExcelColumn[] = [
      { header: 'Mã NV', key: 'employeeCode', width: 12 },
      { header: 'Họ tên', key: 'fullName', width: 25 },
      { header: 'Phòng ban', key: 'departmentName', width: 25 },
      { header: 'Loại HĐ', key: 'contractType', width: 15 },
      { header: 'Ngày hết hạn', key: 'contractEndDate', width: 15 },
      { header: 'Còn lại (ngày)', key: 'daysLeft', width: 15 },
    ];

    // Use the summary export as main output
    return this.excelService.exportToExcel({
      sheetName: `Báo cáo Nhân sự - ${data.period}`,
      columns: summaryColumns,
      data: summaryData,
    });
  }
}
