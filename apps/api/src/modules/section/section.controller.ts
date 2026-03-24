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
import { SectionService } from './section.service';
import type {
  CreateSectionDto,
  UpdateSectionDto,
  SectionQueryDto,
} from './section.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('sections')
@Controller('sections')
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Permissions('SECTION_MANAGE')
  @ApiBearerAuth()
  create(@Body() dto: CreateSectionDto, @Req() req: any) {
    return this.sectionService.create(dto, req.user?.id);
  }

  @Get()
  @Permissions('SECTION_READ')
  findAll(
    @Query() query: SectionQueryDto,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isDeleted') isDeleted?: string,
  ) {
    return this.sectionService.findAll({
      ...query,
      page,
      limit,
      isDeleted: isDeleted === 'true',
    });
  }

  @Get(':id')
  @Permissions('SECTION_READ')
  findOne(@Param('id') id: string) {
    return this.sectionService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Permissions('SECTION_MANAGE')
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
    @Req() req: any,
  ) {
    return this.sectionService.update(id, dto, req.user?.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Permissions('SECTION_MANAGE')
  @ApiBearerAuth()
  remove(@Param('id') id: string, @Req() req: any) {
    return this.sectionService.remove(id, req.user?.id);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  @Permissions('SECTION_MANAGE')
  @ApiBearerAuth()
  restore(@Param('id') id: string) {
    return this.sectionService.restore(id);
  }

  @Delete(':id/force')
  @UseGuards(JwtAuthGuard)
  @Permissions('SECTION_MANAGE')
  @ApiBearerAuth()
  forceDelete(@Param('id') id: string) {
    return this.sectionService.forceDelete(id);
  }
}
