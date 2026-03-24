import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditExcelService {
  constructor(private prisma: PrismaService) {}

  async exportAuditLogs(
    res: Response,
    params: {
      userId?: string;
      action?: string;
      entityType?: string;
      from?: string;
      to?: string;
      sortBy?: string;
      order?: 'asc' | 'desc';
    },
  ) {
    const {
      userId,
      action,
      entityType,
      from,
      to,
      sortBy = 'createdAt',
      order = 'desc',
    } = params;

    const where: any = {};

    if (userId) {
      where.actorUserId = userId;
    }

    if (action) {
      const actions = action.split(',').filter(Boolean) as AuditAction[];
      if (actions.length > 0) {
        where.action = { in: actions };
      }
    }

    if (entityType) {
      const types = entityType.split(',').filter(Boolean);
      if (types.length > 0) {
        where.entityType = { in: types };
      }
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    // Handle sorting relation fields like actor.username
    let orderBy: any = {};
    if (sortBy === 'actor.username') {
      orderBy = { actor: { username: order } };
    } else {
      orderBy = { [sortBy]: order };
    }

    // Fetch data (no pagination for export, but maybe limit to prevent crash? Let's limit to 5000 or make it unlimited but streamed?)
    // For simplicity, let's just fetch all matches.
    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            username: true,
            email: true,
          },
        },
      },
      orderBy,
      take: 5000, // Safety limit
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Nhật ký hệ thống');

    const defaultHeaders = [
      { header: 'Thời gian', key: 'createdAt', width: 20 },
      { header: 'Người thực hiện', key: 'actor', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Hành động', key: 'action', width: 15 },
      { header: 'Đối tượng', key: 'entityType', width: 15 },
      { header: 'Tên đối tượng (ID)', key: 'entityId', width: 30 },
      { header: 'Chi tiết thay đổi', key: 'diff', width: 50 },
      { header: 'IP', key: 'ip', width: 15 },
      { header: 'Tên máy (Computer Name)', key: 'computerName', width: 25 },
    ];

    // Fetch export config if 'PJ - Export' config name exists
    const exportConfig = await this.prisma.tableColumnConfig.findFirst({
      where: { moduleKey: 'audit-logs', name: 'PJ - Export' },
      orderBy: { updatedAt: 'desc' },
    });

    let headers = defaultHeaders;
    if (exportConfig && Array.isArray(exportConfig.columns)) {
      const configCols = exportConfig.columns as any[];
      const visibleCols = configCols
        .filter((c) => c.visible !== false)
        .sort((a, b) => a.order - b.order);
      const headerMap = new Map(defaultHeaders.map((h) => [h.key, h]));
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

    // Translation Maps
    const ACTION_TRANSLATIONS: Record<string, string> = {
      CREATE: 'Tạo mới',
      UPDATE: 'Cập nhật',
      DELETE: 'Xóa',
      LOGIN: 'Đăng nhập',
      LOGOUT: 'Đăng xuất',
      APPROVE: 'Phê duyệt',
      REJECT: 'Từ chối',
      CANCEL: 'Hủy',
      READ: 'Xem',
      VIEW_SENSITIVE: 'Xem dữ liệu nhạy cảm',
    };

    const ENTITY_TRANSLATIONS: Record<string, string> = {
      User: 'Người dùng',
      Role: 'Vai trò',
      Department: 'Phòng ban',
      Employee: 'Nhân viên',
      MeetingRoom: 'Phòng họp',
      RoomBooking: 'Đặt phòng',
      Booking: 'Đặt phòng',
      Car: 'Xe',
      CarBooking: 'Đặt xe',
      News: 'Tin tức',
      Task: 'Công việc',
      Project: 'Dự án',
      KPI: 'KPI',
      Request: 'Tờ trình / Đề xuất',
      Document: 'Tài liệu',
      Shift: 'Ca làm việc',
      Attendance: 'Chấm công',
      LeaveRequest: 'Yêu cầu nghỉ phép',
      OvertimeRequest: 'Yêu cầu làm thêm giờ',
    };

    logs.forEach((log) => {
      // Smart summary logic for export
      const data = (log.afterJson || log.beforeJson || {}) as any;
      let summary = '';
      const actionStr = log.action as string;

      if (data.code) summary += `Mã: ${data.code} `;
      if (data.name) summary += `Tên: ${data.name} `;
      if (data.username) summary += `User: ${data.username} `;
      if (data.title) summary += `Tiêu đề: ${data.title} `;

      if (!summary && (actionStr === 'LOGIN' || actionStr === 'LOGOUT'))
        summary = 'Thao tác hệ thống';
      if (!summary) summary = log.entityId;

      // Diff Logic
      let diff = '';
      const before = log.beforeJson as any;
      const after = log.afterJson as any;

      if (actionStr === 'UPDATE') {
        if (before && after) {
          const changes: string[] = [];
          const allKeys = new Set([
            ...Object.keys(before),
            ...Object.keys(after),
          ]);
          for (const key of allKeys) {
            if (
              [
                'createdAt',
                'updatedAt',
                'updatedBy',
                'createdBy',
                'passwordHash',
                'id',
                'lastLoginAt',
              ].includes(key)
            )
              continue;

            const v1 = JSON.stringify(before[key] || '');
            const v2 = JSON.stringify(after[key] || '');
            if (v1 !== v2) {
              // Clean up quotes for smoother reading
              changes.push(
                `${key}: ${v1.replace(/"/g, '')} -> ${v2.replace(/"/g, '')}`,
              );
            }
          }
          if (changes.length > 0) {
            diff = changes.join('\n');
          } else {
            diff = 'Không có thay đổi giá trị';
          }
        } else {
          diff =
            'Không có dữ liệu gốc để so sánh (Hệ thống chưa ghi nhận snapshot trước khi sửa)';
        }
      } else if (actionStr === 'CREATE') {
        diff = 'Tạo mới dữ liệu';
      } else if (actionStr === 'DELETE') {
        diff = 'Xóa dữ liệu';
      }

      worksheet.addRow({
        createdAt: log.createdAt
          ? new Date(log.createdAt).toLocaleString('vi-VN')
          : '',
        actor: log.actor?.username || 'System',
        email: log.actor?.email || '',
        action: ACTION_TRANSLATIONS[actionStr] || actionStr,
        entityType: ENTITY_TRANSLATIONS[log.entityType] || log.entityType,
        entityId: summary.trim(),
        diff: diff,
        ip: log.ip || '',
        computerName: (log as any).computerName || '',
      });

      // Allow wrapping for diff column
      worksheet.getColumn('diff').alignment = { wrapText: true };
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Export_Lichsuhethong.xlsx',
    );

    await workbook.xlsx.write(res);
  }
}
