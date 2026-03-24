import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { MealService } from './meal.service';
import {
  RegisterMealDto,
  CreateMealMenuDto,
  UpdateMealSessionDto,
} from './dto/meal.dto';
import type { Request, Response } from 'express';

@ApiTags('Meals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/meals')
export class MealController {
  constructor(private readonly mealService: MealService) {}

  // === SESSIONS ===

  @Get('sessions')
  @Permissions('MEAL_VIEW')
  @ApiOperation({ summary: 'Get all meal sessions' })
  getSessions() {
    return this.mealService.getSessions();
  }

  @Patch('sessions/:id')
  @Permissions('MEAL_MANAGE')
  @ApiOperation({ summary: 'Update a meal session' })
  updateSession(@Param('id') id: string, @Body() dto: UpdateMealSessionDto) {
    return this.mealService.updateSession(id, dto);
  }

  // === REGISTRATION ===

  @Post('register')
  @Permissions('MEAL_REGISTER')
  @ApiOperation({ summary: 'Register for a meal' })
  register(@Req() req: Request, @Body() dto: RegisterMealDto) {
    return this.mealService.register((req as any).user.id, dto);
  }

  @Post('cancel/:id')
  @Permissions('MEAL_REGISTER')
  @ApiOperation({ summary: 'Cancel a meal registration' })
  cancel(@Req() req: Request, @Param('id') id: string) {
    return this.mealService.cancel((req as any).user.id, id);
  }

  @Get('my-registrations')
  @Permissions('MEAL_VIEW')
  @ApiOperation({ summary: 'Get my meal registrations' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getMyRegistrations(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.mealService.getMyRegistrations((req as any).user.id, from, to);
  }

  // === ADMIN ===

  @Get('admin/daily')
  @Permissions('MEAL_MANAGE')
  @ApiOperation({ summary: 'Get daily meal statistics (admin)' })
  @ApiQuery({ name: 'date', required: true })
  getDailyStats(@Query('date') date: string) {
    return this.mealService.getDailyStats(date);
  }

  @Get('admin/registrations')
  @Permissions('MEAL_MANAGE')
  @ApiOperation({ summary: 'Get registrations by date (admin)' })
  @ApiQuery({ name: 'date', required: true })
  @ApiQuery({ name: 'sessionId', required: false })
  getRegistrationsByDate(
    @Query('date') date: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.mealService.getRegistrationsByDate(date, sessionId);
  }

  @Get('admin/monthly')
  @Permissions('MEAL_MANAGE')
  @ApiOperation({ summary: 'Get monthly meal report (admin)' })
  @ApiQuery({ name: 'month', required: true, example: '2026-02' })
  getMonthlyReport(@Query('month') month: string) {
    return this.mealService.getMonthlyReport(month);
  }

  // === MENU ===

  @Get('menu')
  @Permissions('MEAL_VIEW')
  @ApiOperation({ summary: 'Get menu for a date' })
  @ApiQuery({ name: 'date', required: true })
  getMenu(@Query('date') date: string) {
    return this.mealService.getMenu(date);
  }

  @Post('menu')
  @Permissions('MEAL_MANAGE')
  @ApiOperation({ summary: 'Create or update a menu' })
  upsertMenu(@Body() dto: CreateMealMenuDto) {
    return this.mealService.upsertMenu(dto);
  }
}
