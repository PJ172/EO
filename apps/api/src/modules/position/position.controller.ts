import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';
import { Action } from '../audit/audit.enums';
import { PositionService } from './position.service';
import { CreatePositionDto, UpdatePositionDto, AssignEmployeeDto } from './dto/position.dto';

@ApiTags('Positions')
@Controller('positions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@UseInterceptors(AuditInterceptor)
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Get('tree')
  @Permissions('ORGCHART_VIEW')
  @ApiOperation({ summary: 'Lấy cây chức vụ cho Org Chart' })
  async getTree(@Query('departmentId') departmentId?: string) {
    return this.positionService.getTree(departmentId);
  }

  @Get()
  @Permissions('DEPARTMENT_READ')
  @ApiOperation({ summary: 'Danh sách vị trí/chức vụ' })
  async findAll(
    @Query('departmentId') departmentId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.positionService.findAll({
      departmentId,
      sectionId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @Permissions('DEPARTMENT_READ')
  @ApiOperation({ summary: 'Chi tiết vị trí' })
  async findOne(@Param('id') id: string) {
    return this.positionService.findOne(id);
  }

  @Post()
  @Audit(Action.CREATE)
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Tạo vị trí mới' })
  async create(@Body() dto: CreatePositionDto) {
    return this.positionService.create(dto);
  }

  @Patch(':id')
  @Audit(Action.UPDATE)
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Cập nhật vị trí' })
  async update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.positionService.update(id, dto);
  }

  @Delete(':id')
  @Audit(Action.DELETE)
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Xóa vị trí' })
  async delete(@Param('id') id: string) {
    return this.positionService.delete(id);
  }

  @Get(':id/holders')
  @Permissions('DEPARTMENT_READ')
  @ApiOperation({ summary: 'Danh sách nhân viên đang giữ vị trí này' })
  async getHolders(@Param('id') id: string) {
    return this.positionService.getHolders(id);
  }

  @Post(':id/assign')
  @Audit(Action.UPDATE)
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Gán nhân viên vào vị trí' })
  async assign(@Param('id') id: string, @Body() dto: AssignEmployeeDto) {
    return this.positionService.assignEmployee(id, dto);
  }

  @Delete(':id/assign/:employeeId')
  @Audit(Action.UPDATE)
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Rút gán nhân viên khỏi vị trí' })
  async unassign(@Param('id') id: string, @Param('employeeId') employeeId: string) {
    return this.positionService.unassignEmployee(id, employeeId);
  }

  @Patch(':id/position')
  @Permissions('DEPARTMENT_MANAGE')
  @ApiOperation({ summary: 'Lưu vị trí UI trên Org Chart' })
  async saveUiPosition(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.positionService.savePositionUiPosition(id, Number(body['x']), Number(body['y']));
  }
}
