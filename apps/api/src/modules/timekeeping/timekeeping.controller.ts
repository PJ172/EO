import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TimekeepingService } from './timekeeping.service';
import { CheckInDto, CheckOutDto } from './dto/timekeeping.dto';

@ApiTags('Timekeeping')
@Controller('timekeeping')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TimekeepingController {
  constructor(private timekeepingService: TimekeepingService) {}

  @Post('check-in')
  @ApiOperation({ summary: 'Check in for today' })
  async checkIn(@CurrentUser('sub') userId: string, @Body() dto: CheckInDto) {
    return this.timekeepingService.checkIn(userId, dto);
  }

  @Post('check-out')
  @ApiOperation({ summary: 'Check out for today' })
  async checkOut(@CurrentUser('sub') userId: string, @Body() dto: CheckOutDto) {
    return this.timekeepingService.checkOut(userId, dto);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today attendance status' })
  async getTodayStatus(@CurrentUser('sub') userId: string) {
    return this.timekeepingService.getTodayStatus(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get attendance history' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getHistory(
    @CurrentUser('sub') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.timekeepingService.getHistory(userId, from, to);
  }

  @Get('summary/:month')
  @ApiOperation({ summary: 'Get monthly summary' })
  async getMonthlySummary(
    @CurrentUser('sub') userId: string,
    @Param('month') month: string, // Format: YYYY-MM
  ) {
    return this.timekeepingService.getMonthlySummary(userId, month);
  }
}
