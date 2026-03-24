import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  format,
} from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Thống kê tổng quan nhân sự
   */
  async getEmployeeStats() {
    const [total, byStatus, byDepartment] = await Promise.all([
      // Tổng số nhân viên
      this.prisma.employee.count(),

      // Theo trạng thái
      this.prisma.employee.groupBy({
        by: ['employmentStatus'],
        _count: { id: true },
      }),

      // Theo phòng ban
      this.prisma.employee.groupBy({
        by: ['departmentId'],
        _count: { id: true },
      }),
    ]);

    // Lấy tên phòng ban
    const departments = await this.prisma.department.findMany({
      select: { id: true, name: true },
    });
    const deptMap = new Map(departments.map((d) => [d.id, d.name]));

    const byDepartmentWithNames = byDepartment.map((item) => ({
      departmentId: item.departmentId,
      departmentName: item.departmentId
        ? deptMap.get(item.departmentId) || 'Chưa phân công'
        : 'Chưa phân công',
      count: item._count.id,
    }));

    const statusLabels: Record<string, string> = {
      PROBATION: 'Thử việc',
      OFFICIAL: 'Chính thức',
      RESIGNED: 'Đã nghỉ',
    };

    return {
      total,
      byStatus: byStatus.map((s) => ({
        status: s.employmentStatus,
        label: statusLabels[s.employmentStatus] || s.employmentStatus,
        count: s._count.id,
      })),
      byDepartment: byDepartmentWithNames.sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Thống kê đặt phòng họp
   */
  async getBookingStats() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [todayBookings, weekBookings, monthBookings, byRoom, upcomingToday] =
      await Promise.all([
        // Hôm nay
        this.prisma.roomBooking.count({
          where: {
            startDatetime: { gte: todayStart, lte: todayEnd },
          },
        }),

        // Tuần này
        this.prisma.roomBooking.count({
          where: {
            startDatetime: { gte: weekStart, lte: weekEnd },
          },
        }),

        // Tháng này
        this.prisma.roomBooking.count({
          where: {
            startDatetime: { gte: monthStart, lte: monthEnd },
          },
        }),

        // Theo phòng họp (tháng này)
        this.prisma.roomBooking.groupBy({
          by: ['roomId'],
          where: {
            startDatetime: { gte: monthStart, lte: monthEnd },
          },
          _count: { id: true },
        }),

        // Sắp diễn ra hôm nay
        this.prisma.roomBooking.findMany({
          where: {
            startDatetime: { gte: now, lte: todayEnd },
            status: 'CONFIRMED',
          },
          include: {
            room: { select: { name: true } },
            organizer: { select: { fullName: true } },
          },
          orderBy: { startDatetime: 'asc' },
          take: 5,
        }),
      ]);

    // Lấy tên phòng họp
    const rooms = await this.prisma.meetingRoom.findMany({
      select: { id: true, name: true },
    });
    const roomMap = new Map(rooms.map((r) => [r.id, r.name]));

    return {
      today: todayBookings,
      thisWeek: weekBookings,
      thisMonth: monthBookings,
      byRoom: byRoom
        .map((item) => ({
          roomId: item.roomId,
          roomName: roomMap.get(item.roomId) || 'Phòng không xác định',
          count: item._count.id,
        }))
        .sort((a, b) => b.count - a.count),
      upcomingToday: upcomingToday.map((b) => ({
        id: b.id,
        title: b.title,
        roomName: b.room.name,
        organizer: b.organizer.fullName,
        startTime: b.startDatetime,
        endTime: b.endDatetime,
      })),
    };
  }

  /**
   * Thống kê nghỉ phép
   */
  async getLeaveStats() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [pendingRequests, todayLeaves, monthLeaves, byType] =
      await Promise.all([
        // Đang chờ duyệt
        this.prisma.leaveRequest.count({
          where: { status: 'SUBMITTED' },
        }),

        // Nghỉ hôm nay
        this.prisma.leaveRequest.count({
          where: {
            status: 'APPROVED',
            startDatetime: { lte: todayEnd },
            endDatetime: { gte: todayStart },
          },
        }),

        // Nghỉ trong tháng
        this.prisma.leaveRequest.count({
          where: {
            status: 'APPROVED',
            startDatetime: { gte: monthStart, lte: monthEnd },
          },
        }),

        // Theo loại nghỉ
        this.prisma.leaveRequest.groupBy({
          by: ['leaveTypeId'],
          where: {
            status: 'APPROVED',
            startDatetime: { gte: monthStart, lte: monthEnd },
          },
          _count: { id: true },
        }),
      ]);

    // Lấy tên loại nghỉ
    const leaveTypes = await this.prisma.leaveType.findMany({
      select: { id: true, name: true },
    });
    const typeMap = new Map(leaveTypes.map((t) => [t.id, t.name]));

    return {
      pendingRequests,
      todayLeaves,
      monthLeaves,
      byType: byType.map((item) => ({
        typeId: item.leaveTypeId,
        typeName: typeMap.get(item.leaveTypeId) || 'Không xác định',
        count: item._count.id,
      })),
    };
  }

  /**
   * Thống kê Audit Log
   */
  async getAuditStats() {
    const now = new Date();
    const last7Days = subDays(now, 7);

    const [totalLogs, byAction, byEntityType, recentActivity] =
      await Promise.all([
        // Tổng số log
        this.prisma.auditLog.count(),

        // Theo hành động (7 ngày gần nhất)
        this.prisma.auditLog.groupBy({
          by: ['action'],
          where: {
            createdAt: { gte: last7Days },
          },
          _count: { id: true },
        }),

        // Theo loại đối tượng (7 ngày gần nhất)
        this.prisma.auditLog.groupBy({
          by: ['entityType'],
          where: {
            createdAt: { gte: last7Days },
          },
          _count: { id: true },
        }),

        // Hoạt động gần đây
        this.prisma.auditLog.findMany({
          include: {
            actor: { select: { username: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    const actionLabels: Record<string, string> = {
      CREATE: 'Tạo mới',
      UPDATE: 'Cập nhật',
      DELETE: 'Xóa',
      LOGIN: 'Đăng nhập',
      LOGOUT: 'Đăng xuất',
    };

    const entityLabels: Record<string, string> = {
      User: 'Người dùng',
      Employee: 'Nhân viên',
      Department: 'Phòng ban',
      MeetingRoom: 'Phòng họp',
      RoomBooking: 'Đặt phòng',
      LeaveRequest: 'Nghỉ phép',
    };

    return {
      totalLogs,
      byAction: byAction.map((a) => ({
        action: a.action,
        label: actionLabels[a.action] || a.action,
        count: a._count.id,
      })),
      byEntityType: byEntityType
        .map((e) => ({
          entityType: e.entityType,
          label: entityLabels[e.entityType] || e.entityType,
          count: e._count.id,
        }))
        .sort((a, b) => b.count - a.count),
      recentActivity: recentActivity.map((log) => ({
        id: log.id,
        action: log.action,
        actionLabel: actionLabels[log.action] || log.action,
        entityType: log.entityType,
        entityLabel: entityLabels[log.entityType] || log.entityType,
        actor: log.actor?.username || 'Hệ thống',
        createdAt: log.createdAt,
      })),
    };
  }

  /**
   * Thống kê tờ trình/đề xuất
   */
  async getRequestStats() {
    const [pending, byStatus, byType] = await Promise.all([
      // Đang chờ duyệt
      this.prisma.request.count({
        where: { status: 'SUBMITTED' },
      }),

      // Theo trạng thái
      this.prisma.request.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // Theo loại
      this.prisma.request.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
    ]);

    const statusLabels: Record<string, string> = {
      DRAFT: 'Nháp',
      SUBMITTED: 'Đang chờ duyệt',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Từ chối',
      CANCELLED: 'Đã hủy',
    };

    const typeLabels: Record<string, string> = {
      ADVANCE: 'Tạm ứng',
      SUPPLIES: 'Vật tư',
      TRIP: 'Công tác',
      OTHER: 'Khác',
    };

    return {
      pending,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        label: statusLabels[s.status] || s.status,
        count: s._count.id,
      })),
      byType: byType.map((t) => ({
        type: t.type,
        label: typeLabels[t.type] || t.type,
        count: t._count.id,
      })),
    };
  }

  /**
   * Lấy tất cả thống kê cho Dashboard chính (Cache 2 phút)
   */
  async getAllStats() {
    const CACHE_KEY = 'dashboard:all-stats';
    const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

    // Try cache first
    const cached = await this.cacheManager.get<any>(CACHE_KEY);
    if (cached) return cached;

    const [employees, bookings, leaves, requests] = await Promise.all([
      this.getEmployeeStats(),
      this.getBookingStats(),
      this.getLeaveStats(),
      this.getRequestStats(),
    ]);

    const result = {
      employees,
      bookings,
      leaves,
      requests,
      generatedAt: new Date(),
      cachedAt: new Date(),
    };

    // Store in cache
    await this.cacheManager.set(CACHE_KEY, result, CACHE_TTL_MS);
    return result;
  }

  /**
   * Xóa cache Dashboard thủ công (gọi khi import nhân viên liên quan)
   */
  async invalidateDashboardCache() {
    await this.cacheManager.del('dashboard:all-stats');
  }
}
