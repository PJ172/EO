import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import {
  CreateDocumentDto,
  CreateDocumentVersionDto,
} from './dto/create-document.dto';
import { Audit } from '../../common/decorators/audit.decorator';
import { Action } from '../audit/audit.enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Permissions('DOCUMENT_CREATE')
  @Audit(Action.CREATE)
  async create(
    @CurrentUser() user: any,
    @Body() createDocumentDto: CreateDocumentDto,
  ) {
    return this.documentsService.create(user.id, createDocumentDto);
  }

  @Get()
  @Permissions('DOCUMENT_READ')
  @Audit(Action.READ)
  async findAll(@Query('isDeleted') isDeleted?: string) {
    return this.documentsService.findAll(isDeleted === 'true');
  }

  @Get(':id')
  @Permissions('DOCUMENT_READ')
  @Audit(Action.READ)
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Post(':id/versions')
  @Permissions('DOCUMENT_UPDATE')
  @Audit(Action.UPDATE)
  async addVersion(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateDocumentVersionDto,
  ) {
    return this.documentsService.addVersion(id, user.id, dto);
  }

  @Post(':id/submit')
  @Permissions('DOCUMENT_UPDATE')
  @Audit(Action.UPDATE)
  async submit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.submit(id, user.id);
  }

  @Post(':id/approve')
  @Permissions('DOCUMENT_APPROVE')
  @Audit(Action.APPROVE)
  async approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.approve(id, user.id);
  }

  @Post(':id/reject')
  @Permissions('DOCUMENT_APPROVE')
  @Audit(Action.REJECT)
  async reject(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.reject(id, user.id);
  }

  @Delete(':id')
  @Permissions('DOCUMENT_DELETE')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.delete(id, user.id);
  }

  @Post(':id/restore')
  @Permissions('DOCUMENT_DELETE')
  async restore(@Param('id') id: string) {
    return this.documentsService.restore(id);
  }

  @Delete(':id/force')
  @Permissions('DOCUMENT_DELETE')
  async forceDelete(@Param('id') id: string) {
    return this.documentsService.forceDelete(id);
  }
}
