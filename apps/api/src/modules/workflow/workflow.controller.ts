import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @Permissions('WORKFLOW_MANAGE')
  @ApiOperation({ summary: 'Tạo quy trình duyệt mới' })
  async create(@Body() dto: CreateWorkflowDto) {
    return this.workflowService.create(dto);
  }

  @Get()
  @Permissions('WORKFLOW_MANAGE')
  @ApiOperation({ summary: 'Danh sách quy trình duyệt' })
  async findAll() {
    return this.workflowService.findAll();
  }

  @Get('roles')
  @Permissions('WORKFLOW_MANAGE')
  @ApiOperation({ summary: 'Danh sách roles cho chọn người duyệt' })
  async getAvailableRoles() {
    return this.workflowService.getAvailableRoles();
  }

  @Get(':id')
  @Permissions('WORKFLOW_MANAGE')
  @ApiOperation({ summary: 'Chi tiết quy trình' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async findOne(@Param('id') id: string) {
    return this.workflowService.findOne(id);
  }

  @Patch(':id')
  @Permissions('WORKFLOW_MANAGE')
  @ApiOperation({ summary: 'Cập nhật quy trình' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflowService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('WORKFLOW_MANAGE')
  @ApiOperation({ summary: 'Xóa / vô hiệu quy trình' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  async delete(@Param('id') id: string) {
    return this.workflowService.delete(id);
  }
}
