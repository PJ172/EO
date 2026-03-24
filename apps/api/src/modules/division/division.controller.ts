import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DivisionService } from './division.service';
import type {
  CreateDivisionDto,
  UpdateDivisionDto,
  DivisionQueryDto,
} from './division.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('divisions')
@Controller('divisions')
export class DivisionController {
  constructor(private readonly divisionService: DivisionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Permissions('DIVISION_MANAGE')
  @ApiBearerAuth()
  create(@Body() dto: CreateDivisionDto, @Req() req: any) {
    return this.divisionService.create(dto, req.user?.id);
  }

  @Get()
  @Permissions('DIVISION_READ')
  findAll(
    @Query() query: DivisionQueryDto,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isDeleted') isDeleted?: string,
  ) {
    return this.divisionService.findAll({
      ...query,
      page,
      limit,
      isDeleted: isDeleted === 'true',
    });
  }

  @Get(':id')
  @Permissions('DIVISION_READ')
  findOne(@Param('id') id: string) {
    return this.divisionService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Permissions('DIVISION_MANAGE')
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDivisionDto,
    @Req() req: any,
  ) {
    return this.divisionService.update(id, dto, req.user?.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Permissions('DIVISION_MANAGE')
  @ApiBearerAuth()
  remove(@Param('id') id: string, @Req() req: any) {
    return this.divisionService.remove(id, req.user?.id);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  @Permissions('DIVISION_MANAGE')
  @ApiBearerAuth()
  restore(@Param('id') id: string) {
    return this.divisionService.restore(id);
  }

  @Delete(':id/force')
  @UseGuards(JwtAuthGuard)
  @Permissions('DIVISION_MANAGE')
  @ApiBearerAuth()
  forceDelete(@Param('id') id: string) {
    return this.divisionService.forceDelete(id);
  }
}
