import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto, CheckOutDto } from './dto/timekeeping.dto';

@Injectable()
export class TimekeepingService {
  constructor(private prisma: PrismaService) {}

  async checkIn(userId: string, dto: CheckInDto) {
    // Get employee from user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user?.employee) {
      throw new BadRequestException('Employee not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in
    const existing = await this.prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: user.employee.id,
          date: today,
        },
      },
    });

    if (existing?.checkIn) {
      throw new BadRequestException('Already checked in today');
    }

    const checkInTime = new Date();

    // Create or update attendance record
    const attendance = await this.prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: user.employee.id,
          date: today,
        },
      },
      create: {
        employeeId: user.employee.id,
        date: today,
        checkIn: checkInTime,
        checkInMethod: dto.method || 'MANUAL',
        status: this.determineStatus(checkInTime),
      },
      update: {
        checkIn: checkInTime,
        checkInMethod: dto.method || 'MANUAL',
        status: this.determineStatus(checkInTime),
      },
    });

    return {
      success: true,
      checkIn: attendance.checkIn,
      status: attendance.status,
    };
  }

  async checkOut(userId: string, dto: CheckOutDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user?.employee) {
      throw new BadRequestException('Employee not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: user.employee.id,
          date: today,
        },
      },
    });

    if (!attendance?.checkIn) {
      throw new BadRequestException('Must check in first');
    }

    if (attendance.checkOut) {
      throw new BadRequestException('Already checked out today');
    }

    const checkOutTime = new Date();
    const workMinutes = Math.round(
      (checkOutTime.getTime() - new Date(attendance.checkIn).getTime()) / 60000,
    );

    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: checkOutTime,
        checkOutMethod: dto.method || 'MANUAL',
        workMinutes,
        status: this.determineCheckoutStatus(attendance.status, checkOutTime),
      },
    });

    return {
      success: true,
      checkIn: updated.checkIn,
      checkOut: updated.checkOut,
      workMinutes: updated.workMinutes,
      status: updated.status,
    };
  }

  async getTodayStatus(userId: string) {
    if (!userId) {
      return { hasCheckedIn: false, hasCheckedOut: false };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user?.employee) {
      return { hasCheckedIn: false, hasCheckedOut: false };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: user.employee.id,
          date: today,
        },
      },
    });

    return {
      hasCheckedIn: !!attendance?.checkIn,
      hasCheckedOut: !!attendance?.checkOut,
      checkIn: attendance?.checkIn,
      checkOut: attendance?.checkOut,
      status: attendance?.status,
      workMinutes: attendance?.workMinutes,
    };
  }

  async getHistory(userId: string, from?: string, to?: string) {
    if (!userId) {
      return [];
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user?.employee) {
      return [];
    }

    let fromDate = new Date(new Date().setDate(1));
    let toDate = new Date();

    if (from && from !== 'undefined' && from !== 'null') {
      const parsedFrom = new Date(from);
      if (!isNaN(parsedFrom.getTime())) {
        fromDate = parsedFrom;
      }
    }

    if (to && to !== 'undefined' && to !== 'null') {
      const parsedTo = new Date(to);
      if (!isNaN(parsedTo.getTime())) {
        toDate = parsedTo;
      }
    }

    return this.prisma.attendance.findMany({
      where: {
        employeeId: user.employee.id,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getMonthlySummary(userId: string, month: string) {
    if (!userId) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user?.employee) {
      return null;
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        employeeId: user.employee.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const summary = {
      month,
      totalDays: attendances.length,
      presentDays: attendances.filter((a: any) => a.status === 'PRESENT')
        .length,
      lateDays: attendances.filter((a: any) => a.status === 'LATE').length,
      absentDays: attendances.filter((a: any) => a.status === 'ABSENT').length,
      totalWorkMinutes: attendances.reduce(
        (sum: any, a: any) => sum + (a.workMinutes || 0),
        0,
      ),
      totalOvertimeMinutes: attendances.reduce(
        (sum: any, a: any) => sum + (a.overtimeMinutes || 0),
        0,
      ),
    };

    return summary;
  }

  private determineStatus(checkInTime: Date): 'PRESENT' | 'LATE' {
    const hours = checkInTime.getHours();
    const minutes = checkInTime.getMinutes();
    // Late if after 8:30 AM
    return hours > 8 || (hours === 8 && minutes > 30) ? 'LATE' : 'PRESENT';
  }

  private determineCheckoutStatus(
    currentStatus: string,
    checkOutTime: Date,
  ): 'PRESENT' | 'LATE' | 'EARLY_LEAVE' {
    const hours = checkOutTime.getHours();
    // Early leave if before 17:00
    if (hours < 17) {
      return 'EARLY_LEAVE';
    }
    return currentStatus as 'PRESENT' | 'LATE';
  }
}
