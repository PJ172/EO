import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  RegisterMealDto,
  CreateMealMenuDto,
  UpdateMealSessionDto,
} from './dto/meal.dto';

@Injectable()
export class MealService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // SESSIONS
  // =====================

  async getSessions() {
    return this.prisma.mealSession.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateSession(id: string, dto: UpdateMealSessionDto) {
    const session = await this.prisma.mealSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Không tìm thấy ca ăn');

    return this.prisma.mealSession.update({
      where: { id },
      data: {
        name: dto.name,
        timeStart: dto.timeStart,
        timeEnd: dto.timeEnd,
        cutoffTime: dto.cutoffTime,
        isActive: dto.isActive,
        maxRegistrations: dto.maxRegistrations,
        defaultPrice: dto.defaultPrice,
      },
    });
  }

  // =====================
  // REGISTRATION
  // =====================

  async register(userId: string, dto: RegisterMealDto) {
    // Get employee from user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user?.employee)
      throw new BadRequestException('Không tìm thấy nhân viên');

    // Get session
    const session = await this.prisma.mealSession.findUnique({
      where: { id: dto.sessionId },
    });
    if (!session) throw new NotFoundException('Không tìm thấy ca ăn');
    if (!session.isActive) throw new BadRequestException('Ca ăn đã tạm dừng');

    // Check cutoff time
    const now = new Date();
    const registerDate = new Date(dto.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    registerDate.setHours(0, 0, 0, 0);

    if (registerDate < today) {
      throw new BadRequestException('Không thể đăng ký cho ngày đã qua');
    }

    if (registerDate.getTime() === today.getTime()) {
      const [cutoffH, cutoffM] = session.cutoffTime.split(':').map(Number);
      const cutoff = new Date();
      cutoff.setHours(cutoffH, cutoffM, 0, 0);
      if (now > cutoff) {
        throw new BadRequestException(
          `Đã quá giờ đăng ký (trước ${session.cutoffTime})`,
        );
      }
    }

    // Check max registrations
    if (session.maxRegistrations) {
      const count = await this.prisma.mealRegistration.count({
        where: {
          sessionId: dto.sessionId,
          date: registerDate,
          status: 'REGISTERED',
        },
      });
      if (count >= session.maxRegistrations) {
        throw new BadRequestException('Ca ăn đã đủ số lượng đăng ký');
      }
    }

    // Check duplicate
    const existing = await this.prisma.mealRegistration.findUnique({
      where: {
        employeeId_sessionId_date: {
          employeeId: user.employee.id,
          sessionId: dto.sessionId,
          date: registerDate,
        },
      },
    });

    if (existing && existing.status === 'REGISTERED') {
      throw new BadRequestException('Bạn đã đăng ký ca ăn này rồi');
    }

    // Create or update (re-register after cancel)
    if (existing) {
      return this.prisma.mealRegistration.update({
        where: { id: existing.id },
        data: {
          status: 'REGISTERED',
          registeredAt: new Date(),
          cancelledAt: null,
          note: dto.note,
        },
        include: { session: true },
      });
    }

    return this.prisma.mealRegistration.create({
      data: {
        employeeId: user.employee.id,
        sessionId: dto.sessionId,
        date: registerDate,
        note: dto.note,
        registeredById: userId,
      },
      include: { session: true },
    });
  }

  async cancel(userId: string, registrationId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user?.employee)
      throw new BadRequestException('Không tìm thấy nhân viên');

    const reg = await this.prisma.mealRegistration.findUnique({
      where: { id: registrationId },
      include: { session: true },
    });
    if (!reg) throw new NotFoundException('Không tìm thấy đăng ký');
    if (reg.employeeId !== user.employee.id) {
      throw new BadRequestException('Bạn không có quyền hủy đăng ký này');
    }
    if (reg.status !== 'REGISTERED') {
      throw new BadRequestException('Đăng ký đã bị hủy hoặc đã sử dụng');
    }

    // Check cutoff
    const now = new Date();
    const regDate = new Date(reg.date);
    regDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (regDate.getTime() === today.getTime()) {
      const [cutoffH, cutoffM] = reg.session.cutoffTime.split(':').map(Number);
      const cutoff = new Date();
      cutoff.setHours(cutoffH, cutoffM, 0, 0);
      if (now > cutoff) {
        throw new BadRequestException(
          `Đã quá giờ hủy đăng ký (trước ${reg.session.cutoffTime})`,
        );
      }
    }

    return this.prisma.mealRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
      include: { session: true },
    });
  }

  async getMyRegistrations(userId: string, from?: string, to?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (!user?.employee) return [];

    const where: any = { employeeId: user.employee.id };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    return this.prisma.mealRegistration.findMany({
      where,
      include: { session: true },
      orderBy: [{ date: 'desc' }, { session: { sortOrder: 'asc' } }],
    });
  }

  // =====================
  // ADMIN - DASHBOARD
  // =====================

  async getDailyStats(date: string) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const sessions = await this.prisma.mealSession.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const stats = await Promise.all(
      sessions.map(async (session) => {
        const [registered, cancelled, used] = await Promise.all([
          this.prisma.mealRegistration.count({
            where: {
              sessionId: session.id,
              date: targetDate,
              status: 'REGISTERED',
            },
          }),
          this.prisma.mealRegistration.count({
            where: {
              sessionId: session.id,
              date: targetDate,
              status: 'CANCELLED',
            },
          }),
          this.prisma.mealRegistration.count({
            where: { sessionId: session.id, date: targetDate, status: 'USED' },
          }),
        ]);

        return {
          session,
          registered,
          cancelled,
          used,
          total: registered + used,
        };
      }),
    );

    return {
      date: targetDate,
      sessions: stats,
      totalRegistered: stats.reduce((s, i) => s + i.registered, 0),
      totalUsed: stats.reduce((s, i) => s + i.used, 0),
    };
  }

  async getRegistrationsByDate(date: string, sessionId?: string) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const where: any = { date: targetDate, status: 'REGISTERED' };
    if (sessionId) where.sessionId = sessionId;

    return this.prisma.mealRegistration.findMany({
      where,
      include: {
        session: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { employee: { fullName: 'asc' } },
    });
  }

  async getMonthlyReport(month: string) {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const registrations = await this.prisma.mealRegistration.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: { in: ['REGISTERED', 'USED'] },
      },
      include: {
        session: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    // Group by session
    const bySession = registrations.reduce((acc: any, reg) => {
      const key = reg.session.code;
      if (!acc[key]) acc[key] = { name: reg.session.name, count: 0 };
      acc[key].count++;
      return acc;
    }, {});

    // Group by department
    const byDepartment = registrations.reduce((acc: any, reg) => {
      const dept = reg.employee.department?.name || 'Chưa xác định';
      if (!acc[dept]) acc[dept] = 0;
      acc[dept]++;
      return acc;
    }, {});

    // Group by employee
    const byEmployee = registrations.reduce((acc: any, reg) => {
      const id = reg.employee.id;
      if (!acc[id]) {
        acc[id] = {
          employeeCode: reg.employee.employeeCode,
          fullName: reg.employee.fullName,
          department: reg.employee.department?.name,
          totalMeals: 0,
        };
      }
      acc[id].totalMeals++;
      return acc;
    }, {});

    return {
      month,
      totalRegistrations: registrations.length,
      bySession: Object.entries(bySession).map(([code, data]: any) => ({
        code,
        ...data,
      })),
      byDepartment: Object.entries(byDepartment)
        .map(([name, count]) => ({ departmentName: name, count }))
        .sort((a: any, b: any) => (b.count as number) - (a.count as number)),
      byEmployee: Object.values(byEmployee).sort(
        (a: any, b: any) => b.totalMeals - a.totalMeals,
      ),
    };
  }

  // =====================
  // MENU
  // =====================

  async getMenu(date: string) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    return this.prisma.mealMenu.findMany({
      where: { date: targetDate },
      include: { session: true },
      orderBy: { session: { sortOrder: 'asc' } },
    });
  }

  async upsertMenu(dto: CreateMealMenuDto) {
    const targetDate = new Date(dto.date);
    targetDate.setHours(0, 0, 0, 0);

    return this.prisma.mealMenu.upsert({
      where: {
        date_sessionId: {
          date: targetDate,
          sessionId: dto.sessionId,
        },
      },
      create: {
        date: targetDate,
        sessionId: dto.sessionId,
        mainDish: dto.mainDish,
        sideDish: dto.sideDish,
        soup: dto.soup,
        dessert: dto.dessert,
        price: dto.price || 0,
        note: dto.note,
      },
      update: {
        mainDish: dto.mainDish,
        sideDish: dto.sideDish,
        soup: dto.soup,
        dessert: dto.dessert,
        price: dto.price,
        note: dto.note,
      },
      include: { session: true },
    });
  }
}
