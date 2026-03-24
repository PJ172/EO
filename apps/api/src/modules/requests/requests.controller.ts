import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ReviewRequestDto } from './dto/review-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Requests')
@Controller('requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @Permissions('REQUEST_CREATE')
  @ApiOperation({ summary: 'Tạo tờ trình mới' })
  async create(
    @Request() req: any,
    @Body() createRequestDto: CreateRequestDto,
  ) {
    return this.requestsService.create(req.user.id, createRequestDto);
  }

  @Get()
  @Permissions('REQUEST_READ')
  @ApiOperation({ summary: 'Lấy danh sách tờ trình của tôi' })
  async findAll(@Request() req: any) {
    return this.requestsService.findAll(req.user.id);
  }

  @Get('pending')
  @Permissions('REQUEST_READ')
  @ApiOperation({ summary: 'Lấy danh sách tờ trình cần duyệt' })
  async findPendingApprovals(@Request() req: any) {
    return this.requestsService.findPendingApprovals(req.user.id);
  }

  @Get(':id')
  @Permissions('REQUEST_READ')
  @ApiOperation({ summary: 'Xem chi tiết tờ trình' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  async findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Post(':id/submit')
  @Permissions('REQUEST_CREATE')
  @ApiOperation({ summary: 'Gửi duyệt tờ trình' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  async submit(@Param('id') id: string, @Request() req: any) {
    return this.requestsService.submit(id, req.user.id);
  }

  @Post(':id/approve')
  @Permissions('REQUEST_APPROVE')
  @ApiOperation({ summary: 'Phê duyệt tờ trình' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  async approve(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: ReviewRequestDto,
  ) {
    return this.requestsService.approve(id, req.user.id, dto.comment);
  }

  @Post(':id/reject')
  @Permissions('REQUEST_APPROVE')
  @ApiOperation({ summary: 'Từ chối tờ trình' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  async reject(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: ReviewRequestDto,
  ) {
    return this.requestsService.reject(id, req.user.id, dto.comment);
  }
}
