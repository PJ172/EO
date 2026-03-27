import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, RoomBooking, MeetingRoom } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Rooms ---
  async getRooms() {
    const rooms = await this.prisma.meetingRoom.findMany({
      orderBy: { name: 'asc' },
    });
    return rooms.map((room) => this.mapRoomResponse(room));
  }

  async createRoom(data: any) {
    const { description, image, equipment, features, ...rest } = data;
    const extraData = { description, image, equipment, features };

    const room = await this.prisma.meetingRoom.create({
      data: {
        ...rest,
        equipmentsJson: extraData as any,
      },
    });
    return this.mapRoomResponse(room);
  }

  async updateRoom(id: string, data: any) {
    // Check if exists
    const room = await this.prisma.meetingRoom.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException('Phòng không tồn tại');
    }

    const { description, image, equipment, features, ...rest } = data;
    const updateData: any = { ...rest };

    // Handle JSON update - merge with existing or overwrite?
    // For simplicity and standard form behavior, we overwrite the extras if provided,
    // but since it's a PUT-like from form, we can just reconstruct the object.
    // However, to be safe, let's read existing json
    const existingExtras = (room.equipmentsJson as any) || {};

    const newExtras = {
      ...existingExtras,
      ...(description !== undefined && { description }),
      ...(image !== undefined && { image }),
      ...(equipment !== undefined && { equipment }),
      ...(features !== undefined && { features }),
    };

    if (Object.keys(newExtras).length > 0) {
      updateData.equipmentsJson = newExtras;
    }

    const updatedRoom = await this.prisma.meetingRoom.update({
      where: { id },
      data: updateData,
    });
    return this.mapRoomResponse(updatedRoom);
  }

  private mapRoomResponse(room: any) {
    // Handle migration from old string description to new object
    let extras: any = {};
    if (room.equipmentsJson) {
      if (typeof room.equipmentsJson === 'string') {
        // Try to check if it's a JSON string or just text
        // In previous version it was: equipmentsJson: description ? description : undefined
        // So it was likely just a plain string of description.
        extras = { description: room.equipmentsJson };
      } else {
        extras = room.equipmentsJson;
      }
    }

    return {
      ...room,
      description: extras.description,
      image: extras.image,
      equipment: extras.equipment,
      features: extras.features,
    };
  }

  // --- Bookings ---
  async createBooking(
    userId: string,
    data: {
      roomId: string;
      startTime: string;
      endTime: string;
      purpose: string;
      description?: string;
      note?: string;
      isPrivate?: boolean;
      attendeeIds?: string[];
      isRecurring?: boolean;
      recurringRule?: string;
      recurringEndDate?: string;
    },
  ) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (start >= end) {
      throw new BadRequestException(
        'Thời gian kết thúc phải sau thời gian bắt đầu',
      );
    }

    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      throw new BadRequestException(
        'Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên. Vui lòng liên hệ HR.',
      );
    }

    // === Recurring Booking ===
    if (data.isRecurring && data.recurringRule && data.recurringEndDate) {
      const recurringGroupId = randomUUID();
      const recurringEnd = new Date(data.recurringEndDate);
      const durationMs = end.getTime() - start.getTime();
      const dates: { start: Date; end: Date }[] = [];
      let current = new Date(start);
      const MAX_INSTANCES = 52;

      while (current <= recurringEnd && dates.length < MAX_INSTANCES) {
        dates.push({
          start: new Date(current),
          end: new Date(current.getTime() + durationMs),
        });
        switch (data.recurringRule) {
          case 'DAILY':
            current.setDate(current.getDate() + 1);
            break;
          case 'WEEKLY':
            current.setDate(current.getDate() + 7);
            break;
          case 'MONTHLY':
            current.setMonth(current.getMonth() + 1);
            break;
          default:
            current = new Date(recurringEnd.getTime() + 1);
        }
      }

      // [C1] Batch conflict check — 1 query thay vì N queries tuần tự
      const conflictingBookings = await this.prisma.roomBooking.findMany({
        where: {
          roomId: data.roomId,
          status: 'CONFIRMED',
          OR: dates.map((slot) => ({
            startDatetime: { lt: slot.end },
            endDatetime: { gt: slot.start },
          })),
        },
        select: { startDatetime: true, endDatetime: true },
      });

      const validSlots: { start: Date; end: Date }[] = [];
      const skipped: string[] = [];

      for (const slot of dates) {
        const hasConflict = conflictingBookings.some(
          (c) => c.startDatetime < slot.end && c.endDatetime > slot.start,
        );
        if (hasConflict) {
          skipped.push(slot.start.toISOString());
        } else {
          validSlots.push(slot);
        }
      }

      // [C1] createMany — 1 INSERT thay vì N INSERTs tuần tự
      if (validSlots.length > 0) {
        await this.prisma.roomBooking.createMany({
          data: validSlots.map((slot) => ({
            roomId: data.roomId,
            organizerEmployeeId: employee.id,
            startDatetime: slot.start,
            endDatetime: slot.end,
            title: data.purpose,
            description: data.description,
            note: data.note,
            isPrivate: data.isPrivate || false,
            status: 'CONFIRMED',
            recurringGroupId,
            recurringRule: data.recurringRule,
            recurringEndDate: recurringEnd,
          })),
        });

        // Attach attendees if provided (createMany doesn't support nested)
        if (data.attendeeIds && data.attendeeIds.length > 0) {
          const inserted = await this.prisma.roomBooking.findMany({
            where: { recurringGroupId },
            select: { id: true },
          });
          await this.prisma.bookingAttendee.createMany({
            data: inserted.flatMap((b) =>
              data.attendeeIds!.map((empId) => ({ bookingId: b.id, employeeId: empId })),
            ),
          });
        }
      }

      return { created: validSlots.length, skipped: skipped.length, recurringGroupId };
    }

    // === Single Booking ===
    const conflict = await this.prisma.roomBooking.findFirst({
      where: {
        roomId: data.roomId,
        status: 'CONFIRMED',
        OR: [{ startDatetime: { lt: end }, endDatetime: { gt: start } }],
      },
    });

    if (conflict) {
      throw new BadRequestException(
        'Phòng đã có người đặt trong khung giờ này',
      );
    }

    return this.prisma.roomBooking.create({
      data: {
        roomId: data.roomId,
        organizerEmployeeId: employee.id,
        startDatetime: start,
        endDatetime: end,
        title: data.purpose,
        description: data.description,
        note: data.note,
        isPrivate: data.isPrivate || false,
        status: 'CONFIRMED',
        attendees:
          data.attendeeIds && data.attendeeIds.length > 0
            ? {
                create: data.attendeeIds.map((empId) => ({
                  employeeId: empId,
                })),
              }
            : undefined,
      },
    });
  }

  async getBookings(user: any, roomId?: string, from?: string, to?: string) {
    const where: Prisma.RoomBookingWhereInput = {};

    if (roomId) {
      where.roomId = roomId;
    }

    if (from || to) {
      where.startDatetime = {};
      if (from) where.startDatetime.gte = new Date(from);
      if (to) where.startDatetime.lte = new Date(to);
    }

    // [C2] Parallel: fetch bookings + resolve employee concurrently
    const [bookings, currentEmployee] = await Promise.all([
      this.prisma.roomBooking.findMany({
        where,
        select: {
          id: true,
          roomId: true,
          organizerEmployeeId: true,
          title: true,
          description: true,
          note: true,
          isPrivate: true,
          startDatetime: true,
          endDatetime: true,
          status: true,
          recurringGroupId: true,
          recurringRule: true,
          recurringEndDate: true,
          room: {
            select: { id: true, name: true, code: true, capacity: true, location: true, color: true, equipmentsJson: true },
          },
          organizer: {
            select: { id: true, fullName: true, employeeCode: true },
          },
          attendees: {
            select: {
              employeeId: true,
              employee: { select: { id: true, fullName: true } },
            },
          },
        },
        orderBy: { startDatetime: 'asc' },
      }),
      // Only fetch if not already in auth context
      user.employee
        ? Promise.resolve(user.employee as { id: string })
        : this.prisma.employee.findUnique({ where: { userId: user.id }, select: { id: true } }),
    ]);

    const currentEmployeeId = currentEmployee?.id;

    // Check for Admin/Manager permission (ROOM_MANAGE)
    const hasManagePerm = user.roles?.some(
      (role: any) =>
        role.perms?.includes('ROOM_MANAGE') || role.code === 'ADMIN',
    );

    // Map and Redact
    return bookings.map((booking) => {
      if (booking.isPrivate) {
        if (hasManagePerm) return booking;

        const isOrganizer = booking.organizerEmployeeId === currentEmployeeId;
        const isAttendee = booking.attendees.some(
          (att) => att.employeeId === currentEmployeeId,
        );

        if (isOrganizer || isAttendee) return booking;

        // Redact for non-participants
        return {
          ...booking,
          title: 'Lịch riêng tư',
          description: '',
          note: '',
          attendees: [],
          status: 'CONFIRMED',
        };
      }
      return booking;
    });
  }
  async updateBooking(id: string, data: any, userId: string) {
    // [C3] Parallel: fetch booking + user (with employee + roles) in one round-trip
    const [booking, user] = await Promise.all([
      this.prisma.roomBooking.findUnique({ where: { id } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { employee: true, roles: true },
      }),
    ]);

    if (!booking) throw new NotFoundException('Không tìm thấy lịch đặt');
    if (!user?.employee) throw new BadRequestException('Lỗi xác thực nhân viên');

    const isOrganizer = booking.organizerEmployeeId === user.employee.id;
    const isAdmin = user.roles.some(
      (r: any) => r.code === 'ADMIN' || r.perms?.includes('ROOM_MANAGE'),
    );

    if (!isOrganizer && !isAdmin)
      throw new BadRequestException('Bạn không có quyền chỉnh sửa lịch này');

    const {
      roomId,
      startTime,
      endTime,
      purpose,
      description,
      note,
      attendeeIds,
    } = data;
    const updateData: any = {};
    if (roomId) updateData.roomId = roomId;
    if (startTime) updateData.startDatetime = new Date(startTime);
    if (endTime) updateData.endDatetime = new Date(endTime);
    if (purpose) updateData.title = purpose;
    if (description !== undefined) updateData.description = description;
    if (note !== undefined) updateData.note = note;

    if (roomId || startTime || endTime) {
      const rId = roomId || booking.roomId;
      const start = startTime ? new Date(startTime) : booking.startDatetime;
      const end = endTime ? new Date(endTime) : booking.endDatetime;

      if (start >= end) throw new BadRequestException('Thời gian không hợp lệ');

      const conflict = await this.prisma.roomBooking.findFirst({
        where: {
          roomId: rId,
          status: 'CONFIRMED',
          id: { not: id },
          OR: [{ startDatetime: { lt: end }, endDatetime: { gt: start } }],
        },
      });
      if (conflict)
        throw new BadRequestException('Phòng đã có người đặt trong khung giờ này');
    }

    if (attendeeIds) {
      updateData.attendees = {
        deleteMany: {},
        create: attendeeIds.map((empId: string) => ({ employeeId: empId })),
      };
    }

    return this.prisma.roomBooking.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteBooking(id: string, userId: string, deleteAll?: boolean) {
    // [C3] Parallel: fetch booking + user (with employee + roles)
    const [booking, user] = await Promise.all([
      this.prisma.roomBooking.findUnique({ where: { id } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { employee: true, roles: true },
      }),
    ]);

    if (!booking) throw new NotFoundException('Không tìm thấy lịch đặt');
    if (!user?.employee) throw new BadRequestException('Lỗi xác thực nhân viên');

    const isOrganizer = booking.organizerEmployeeId === user.employee.id;
    const isAdmin = user.roles.some(
      (r: any) => r.code === 'ADMIN' || r.perms?.includes('ROOM_MANAGE'),
    );

    if (!isOrganizer && !isAdmin)
      throw new BadRequestException('Bạn không có quyền hủy lịch này');

    if (deleteAll && booking.recurringGroupId) {
      return this.prisma.roomBooking.deleteMany({
        where: { recurringGroupId: booking.recurringGroupId },
      });
    }

    return this.prisma.roomBooking.delete({ where: { id } });
  }
}
