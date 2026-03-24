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
  Req,
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
import { TicketService } from './ticket.service';
import {
  CreateTicketCategoryDto,
  CreateTicketDto,
  AssignTicketDto,
  ResolveTicketDto,
  AddTicketCommentDto,
  RateTicketDto,
  ApproveTicketDto,
  RejectTicketDto,
} from './dto/ticket.dto';
import type { Request } from 'express';

@ApiTags('IT Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  // === CATEGORIES ===
  @Get('categories')
  @Permissions('TICKET_VIEW')
  getCategories() {
    return this.ticketService.getCategories();
  }

  @Post('categories')
  @Permissions('TICKET_MANAGE')
  createCategory(@Body() dto: CreateTicketCategoryDto) {
    return this.ticketService.createCategory(dto);
  }

  @Delete('categories/:id')
  @Permissions('TICKET_MANAGE')
  deleteCategory(@Param('id') id: string) {
    return this.ticketService.deleteCategory(id);
  }

  // === TICKETS ===
  @Get()
  @Permissions('TICKET_MANAGE')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('isDeleted') isDeleted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketService.findAll({
      status,
      priority,
      categoryId,
      search,
      isDeleted: isDeleted === 'true',
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('my-tickets')
  @Permissions('TICKET_VIEW')
  findMyTickets(@Req() req: Request, @Query('isDeleted') isDeleted?: string) {
    return this.ticketService.findMyTickets(
      (req as any).user.id,
      isDeleted === 'true',
    );
  }

  @Get('assigned-to-me')
  @Permissions('TICKET_VIEW')
  findAssignedToMe(@Req() req: Request) {
    return this.ticketService.findAssignedToMe((req as any).user.id);
  }

  @Get('statistics')
  @Permissions('TICKET_MANAGE')
  getStatistics() {
    return this.ticketService.getStatistics();
  }

  @Get('pending-approvals')
  @Permissions('TICKET_VIEW')
  getPendingApprovals(@Req() req: Request) {
    return this.ticketService.getPendingApprovals((req as any).user.id);
  }

  @Get('admin/departments')
  @Permissions('TICKET_MANAGE')
  getAdminDepartments() {
    return this.ticketService.getDepartments();
  }

  @Get('admin/roles')
  @Permissions('TICKET_MANAGE')
  getAdminRoles() {
    return this.ticketService.getRoles();
  }

  @Get('admin/workflows')
  @Permissions('TICKET_MANAGE')
  getAdminWorkflows() {
    return this.ticketService.getAdminWorkflows();
  }

  @Post('admin/workflows')
  @Permissions('TICKET_MANAGE')
  createAdminWorkflow(@Body() dto: any) {
    return this.ticketService.createAdminWorkflow(dto);
  }

  @Delete('admin/workflows/:id')
  @Permissions('TICKET_MANAGE')
  deleteAdminWorkflow(@Param('id') id: string) {
    return this.ticketService.deleteAdminWorkflow(id);
  }

  @Get(':id')
  @Permissions('TICKET_VIEW')
  findOne(@Param('id') id: string) {
    return this.ticketService.findOne(id);
  }

  @Post()
  @Permissions('TICKET_CREATE')
  create(@Req() req: Request, @Body() dto: CreateTicketDto) {
    return this.ticketService.create((req as any).user.id, dto);
  }

  // === LIFECYCLE ===
  @Post(':id/assign')
  @Permissions('TICKET_MANAGE')
  assign(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.ticketService.assignTicket(id, dto);
  }

  @Post(':id/start')
  @Permissions('TICKET_MANAGE')
  startProgress(@Param('id') id: string) {
    return this.ticketService.startProgress(id);
  }

  @Post(':id/resolve')
  @Permissions('TICKET_MANAGE')
  resolve(@Param('id') id: string, @Body() dto: ResolveTicketDto) {
    return this.ticketService.resolve(id, dto);
  }

  @Post(':id/close')
  @Permissions('TICKET_MANAGE')
  close(@Param('id') id: string) {
    return this.ticketService.close(id);
  }

  @Post(':id/approve')
  @Permissions('TICKET_VIEW')
  approve(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: ApproveTicketDto,
  ) {
    return this.ticketService.approve(id, (req as any).user.id, dto.comment);
  }

  @Post(':id/reject')
  @Permissions('TICKET_VIEW')
  reject(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: RejectTicketDto,
  ) {
    return this.ticketService.reject(id, (req as any).user.id, dto.comment);
  }

  @Post(':id/reopen')
  @Permissions('TICKET_MANAGE')
  reopen(@Param('id') id: string) {
    return this.ticketService.reopen(id);
  }

  @Post(':id/rate')
  @Permissions('TICKET_VIEW')
  rate(@Param('id') id: string, @Body() dto: RateTicketDto) {
    return this.ticketService.rate(id, dto.rating);
  }

  // === COMMENTS ===
  @Post(':id/comments')
  @Permissions('TICKET_VIEW')
  addComment(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: AddTicketCommentDto,
  ) {
    return this.ticketService.addComment(id, (req as any).user.id, dto);
  }

  // === TRASH ===
  @Delete(':id')
  @Permissions('TICKET_MANAGE')
  delete(@Param('id') id: string, @Req() req: Request) {
    return this.ticketService.deleteTicket(id, (req as any).user?.id);
  }

  @Post(':id/restore')
  @Permissions('TICKET_MANAGE')
  restore(@Param('id') id: string) {
    return this.ticketService.restoreTicket(id);
  }

  @Delete(':id/force')
  @Permissions('TICKET_MANAGE')
  forceDelete(@Param('id') id: string) {
    return this.ticketService.forceDeleteTicket(id);
  }
}
