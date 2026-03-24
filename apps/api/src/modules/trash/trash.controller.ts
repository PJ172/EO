import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TrashService } from './trash.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('trash')
@UseGuards(JwtAuthGuard)
export class TrashController {
  constructor(private readonly trashService: TrashService) {}

  // GET /api/trash/summary
  @Get('summary')
  async getSummary() {
    return this.trashService.getTrashSummary();
  }

  // GET /api/trash?module=employees&page=1&limit=50&search=&sortBy=deletedAt&sortOrder=desc
  @Get()
  async getTrashItems(
    @Query('module') module: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.trashService.getTrashItems(
      module,
      Number(page) || 1,
      Number(limit) || 50,
      search || undefined,
      (sortBy as any) || 'deletedAt',
      (sortOrder as any) || 'desc',
    );
  }

  // GET /api/trash/:module/:id/detail
  @Get(':module/:id/detail')
  async getTrashItemDetail(
    @Param('module') module: any,
    @Param('id') id: string,
  ) {
    return this.trashService.getTrashItemDetail(module, id);
  }

  // POST /api/trash/restore/:module/:id
  @Post('restore/:module/:id')
  @HttpCode(HttpStatus.OK)
  async restoreItem(@Param('module') module: any, @Param('id') id: string) {
    return this.trashService.restoreItem(module, id);
  }

  // POST /api/trash/restore-batch/:batchId
  @Post('restore-batch/:batchId')
  @HttpCode(HttpStatus.OK)
  async restoreBatch(@Param('batchId') batchId: string) {
    return this.trashService.restoreBatch(batchId);
  }

  // DELETE /api/trash/:module/:id
  @Delete(':module/:id')
  async hardDeleteItem(
    @Param('module') module: any,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.trashService.hardDeleteItem(module, id, req.user?.id);
  }

  // DELETE /api/trash/empty?module=employees
  @Delete('empty')
  async emptyTrash(@Query('module') module: any, @Req() req: any) {
    return this.trashService.emptyTrash(module || undefined, req.user?.id);
  }
}
