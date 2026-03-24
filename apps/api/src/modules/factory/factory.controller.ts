import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FactoryService } from './factory.service';
import {
  CreateFactoryDto,
  UpdateFactoryDto,
  FactoryQueryDto,
} from './dto/factory.dto';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FactoryExcelService } from './factory.excel.service';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ImportHistoryService } from '../import-history/import-history.service';

@ApiTags('factories')
@Controller('factories')
export class FactoryController {
  constructor(
    private readonly factoryService: FactoryService,
    private readonly excelService: FactoryExcelService,
    private readonly importHistoryService: ImportHistoryService,
  ) {}

  @Get('export')
  @UseGuards(JwtAuthGuard)
  @Permissions('EXPORT_DATA')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export factories to Excel' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async export(
    @Res() res: Response,
    @Req() req: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.excelService.exportFactories(res, { search, status }, req.user);
  }

  @Get('template')
  @Permissions('IMPORT_DATA')
  @ApiOperation({ summary: 'Download import template' })
  async template(@Res() res: Response) {
    return this.excelService.downloadTemplate(res);
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions('IMPORT_DATA')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary:
      'Preview factory import: parse file and return rows without saving',
  })
  async preview(@UploadedFile() file: Express.Multer.File) {
    return this.excelService.previewImport(file);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions('IMPORT_DATA')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Import factories from Excel (max 3/min)' })
  async import(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const result = await this.excelService.importFactories(file, req?.user?.id);
    this.importHistoryService.log({
      moduleKey: 'factories',
      fileName: file?.originalname ?? 'unknown.xlsx',
      totalRows: (result.success ?? 0) + (result.errors?.length ?? 0),
      success: result.success ?? 0,
      failed: result.errors?.length ?? 0,
      errors: result.errors ?? [],
      userId: req?.user?.id,
    });
    return result;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Permissions('FACTORY_MANAGE')
  @ApiBearerAuth()
  create(@Body() createFactoryDto: CreateFactoryDto, @Req() req: any) {
    return this.factoryService.create(createFactoryDto, req.user?.id);
  }

  @Get()
  @Permissions('FACTORY_READ')
  findAll(
    @Query() query: FactoryQueryDto,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isDeleted') isDeleted?: string,
  ) {
    const isDeletedBool = isDeleted === 'true';
    return this.factoryService.findAll({
      ...query,
      page,
      limit,
      isDeleted: isDeletedBool,
    });
  }

  @Get(':id')
  @Permissions('FACTORY_READ')
  findOne(@Param('id') id: string) {
    return this.factoryService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Permissions('FACTORY_MANAGE')
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() updateFactoryDto: UpdateFactoryDto,
    @Req() req: any,
  ) {
    return this.factoryService.update(id, updateFactoryDto, req.user?.id);
  }

  @Delete(':id')
  @Permissions('FACTORY_MANAGE')
  remove(@Param('id') id: string) {
    return this.factoryService.remove(id);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  @Permissions('FACTORY_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore soft-deleted factory' })
  restore(@Param('id') id: string) {
    return this.factoryService.restore(id);
  }

  @Delete(':id/force')
  @UseGuards(JwtAuthGuard)
  @Permissions('FACTORY_MANAGE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Permanently delete a factory' })
  forceDelete(@Param('id') id: string) {
    return this.factoryService.forceDelete(id);
  }
}
