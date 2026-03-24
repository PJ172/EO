import {
  Controller,
  Get,
  Delete,
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
import { ImportHistoryService } from './import-history.service';

@ApiTags('Import History')
@Controller('import-history')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ImportHistoryController {
  constructor(private importHistoryService: ImportHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get import history (paginated)' })
  @ApiQuery({ name: 'moduleKey', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('moduleKey') moduleKey?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.importHistoryService.findAll({
      moduleKey,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an import history record' })
  async deleteOne(@Param('id') id: string) {
    return this.importHistoryService.deleteOne(id);
  }
}
