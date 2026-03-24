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
import { CompanyService } from './company.service';
import type {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyQueryDto,
} from './company.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Permissions('COMPANY_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a company' })
  create(@Body() dto: CreateCompanyDto, @Req() req: any) {
    return this.companyService.create(dto, req.user?.id);
  }

  @Get()
  @Permissions('COMPANY_READ')
  @ApiOperation({ summary: 'List companies' })
  findAll(
    @Query() query: CompanyQueryDto,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isDeleted') isDeleted?: string,
  ) {
    return this.companyService.findAll({
      ...query,
      page,
      limit,
      isDeleted: isDeleted === 'true',
    });
  }

  @Get(':id')
  @Permissions('COMPANY_READ')
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Permissions('COMPANY_MANAGE')
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @Req() req: any,
  ) {
    return this.companyService.update(id, dto, req.user?.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Permissions('COMPANY_MANAGE')
  @ApiBearerAuth()
  remove(@Param('id') id: string, @Req() req: any) {
    return this.companyService.remove(id, req.user?.id);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  @Permissions('COMPANY_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore soft-deleted company' })
  restore(@Param('id') id: string) {
    return this.companyService.restore(id);
  }

  @Delete(':id/force')
  @UseGuards(JwtAuthGuard)
  @Permissions('COMPANY_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Permanently delete a company' })
  forceDelete(@Param('id') id: string) {
    return this.companyService.forceDelete(id);
  }
}
