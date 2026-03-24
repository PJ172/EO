import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { Audit } from '../../common/decorators/audit.decorator';
import { Action } from '../audit/audit.enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateRoomDto,
  UpdateRoomDto,
  CreateBookingDto,
} from './dto/booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('rooms')
  @Permissions('ROOM_READ')
  async getRooms() {
    return this.bookingService.getRooms();
  }

  @Post('rooms')
  @Permissions('ROOM_MANAGE')
  @Audit(Action.CREATE)
  async createRoom(@Body() body: CreateRoomDto) {
    return this.bookingService.createRoom(body);
  }

  @Patch('rooms/:id')
  @Permissions('ROOM_MANAGE')
  @Audit(Action.UPDATE)
  async updateRoom(@Param('id') id: string, @Body() body: UpdateRoomDto) {
    return this.bookingService.updateRoom(id, body);
  }

  @Get()
  @Permissions('ROOM_READ')
  async getBookings(
    @CurrentUser() user: any,
    @Query('roomId') roomId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.bookingService.getBookings(user, roomId, from, to);
  }

  @Post()
  @Permissions('ROOM_BOOK')
  @Audit(Action.CREATE)
  async createBooking(
    @CurrentUser() user: any,
    @Body() body: CreateBookingDto,
  ) {
    return this.bookingService.createBooking(user.id, body);
  }

  @Patch(':id')
  @Permissions('ROOM_BOOK')
  @Audit(Action.UPDATE)
  async updateBooking(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.bookingService.updateBooking(id, body, user.id);
  }

  @Delete(':id')
  @Permissions('ROOM_BOOK')
  @Audit(Action.DELETE)
  async deleteBooking(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingService.deleteBooking(id, user.id);
  }
}
