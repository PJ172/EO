import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, RoomBooking, MeetingRoom } from '@prisma/client';

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
    },
  ) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (start >= end) {
      throw new BadRequestException(
        'Thời gian kết thúc phải sau thời gian bắt đầu',
      );
    }

    // Resolve Employee ID from User ID
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      throw new BadRequestException(
        'Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên. Vui lòng liên hệ HR.',
      );
    }

    // Conflict Check
    const conflict = await this.prisma.roomBooking.findFirst({
      where: {
        roomId: data.roomId,
        status: 'CONFIRMED',
        id: { not: undefined }, // Only exclude self if updating, but here is create
        OR: [
          {
            startDatetime: { lt: end },
            endDatetime: { gt: start },
          },
        ],
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
        organizerEmployeeId: employee.id, // Use resolved Employee ID
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

    const bookings = await this.prisma.roomBooking.findMany({
      where,
      include: {
        room: true,
        organizer: true,
        attendees: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: { startDatetime: 'asc' },
    });

    // Resolve current employee
    let currentEmployeeId: string | undefined;
    if (user.employee) {
      currentEmployeeId = user.employee.id;
    } else {
      const employee = await this.prisma.employee.findUnique({
        where: { userId: user.id },
      });
      currentEmployeeId = employee?.id;
    }

    // Check for Admin/Manager permission (ROOM_MANAGE)
    const hasManagePerm = user.roles?.some(
      (role: any) =>
        role.perms?.includes('ROOM_MANAGE') || role.code === 'ADMIN',
    );

    // Map and Redact
    return bookings.map((booking) => {
      if (booking.isPrivate) {
        // If Admin/Manager, they can see everything
        if (hasManagePerm) return booking;

        const isOrganizer = booking.organizerEmployeeId === currentEmployeeId;
        const isAttendee = booking.attendees.some(
          (att) => att.employeeId === currentEmployeeId,
        );

        if (isOrganizer || isAttendee) {
          return booking; // Reveal full info
        }

        // Redact info for others
        return {
          ...booking,
          title: 'Lịch riêng tư', // Hide title
          description: '',
          note: '',
          attendees: [], // Hide attendees
          // organizer: Keep visible
          status: 'CONFIRMED', // Ensure status is valid string or enum
        };
      }
      return booking;
    });
  }
  async updateBooking(id: string, data: any, userId: string) {
    const booking = await this.prisma.roomBooking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Không tìm thấy lịch đặt');

    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (!employee) throw new BadRequestException('Lỗi xác thực nhân viên');

    if (booking.organizerEmployeeId !== employee.id) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true },
      });
      const isAdmin = user?.roles.some(
        (r: any) => r.code === 'ADMIN' || r.perms?.includes('ROOM_MANAGE'),
      );
      if (!isAdmin)
        throw new BadRequestException('Bạn không có quyền chỉnh sửa lịch này');
    }

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
        throw new BadRequestException(
          'Phòng đã có người đặt trong khung giờ này',
        );
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

  async deleteBooking(id: string, userId: string) {
    const booking = await this.prisma.roomBooking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Không tìm thấy lịch đặt');

    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (!employee) throw new BadRequestException('Lỗi xác thực nhân viên');

    if (booking.organizerEmployeeId !== employee.id) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true },
      });
      const isAdmin = user?.roles.some(
        (r: any) => r.code === 'ADMIN' || r.perms?.includes('ROOM_MANAGE'),
      );
      if (!isAdmin)
        throw new BadRequestException('Bạn không có quyền hủy lịch này');
    }

    return this.prisma.roomBooking.delete({ where: { id } });
  }
}
