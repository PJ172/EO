import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarDto, UpdateCarDto } from './dto/car.dto';
import {
  CreateCarBookingDto,
  UpdateCarBookingDto,
} from './dto/car-booking.dto';
import { CarStatus, BookingStatus } from '@prisma/client';

@Injectable()
export class CarBookingService {
  constructor(private prisma: PrismaService) {}

  // =====================
  // CARS MANAGEMENT
  // =====================

  async findAllCars() {
    return this.prisma.car.findMany({
      include: {
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAvailableCars(startTime: Date, endTime: Date) {
    // Get cars that don't have conflicting bookings
    const busyCars = await this.prisma.carBooking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        OR: [
          {
            startTime: { lte: endTime },
            endTime: { gte: startTime },
          },
        ],
      },
      select: { carId: true },
    });

    const busyCarIds = busyCars.map((b) => b.carId);

    return this.prisma.car.findMany({
      where: {
        status: CarStatus.AVAILABLE,
        id: { notIn: busyCarIds },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOneCar(id: string) {
    const car = await this.prisma.car.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: BookingStatus.CONFIRMED,
            endTime: { gte: new Date() },
          },
          orderBy: { startTime: 'asc' },
          take: 10,
        },
      },
    });
    if (!car) throw new NotFoundException('Không tìm thấy xe');
    return car;
  }

  async createCar(dto: CreateCarDto) {
    // Check duplicate license plate
    const existing = await this.prisma.car.findUnique({
      where: { licensePlate: dto.licensePlate },
    });
    if (existing) {
      throw new ConflictException('Biển số xe đã tồn tại');
    }

    return this.prisma.car.create({
      data: {
        name: dto.name,
        licensePlate: dto.licensePlate,
        driverName: dto.driverName,
        seatCount: dto.seatCount,
        status: dto.status || CarStatus.AVAILABLE,
      },
    });
  }

  async updateCar(id: string, dto: UpdateCarDto) {
    await this.findOneCar(id);
    return this.prisma.car.update({
      where: { id },
      data: {
        name: dto.name,
        driverName: dto.driverName,
        seatCount: dto.seatCount,
        status: dto.status,
      },
    });
  }

  async deleteCar(id: string) {
    const car = await this.prisma.car.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!car) throw new NotFoundException('Không tìm thấy xe');
    if (car._count.bookings > 0) {
      throw new BadRequestException('Không thể xóa xe đã có lịch đặt');
    }

    await this.prisma.car.delete({ where: { id } });
    return { success: true, message: 'Đã xóa xe' };
  }

  // =====================
  // BOOKINGS
  // =====================

  async findAllBookings(userId?: string) {
    const where: any = {};
    if (userId) {
      where.requestorId = userId;
    }

    return this.prisma.carBooking.findMany({
      where,
      include: {
        car: true,
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async findUpcomingBookings() {
    return this.prisma.carBooking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        startTime: { gte: new Date() },
      },
      include: { car: true },
      orderBy: { startTime: 'asc' },
      take: 20,
    });
  }

  async findOneBooking(id: string) {
    const booking = await this.prisma.carBooking.findUnique({
      where: { id },
      include: { car: true },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy lịch đặt');
    return booking;
  }

  async createBooking(userId: string, dto: CreateCarBookingDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    // Validate time
    if (startTime >= endTime) {
      throw new BadRequestException(
        'Thời gian kết thúc phải sau thời gian bắt đầu',
      );
    }
    if (startTime < new Date()) {
      throw new BadRequestException('Thời gian bắt đầu phải trong tương lai');
    }

    // Check car exists and is available
    const car = await this.prisma.car.findUnique({ where: { id: dto.carId } });
    if (!car) throw new NotFoundException('Không tìm thấy xe');
    if (car.status !== CarStatus.AVAILABLE) {
      throw new BadRequestException('Xe không khả dụng');
    }

    // Check for conflicting bookings
    const conflict = await this.prisma.carBooking.findFirst({
      where: {
        carId: dto.carId,
        status: BookingStatus.CONFIRMED,
        OR: [
          {
            startTime: { lte: endTime },
            endTime: { gte: startTime },
          },
        ],
      },
    });

    if (conflict) {
      throw new ConflictException('Xe đã được đặt trong khoảng thời gian này');
    }

    return this.prisma.carBooking.create({
      data: {
        carId: dto.carId,
        requestorId: userId,
        destination: dto.destination,
        purpose: dto.purpose,
        startTime,
        endTime,
        status: BookingStatus.CONFIRMED,
      },
      include: { car: true },
    });
  }

  async updateBooking(id: string, userId: string, dto: UpdateCarBookingDto) {
    const booking = await this.findOneBooking(id);

    // Only allow owner or admin to update
    if (booking.requestorId !== userId) {
      throw new BadRequestException('Bạn không có quyền sửa lịch đặt này');
    }

    const updateData: any = {};
    if (dto.destination) updateData.destination = dto.destination;
    if (dto.purpose !== undefined) updateData.purpose = dto.purpose;
    if (dto.status) updateData.status = dto.status;

    if (dto.startTime || dto.endTime) {
      const startTime = dto.startTime
        ? new Date(dto.startTime)
        : booking.startTime;
      const endTime = dto.endTime ? new Date(dto.endTime) : booking.endTime;

      if (startTime >= endTime) {
        throw new BadRequestException('Thời gian không hợp lệ');
      }

      // Check conflict excluding current booking
      const conflict = await this.prisma.carBooking.findFirst({
        where: {
          carId: booking.carId,
          id: { not: id },
          status: BookingStatus.CONFIRMED,
          OR: [
            {
              startTime: { lte: endTime },
              endTime: { gte: startTime },
            },
          ],
        },
      });

      if (conflict) {
        throw new ConflictException('Thời gian mới xung đột với lịch đặt khác');
      }

      updateData.startTime = startTime;
      updateData.endTime = endTime;
    }

    return this.prisma.carBooking.update({
      where: { id },
      data: updateData,
      include: { car: true },
    });
  }

  async cancelBooking(id: string, userId: string) {
    const booking = await this.findOneBooking(id);

    if (booking.requestorId !== userId) {
      throw new BadRequestException('Bạn không có quyền hủy lịch đặt này');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Lịch đặt đã được hủy');
    }

    return this.prisma.carBooking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: { car: true },
    });
  }

  // =====================
  // STATISTICS
  // =====================

  async getStatistics() {
    const [totalCars, availableCars, totalBookings, upcomingBookings] =
      await Promise.all([
        this.prisma.car.count(),
        this.prisma.car.count({ where: { status: CarStatus.AVAILABLE } }),
        this.prisma.carBooking.count(),
        this.prisma.carBooking.count({
          where: {
            status: BookingStatus.CONFIRMED,
            startTime: { gte: new Date() },
          },
        }),
      ]);

    return {
      totalCars,
      availableCars,
      totalBookings,
      upcomingBookings,
    };
  }
}
