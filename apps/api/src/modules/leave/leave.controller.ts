import {
  Controller,
  Get,
  Post,
  Patch,
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
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LeaveService } from './leave.service';
import { CreateLeaveDto, ApproveLeaveDto } from './dto/leave.dto';

@ApiTags('Leaves')
@Controller('leaves')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LeaveController {
  constructor(private leaveService: LeaveService) {}

  @Get()
  @Permissions('LEAVE_READ')
  @ApiOperation({ summary: 'Get all leave requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  async findAll(
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.leaveService.findAll({ status, employeeId });
  }

  @Get('pending')
  @Permissions('LEAVE_APPROVE')
  @ApiOperation({ summary: 'Get pending leave requests for approval' })
  async getPending(@CurrentUser('sub') userId: string) {
    return this.leaveService.getPendingForApprover(userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my leave requests' })
  async getMyLeaves(@CurrentUser('sub') userId: string) {
    return this.leaveService.getMyLeaves(userId);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get my leave balance' })
  async getMyBalance(@CurrentUser('sub') userId: string) {
    return this.leaveService.getBalance(userId);
  }

  @Get(':id')
  @Permissions('LEAVE_READ')
  @ApiOperation({ summary: 'Get leave request by ID' })
  async findOne(@Param('id') id: string) {
    return this.leaveService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create leave request' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateLeaveDto,
  ) {
    return this.leaveService.create(userId, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit leave request for approval' })
  async submit(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.leaveService.submit(id, userId);
  }

  @Patch(':id/approve')
  @Permissions('LEAVE_APPROVE')
  @ApiOperation({ summary: 'Approve leave request' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ApproveLeaveDto,
  ) {
    return this.leaveService.approve(id, userId, dto);
  }

  @Patch(':id/reject')
  @Permissions('LEAVE_APPROVE')
  @ApiOperation({ summary: 'Reject leave request' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ApproveLeaveDto,
  ) {
    return this.leaveService.reject(id, userId, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel leave request' })
  async cancel(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.leaveService.cancel(id, userId);
  }
}
