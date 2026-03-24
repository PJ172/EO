import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  format,
  differenceInCalendarDays,
} from 'date-fns';

export type ReportPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate date range from period type
   */
  getDateRange(period: ReportPeriod, from?: string, to?: string): DateRange {
    const now = new Date();

    if (from && to) {
      return {
        from: new Date(from),
        to: new Date(to),
        label: `${format(new Date(from), 'dd/MM/yyyy')} - ${format(new Date(to), 'dd/MM/yyyy')}`,
      };
    }

    switch (period) {
      case 'daily':
        return {
          from: startOfDay(now),
          to: endOfDay(now),
          label: format(now, 'dd/MM/yyyy'),
        };
      case 'weekly':
        return {
          from: startOfWeek(now, { weekStartsOn: 1 }),
          to: endOfWeek(now, { weekStartsOn: 1 }),
          label: `Tuần ${format(startOfWeek(now, { weekStartsOn: 1 }), 'dd/MM')} - ${format(endOfWeek(now, { weekStartsOn: 1 }), 'dd/MM/yyyy')}`,
        };
      case 'monthly':
        return {
          from: startOfMonth(now),
          to: endOfMonth(now),
          label: format(now, 'MM/yyyy'),
        };
      case 'quarterly':
        return {
          from: startOfQuarter(now),
          to: endOfQuarter(now),
          label: `Q${Math.ceil((now.getMonth() + 1) / 3)}/${now.getFullYear()}`,
        };
      case 'yearly':
        return {
          from: startOfYear(now),
          to: endOfYear(now),
          label: format(now, 'yyyy'),
        };
      default:
        return {
          from: startOfMonth(now),
          to: endOfMonth(now),
          label: format(now, 'MM/yyyy'),
        };
    }
  }

  // ========================================================
  // HR REPORT
  // ========================================================

  async getHRReport(period: ReportPeriod, from?: string, to?: string) {
    const range = this.getDateRange(period, from, to);

    const [
      totalEmployees,
      byStatus,
      byDepartment,
      newHires,
      resignations,
      contractExpiringSoon,
      byEducation,
      byGender,
    ] = await Promise.all([
      this.prisma.employee.count(),

      this.prisma.employee.groupBy({
        by: ['employmentStatus'],
        _count: { id: true },
      }),

      this.prisma.employee.groupBy({
        by: ['departmentId'],
        _count: { id: true },
      }),

      // New hires in period
      this.prisma.employee.count({
        where: {
          joinedAt: { gte: range.from, lte: range.to },
        },
      }),

      // Resignations in period
      this.prisma.employee.count({
        where: {
          employmentStatus: 'RESIGNED',
          resignedAt: { gte: range.from, lte: range.to },
        },
      }),

      // Contracts expiring within 30 days
      this.prisma.employee.findMany({
        where: {
          contractEndDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          employmentStatus: { not: 'RESIGNED' },
        },
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          contractEndDate: true,
          contractType: true,
          department: { select: { name: true } },
        },
        orderBy: { contractEndDate: 'asc' },
      }),

      this.prisma.employee.groupBy({
        by: ['education'],
        _count: { id: true },
      }),

      this.prisma.employee.groupBy({
        by: ['gender'],
        _count: { id: true },
      }),
    ]);

    // Get department names
    const departments = await this.prisma.department.findMany({
      select: { id: true, name: true },
    });
    const deptMap = new Map(departments.map((d) => [d.id, d.name]));

    const statusLabels: Record<string, string> = {
      PROBATION: 'Thử việc',
      OFFICIAL: 'Chính thức',
      SEASONAL: 'Thời vụ',
      RESIGNED: 'Đã nghỉ',
      MATERNITY_LEAVE: 'Thai sản',
    };

    const educationLabels: Record<string, string> = {
      PRIMARY: 'Tiểu học',
      SECONDARY: 'THCS',
      HIGH_SCHOOL: 'THPT',
      VOCATIONAL: 'Trung cấp',
      COLLEGE: 'Cao đẳng',
      UNIVERSITY: 'Đại học',
      MASTER: 'Thạc sĩ',
      DOCTOR: 'Tiến sĩ',
    };

    const genderLabels: Record<string, string> = {
      MALE: 'Nam',
      FEMALE: 'Nữ',
      OTHER: 'Khác',
    };

    // Turnover rate
    const activeCount = byStatus
      .filter((s) => s.employmentStatus !== 'RESIGNED')
      .reduce((sum, s) => sum + s._count.id, 0);
    const turnoverRate =
      activeCount > 0
        ? Math.round((resignations / activeCount) * 100 * 10) / 10
        : 0;

    return {
      period: range.label,
      summary: {
        totalEmployees,
        activeEmployees: activeCount,
        newHires,
        resignations,
        turnoverRate: `${turnoverRate}%`,
      },
      byStatus: byStatus.map((s) => ({
        status: s.employmentStatus,
        label: statusLabels[s.employmentStatus] || s.employmentStatus,
        count: s._count.id,
      })),
      byDepartment: byDepartment
        .map((d) => ({
          departmentId: d.departmentId,
          departmentName: d.departmentId
            ? deptMap.get(d.departmentId) || 'Chưa phân công'
            : 'Chưa phân công',
          count: d._count.id,
        }))
        .sort((a, b) => b.count - a.count),
      byEducation: byEducation.map((e) => ({
        education: e.education,
        label: e.education
          ? educationLabels[e.education] || e.education
          : 'Chưa cập nhật',
        count: e._count.id,
      })),
      byGender: byGender.map((g) => ({
        gender: g.gender,
        label: g.gender ? genderLabels[g.gender] || g.gender : 'Chưa cập nhật',
        count: g._count.id,
      })),
      contractExpiringSoon: contractExpiringSoon.map((e) => ({
        ...e,
        departmentName: e.department?.name || '',
        daysLeft: e.contractEndDate
          ? differenceInCalendarDays(e.contractEndDate, new Date())
          : null,
      })),
    };
  }

  // ========================================================
  // ATTENDANCE REPORT
  // ========================================================

  async getAttendanceReport(period: ReportPeriod, from?: string, to?: string) {
    const range = this.getDateRange(period, from, to);

    const [records, byStatus, totalEmployees] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          date: { gte: range.from, lte: range.to },
        },
        select: {
          employeeId: true,
          status: true,
          workMinutes: true,
          overtimeMinutes: true,
        },
      }),

      this.prisma.attendance.groupBy({
        by: ['status'],
        where: {
          date: { gte: range.from, lte: range.to },
        },
        _count: { id: true },
      }),

      this.prisma.employee.count({
        where: { employmentStatus: { not: 'RESIGNED' } },
      }),
    ]);

    const statusLabels: Record<string, string> = {
      PRESENT: 'Có mặt',
      ABSENT: 'Vắng',
      LATE: 'Đi muộn',
      EARLY_LEAVE: 'Về sớm',
      HALF_DAY: 'Nửa ngày',
      ON_LEAVE: 'Nghỉ phép',
      BUSINESS_TRIP: 'Công tác',
      WORK_FROM_HOME: 'Làm từ xa',
    };

    // Aggregate
    const totalWorkMinutes = records.reduce(
      (sum, r) => sum + (r.workMinutes || 0),
      0,
    );
    const totalOvertimeMinutes = records.reduce(
      (sum, r) => sum + (r.overtimeMinutes || 0),
      0,
    );
    const uniqueEmployees = new Set(records.map((r) => r.employeeId)).size;

    // Late/absent top list
    const lateAbsentCountByEmployee = new Map<string, number>();
    records.forEach((r) => {
      if (r.status === 'LATE' || r.status === 'ABSENT') {
        lateAbsentCountByEmployee.set(
          r.employeeId,
          (lateAbsentCountByEmployee.get(r.employeeId) || 0) + 1,
        );
      }
    });

    const topLateAbsent = Array.from(lateAbsentCountByEmployee.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Retrieve employee names for top list
    let topLateAbsentWithNames: any[] = [];
    if (topLateAbsent.length > 0) {
      const employees = await this.prisma.employee.findMany({
        where: { id: { in: topLateAbsent.map(([id]) => id) } },
        select: {
          id: true,
          fullName: true,
          employeeCode: true,
          department: { select: { name: true } },
        },
      });
      const empMap = new Map(employees.map((e) => [e.id, e]));
      topLateAbsentWithNames = topLateAbsent.map(([id, count]) => ({
        employeeId: id,
        fullName: empMap.get(id)?.fullName || 'N/A',
        employeeCode: empMap.get(id)?.employeeCode || '',
        departmentName: empMap.get(id)?.department?.name || '',
        count,
      }));
    }

    return {
      period: range.label,
      summary: {
        totalRecords: records.length,
        uniqueEmployees,
        totalWorkHours: Math.round((totalWorkMinutes / 60) * 10) / 10,
        totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 10) / 10,
        attendanceRate:
          totalEmployees > 0
            ? `${Math.round((uniqueEmployees / totalEmployees) * 100)}%`
            : 'N/A',
      },
      byStatus: byStatus.map((s) => ({
        status: s.status,
        label: statusLabels[s.status] || s.status,
        count: s._count.id,
      })),
      topLateAbsent: topLateAbsentWithNames,
    };
  }

  // ========================================================
  // LEAVE REPORT
  // ========================================================

  async getLeaveReport(period: ReportPeriod, from?: string, to?: string) {
    const range = this.getDateRange(period, from, to);

    const [byStatus, byType, byDepartment] = await Promise.all([
      this.prisma.leaveRequest.groupBy({
        by: ['status'],
        where: {
          startDatetime: { gte: range.from, lte: range.to },
        },
        _count: { id: true },
      }),

      this.prisma.leaveRequest.groupBy({
        by: ['leaveTypeId'],
        where: {
          status: 'APPROVED',
          startDatetime: { gte: range.from, lte: range.to },
        },
        _count: { id: true },
      }),

      this.prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDatetime: { gte: range.from, lte: range.to },
        },
        select: {
          employee: { select: { departmentId: true } },
        },
      }),
    ]);

    // Get leave type names
    const leaveTypes = await this.prisma.leaveType.findMany({
      select: { id: true, name: true },
    });
    const typeMap = new Map(leaveTypes.map((t) => [t.id, t.name]));

    // Get department names
    const departments = await this.prisma.department.findMany({
      select: { id: true, name: true },
    });
    const deptMap = new Map(departments.map((d) => [d.id, d.name]));

    // Count leaves by department
    const deptCounts = new Map<string, number>();
    byDepartment.forEach((lr) => {
      const deptId = lr.employee?.departmentId || 'unknown';
      deptCounts.set(deptId, (deptCounts.get(deptId) || 0) + 1);
    });

    const statusLabels: Record<string, string> = {
      DRAFT: 'Nháp',
      SUBMITTED: 'Chờ duyệt',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Từ chối',
      CANCELLED: 'Đã hủy',
    };

    const totalApproved =
      byStatus.find((s) => s.status === 'APPROVED')?._count.id || 0;
    const totalPending =
      byStatus.find((s) => s.status === 'SUBMITTED')?._count.id || 0;
    const totalAll = byStatus.reduce((sum, s) => sum + s._count.id, 0);

    return {
      period: range.label,
      summary: {
        totalRequests: totalAll,
        approved: totalApproved,
        pending: totalPending,
        rejected: byStatus.find((s) => s.status === 'REJECTED')?._count.id || 0,
      },
      byStatus: byStatus.map((s) => ({
        status: s.status,
        label: statusLabels[s.status] || s.status,
        count: s._count.id,
      })),
      byType: byType.map((t) => ({
        typeId: t.leaveTypeId,
        typeName: typeMap.get(t.leaveTypeId) || 'Không xác định',
        count: t._count.id,
      })),
      byDepartment: Array.from(deptCounts.entries())
        .map(([deptId, count]) => ({
          departmentId: deptId,
          departmentName: deptMap.get(deptId) || 'Chưa phân công',
          count,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  // ========================================================
  // BOOKING REPORT
  // ========================================================

  async getBookingReport(period: ReportPeriod, from?: string, to?: string) {
    const range = this.getDateRange(period, from, to);

    const [bookings, byRoom, byStatus] = await Promise.all([
      this.prisma.roomBooking.count({
        where: { startDatetime: { gte: range.from, lte: range.to } },
      }),

      this.prisma.roomBooking.groupBy({
        by: ['roomId'],
        where: { startDatetime: { gte: range.from, lte: range.to } },
        _count: { id: true },
      }),

      this.prisma.roomBooking.groupBy({
        by: ['status'],
        where: { startDatetime: { gte: range.from, lte: range.to } },
        _count: { id: true },
      }),
    ]);

    // Get room names and capacity
    const rooms = await this.prisma.meetingRoom.findMany({
      select: { id: true, name: true, capacity: true },
    });
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    const confirmed =
      byStatus.find((s) => s.status === 'CONFIRMED')?._count.id || 0;
    const cancelled =
      byStatus.find((s) => s.status === 'CANCELLED')?._count.id || 0;

    return {
      period: range.label,
      summary: {
        totalBookings: bookings,
        confirmed,
        cancelled,
        cancellationRate:
          bookings > 0 ? `${Math.round((cancelled / bookings) * 100)}%` : '0%',
        totalRooms: rooms.length,
      },
      byRoom: byRoom
        .map((r) => {
          const room = roomMap.get(r.roomId);
          return {
            roomId: r.roomId,
            roomName: room?.name || 'Phòng không xác định',
            capacity: room?.capacity || 0,
            bookingCount: r._count.id,
          };
        })
        .sort((a, b) => b.bookingCount - a.bookingCount),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        label: s.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Đã hủy',
        count: s._count.id,
      })),
    };
  }

  // ========================================================
  // PROJECTS & TASKS REPORT
  // ========================================================

  async getProjectsReport(period: ReportPeriod, from?: string, to?: string) {
    const range = this.getDateRange(period, from, to);

    const [
      totalProjects,
      projectsByStatus,
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      overdueTasks,
    ] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.groupBy({ by: ['status'], _count: true }),
      this.prisma.projectTask.count({
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.projectTask.groupBy({
        by: ['status'],
        where: { createdAt: { gte: range.from, lte: range.to } },
        _count: true,
      }),
      this.prisma.projectTask.groupBy({
        by: ['priority'],
        where: { createdAt: { gte: range.from, lte: range.to } },
        _count: true,
      }),
      this.prisma.projectTask.count({
        where: {
          dueDate: { lt: new Date() },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
    ]);

    const projectStatusLabels: Record<string, string> = {
      PLANNING: 'Lập kế hoạch',
      ACTIVE: 'Đang triển khai',
      ON_HOLD: 'Tạm dừng',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
    };

    const taskStatusLabels: Record<string, string> = {
      TODO: 'Chờ làm',
      IN_PROGRESS: 'Đang làm',
      REVIEW: 'Đánh giá',
      DONE: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
    };

    const completed =
      tasksByStatus.find((s) => s.status === 'DONE')?._count || 0;

    return {
      period: range.label,
      summary: {
        totalProjects,
        totalTasks,
        completedTasks: completed,
        overdueTasks,
        completionRate:
          totalTasks > 0
            ? `${Math.round((completed / totalTasks) * 100)}%`
            : '0%',
      },
      projectsByStatus: projectsByStatus.map((s) => ({
        status: s.status,
        label: projectStatusLabels[s.status] || s.status,
        count: s._count,
      })),
      tasksByStatus: tasksByStatus.map((s) => ({
        status: s.status,
        label: taskStatusLabels[s.status] || s.status,
        count: s._count,
      })),
      tasksByPriority: tasksByPriority.map((p) => ({
        priority: p.priority,
        count: p._count,
      })),
    };
  }

  // ========================================================
  // CAR BOOKING REPORT
  // ========================================================

  async getCarBookingReport(period: ReportPeriod, from?: string, to?: string) {
    const range = this.getDateRange(period, from, to);

    const [totalBookings, byStatus, byCar] = await Promise.all([
      this.prisma.carBooking.count({
        where: { startTime: { gte: range.from, lte: range.to } },
      }),
      this.prisma.carBooking.groupBy({
        by: ['status'],
        where: { startTime: { gte: range.from, lte: range.to } },
        _count: true,
      }),
      this.prisma.carBooking.groupBy({
        by: ['carId'],
        where: { startTime: { gte: range.from, lte: range.to } },
        _count: true,
      }),
    ]);

    const cars = await this.prisma.car.findMany({
      select: { id: true, licensePlate: true, name: true },
    });
    const carMap = new Map(cars.map((c) => [c.id, c]));

    const confirmed =
      byStatus.find((s) => s.status === 'CONFIRMED')?._count || 0;
    const cancelled =
      byStatus.find((s) => s.status === 'CANCELLED')?._count || 0;

    const statusLabels: Record<string, string> = {
      CONFIRMED: 'Đã xác nhận',
      CANCELLED: 'Đã hủy',
    };

    return {
      period: range.label,
      summary: {
        totalBookings,
        confirmed,
        cancelled,
        totalCars: cars.length,
        utilizationRate:
          totalBookings > 0
            ? `${Math.round((confirmed / totalBookings) * 100)}%`
            : '0%',
      },
      byStatus: byStatus.map((s) => ({
        status: s.status,
        label: statusLabels[s.status] || s.status,
        count: s._count,
      })),
      byCar: byCar
        .map((c) => {
          const car = carMap.get(c.carId);
          return {
            carId: c.carId,
            licensePlate: car?.licensePlate || 'N/A',
            name: car?.name || '',
            bookingCount: c._count,
          };
        })
        .sort((a, b) => b.bookingCount - a.bookingCount),
    };
  }

  // ========================================================
  // REQUESTS REPORT
  // ========================================================

  async getRequestsReport(period: ReportPeriod, from?: string, to?: string) {
    const range = this.getDateRange(period, from, to);

    const [totalRequests, byStatus, byType] = await Promise.all([
      this.prisma.request.count({
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.request.groupBy({
        by: ['status'],
        where: { createdAt: { gte: range.from, lte: range.to } },
        _count: true,
      }),
      this.prisma.request.groupBy({
        by: ['type'],
        where: { createdAt: { gte: range.from, lte: range.to } },
        _count: true,
      }),
    ]);

    const statusLabels: Record<string, string> = {
      DRAFT: 'Nháp',
      SUBMITTED: 'Chờ duyệt',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Từ chối',
      CANCELLED: 'Đã hủy',
      PROCESSING: 'Đang xử lý',
      COMPLETED: 'Hoàn thành',
    };

    const typeLabels: Record<string, string> = {
      BUSINESS_TRIP: 'Công tác',
      OVERTIME: 'Tăng ca',
      EQUIPMENT: 'Thiết bị',
      STATIONERY: 'Văn phòng phẩm',
      OTHER: 'Khác',
    };

    const approved = byStatus.find((s) => s.status === 'APPROVED')?._count || 0;
    const pending = byStatus.find((s) => s.status === 'SUBMITTED')?._count || 0;

    return {
      period: range.label,
      summary: {
        totalRequests,
        approved,
        pending,
        rejected: byStatus.find((s) => s.status === 'REJECTED')?._count || 0,
        approvalRate:
          totalRequests > 0
            ? `${Math.round((approved / totalRequests) * 100)}%`
            : '0%',
      },
      byStatus: byStatus.map((s) => ({
        status: s.status,
        label: statusLabels[s.status] || s.status,
        count: s._count,
      })),
      byType: byType.map((t) => ({
        type: t.type,
        label: typeLabels[t.type] || t.type,
        count: t._count,
      })),
    };
  }

  // ========================================================
  // MEAL REPORT
  // ========================================================

  async getMealReport(period: ReportPeriod, from?: string, to?: string) {
    const range = this.getDateRange(period, from, to);

    const [totalRegistrations, bySession, byStatus, sessions] =
      await Promise.all([
        this.prisma.mealRegistration.count({
          where: { date: { gte: range.from, lte: range.to } },
        }),
        this.prisma.mealRegistration.groupBy({
          by: ['sessionId'],
          where: {
            date: { gte: range.from, lte: range.to },
            status: 'REGISTERED',
          },
          _count: true,
        }),
        this.prisma.mealRegistration.groupBy({
          by: ['status'],
          where: { date: { gte: range.from, lte: range.to } },
          _count: true,
        }),
        this.prisma.mealSession.findMany(),
      ]);

    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    const sessionLabels: Record<string, string> = {
      LUNCH: '🍛 Bữa trưa',
      AFTERNOON_SNACK: '🍰 Chiều nhẹ',
      DINNER: '🍜 Bữa tối',
      LATE_NIGHT_SNACK: '🥤 Khuya nhẹ',
    };

    const statusLabels: Record<string, string> = {
      REGISTERED: 'Đã đăng ký',
      CANCELLED: 'Đã hủy',
      USED: 'Đã sử dụng',
    };

    const registered =
      byStatus.find((s) => s.status === 'REGISTERED')?._count || 0;
    const cancelled =
      byStatus.find((s) => s.status === 'CANCELLED')?._count || 0;

    // Calculate estimated cost
    let totalCost = 0;
    bySession.forEach((s) => {
      const session = sessionMap.get(s.sessionId);
      if (session) totalCost += s._count * session.defaultPrice;
    });

    return {
      period: range.label,
      summary: {
        totalRegistrations,
        registered,
        cancelled,
        cancellationRate:
          totalRegistrations > 0
            ? `${Math.round((cancelled / totalRegistrations) * 100)}%`
            : '0%',
        estimatedCost:
          new Intl.NumberFormat('vi-VN').format(totalCost) + ' VNĐ',
      },
      bySession: bySession.map((s) => {
        const session = sessionMap.get(s.sessionId);
        return {
          sessionId: s.sessionId,
          sessionName: session
            ? sessionLabels[session.code] || session.name
            : 'N/A',
          count: s._count,
          cost: session ? s._count * session.defaultPrice : 0,
        };
      }),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        label: statusLabels[s.status] || s.status,
        count: s._count,
      })),
    };
  }

  // ========================================================
  // IT TICKET REPORT
  // ========================================================

  async getTicketReport(period: ReportPeriod, from?: string, to?: string) {
    const range = this.getDateRange(period, from, to);

    const [totalTickets, byStatus, byPriority, byCategory, resolvedTickets] =
      await Promise.all([
        this.prisma.ticket.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        }),
        this.prisma.ticket.groupBy({
          by: ['status'],
          where: { createdAt: { gte: range.from, lte: range.to } },
          _count: true,
        }),
        this.prisma.ticket.groupBy({
          by: ['priority'],
          where: { createdAt: { gte: range.from, lte: range.to } },
          _count: true,
        }),
        this.prisma.ticket.groupBy({
          by: ['categoryId'],
          where: { createdAt: { gte: range.from, lte: range.to } },
          _count: true,
        }),
        this.prisma.ticket.findMany({
          where: {
            createdAt: { gte: range.from, lte: range.to },
            resolvedAt: { not: null },
          },
          select: { createdAt: true, resolvedAt: true, slaDeadline: true },
        }),
      ]);

    const categories = await this.prisma.ticketCategory.findMany();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const statusLabels: Record<string, string> = {
      OPEN: 'Mới',
      ASSIGNED: 'Đã giao',
      IN_PROGRESS: 'Đang xử lý',
      RESOLVED: 'Đã giải quyết',
      CLOSED: 'Đã đóng',
      REOPENED: 'Mở lại',
    };

    const priorityLabels: Record<string, string> = {
      LOW: 'Thấp',
      MEDIUM: 'Trung bình',
      HIGH: 'Cao',
      URGENT: 'Khẩn cấp',
    };

    // Average resolution time
    let avgHours = 0;
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce(
        (sum, t) =>
          sum +
          (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()),
        0,
      );
      avgHours =
        Math.round((totalMs / resolvedTickets.length / 3600000) * 10) / 10;
    }

    // SLA compliance
    const slaCompliance =
      resolvedTickets.length > 0
        ? Math.round(
            (resolvedTickets.filter(
              (t) =>
                t.slaDeadline &&
                new Date(t.resolvedAt!) <= new Date(t.slaDeadline),
            ).length /
              resolvedTickets.length) *
              100,
          )
        : 100;

    const resolved = byStatus.find((s) => s.status === 'RESOLVED')?._count || 0;
    const closed = byStatus.find((s) => s.status === 'CLOSED')?._count || 0;

    return {
      period: range.label,
      summary: {
        totalTickets,
        resolved: resolved + closed,
        avgResolutionHours: avgHours,
        slaCompliancePercent: slaCompliance,
      },
      byStatus: byStatus.map((s) => ({
        status: s.status,
        label: statusLabels[s.status] || s.status,
        count: s._count,
      })),
      byPriority: byPriority.map((p) => ({
        priority: p.priority,
        label: priorityLabels[p.priority] || p.priority,
        count: p._count,
      })),
      byCategory: byCategory.map((c) => ({
        categoryId: c.categoryId,
        categoryName: catMap.get(c.categoryId) || 'Khác',
        count: c._count,
      })),
    };
  }

  // ========================================================
  // ALL REPORTS
  // ========================================================

  async getAllReports(period: ReportPeriod, from?: string, to?: string) {
    const [
      hr,
      attendance,
      leave,
      booking,
      projects,
      carBooking,
      requests,
      meal,
      ticket,
    ] = await Promise.all([
      this.getHRReport(period, from, to),
      this.getAttendanceReport(period, from, to),
      this.getLeaveReport(period, from, to),
      this.getBookingReport(period, from, to),
      this.getProjectsReport(period, from, to),
      this.getCarBookingReport(period, from, to),
      this.getRequestsReport(period, from, to),
      this.getMealReport(period, from, to),
      this.getTicketReport(period, from, to),
    ]);

    return {
      hr,
      attendance,
      leave,
      booking,
      projects,
      carBooking,
      requests,
      meal,
      ticket,
      generatedAt: new Date(),
    };
  }
}
