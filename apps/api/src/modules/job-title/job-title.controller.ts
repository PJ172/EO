import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobTitleService } from './job-title.service';
import { JobTitleExcelService } from './job-title.excel.service';
import { CreateJobTitleDto, UpdateJobTitleDto } from './job-title.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Job Titles')
@Controller('job-titles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class JobTitleController {
  constructor(
    private service: JobTitleService,
    private excelService: JobTitleExcelService,
  ) {}

  @Get()
  @Permissions('JOBTITLE_READ')
  @ApiOperation({ summary: 'Get all job titles' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'isDeleted', required: false, type: Boolean })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
    @Query('isDeleted') isDeleted?: string,
  ) {
    const isDeletedBool = isDeleted === 'true';
    return this.service.findAll({
      page,
      limit,
      search,
      sortBy,
      order,
      isDeleted: isDeletedBool,
    });
  }

  @Get('export')
  @Permissions('EXPORT_DATA')
  @ApiOperation({ summary: 'Export job titles to Excel' })
  @ApiQuery({ name: 'search', required: false, type: String })
  async export(
    @Res() res: Response,
    @Req() req: any,
    @Query('search') search?: string,
  ) {
    return this.excelService.exportJobTitles(res, { search }, req.user);
  }

  @Get('template')
  @Permissions('IMPORT_DATA')
  @ApiOperation({ summary: 'Get import template' })
  async getTemplate(@Res() res: Response) {
    return this.excelService.getTemplate(res);
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions('IMPORT_DATA')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Preview import job titles: parse file without saving',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async preview(@UploadedFile() file: Express.Multer.File) {
    return this.excelService.previewImport(file);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions('IMPORT_DATA')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import job titles from Excel (max 3/min)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async import(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.excelService.importJobTitles(file, req?.user?.id);
  }

  @Get(':id')
  @Permissions('JOBTITLE_READ')
  @ApiOperation({ summary: 'Get job title details' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('JOBTITLE_MANAGE')
  @ApiOperation({ summary: 'Create job title' })
  create(@Body() dto: CreateJobTitleDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  @Permissions('JOBTITLE_MANAGE')
  @ApiOperation({ summary: 'Update job title' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJobTitleDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Delete('bulk')
  @Permissions('JOBTITLE_MANAGE')
  @ApiOperation({ summary: 'Bulk delete job titles' })
  bulkDelete(@Body('ids') ids: string[], @Req() req: any) {
    return this.service.bulkDelete(ids, req.user?.id || req.user?.sub);
  }

  @Delete(':id')
  @Permissions('JOBTITLE_MANAGE')
  @ApiOperation({ summary: 'Delete job title' })
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user?.id || req.user?.sub);
  }

  @Post(':id/restore')
  @Permissions('JOBTITLE_MANAGE')
  @ApiOperation({ summary: 'Restore job title' })
  restore(@Param('id') id: string) {
    return this.service.restore(id);
  }

  @Delete(':id/force')
  @Permissions('JOBTITLE_MANAGE')
  @ApiOperation({ summary: 'Force delete job title permanently' })
  forceDelete(@Param('id') id: string) {
    return this.service.forceDelete(id);
  }
}
