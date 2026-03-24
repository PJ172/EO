import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CarBookingService } from './car-booking.service';
import { CreateCarDto, UpdateCarDto } from './dto/car.dto';
import {
  CreateCarBookingDto,
  UpdateCarBookingDto,
} from './dto/car-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Car Booking')
@Controller('car-booking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CarBookingController {
  constructor(private readonly carBookingService: CarBookingService) {}

  // =====================
  // CARS
  // =====================

  @Get('cars')
  @Permissions('CAR_READ')
  @ApiOperation({ summary: 'Lấy danh sách xe' })
  async findAllCars() {
    return this.carBookingService.findAllCars();
  }

  @Get('cars/available')
  @Permissions('CAR_READ')
  @ApiOperation({ summary: 'Lấy xe khả dụng trong khoảng thời gian' })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  async findAvailableCars(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.carBookingService.findAvailableCars(
      new Date(startTime),
      new Date(endTime),
    );
  }

  @Get('cars/:id')
  @Permissions('CAR_READ')
  @ApiOperation({ summary: 'Xem chi tiết xe' })
  @ApiParam({ name: 'id', description: 'Car ID' })
  async findOneCar(@Param('id') id: string) {
    return this.carBookingService.findOneCar(id);
  }

  @Post('cars')
  @Permissions('CAR_MANAGE')
  @ApiOperation({ summary: 'Thêm xe mới' })
  async createCar(@Body() dto: CreateCarDto) {
    return this.carBookingService.createCar(dto);
  }

  @Put('cars/:id')
  @Permissions('CAR_MANAGE')
  @ApiOperation({ summary: 'Cập nhật xe' })
  @ApiParam({ name: 'id', description: 'Car ID' })
  async updateCar(@Param('id') id: string, @Body() dto: UpdateCarDto) {
    return this.carBookingService.updateCar(id, dto);
  }

  @Delete('cars/:id')
  @Permissions('CAR_MANAGE')
  @ApiOperation({ summary: 'Xóa xe' })
  @ApiParam({ name: 'id', description: 'Car ID' })
  async deleteCar(@Param('id') id: string) {
    return this.carBookingService.deleteCar(id);
  }

  // =====================
  // BOOKINGS
  // =====================

  @Get('bookings')
  @Permissions('CAR_READ')
  @ApiOperation({ summary: 'Lấy danh sách đặt xe của tôi' })
  async findMyBookings(@Request() req: any) {
    return this.carBookingService.findAllBookings(req.user.id);
  }

  @Get('bookings/upcoming')
  @Permissions('CAR_READ')
  @ApiOperation({ summary: 'Lấy lịch đặt xe sắp tới' })
  async findUpcomingBookings() {
    return this.carBookingService.findUpcomingBookings();
  }

  @Get('bookings/:id')
  @Permissions('CAR_READ')
  @ApiOperation({ summary: 'Xem chi tiết lịch đặt' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async findOneBooking(@Param('id') id: string) {
    return this.carBookingService.findOneBooking(id);
  }

  @Post('bookings')
  @Permissions('CAR_BOOK')
  @ApiOperation({ summary: 'Đặt xe' })
  async createBooking(@Request() req: any, @Body() dto: CreateCarBookingDto) {
    return this.carBookingService.createBooking(req.user.id, dto);
  }

  @Put('bookings/:id')
  @Permissions('CAR_BOOK')
  @ApiOperation({ summary: 'Cập nhật lịch đặt' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async updateBooking(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateCarBookingDto,
  ) {
    return this.carBookingService.updateBooking(id, req.user.id, dto);
  }

  @Post('bookings/:id/cancel')
  @Permissions('CAR_BOOK')
  @ApiOperation({ summary: 'Hủy lịch đặt' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async cancelBooking(@Param('id') id: string, @Request() req: any) {
    return this.carBookingService.cancelBooking(id, req.user.id);
  }

  // =====================
  // STATISTICS
  // =====================

  @Get('statistics')
  @Permissions('CAR_READ')
  @ApiOperation({ summary: 'Thống kê đặt xe' })
  async getStatistics() {
    return this.carBookingService.getStatistics();
  }
}
