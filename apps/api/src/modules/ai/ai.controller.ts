import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { DocumentIndexingService } from './document-indexing.service';
import { AIChatDto, AIDraftDto } from './dto/ai-chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('AI Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly indexingService: DocumentIndexingService,
  ) {}

  @Post('index-all')
  @Permissions('ai:index')
  @ApiOperation({ summary: 'Đánh chỉ mục toàn bộ tài liệu (Update Vector DB)' })
  async indexAll() {
    return this.indexingService.indexAllDocuments();
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat với trợ lý AI' })
  async chat(@Body() dto: AIChatDto) {
    return this.aiService.chat(dto.messages);
  }

  @Post('draft')
  @Permissions('ai:draft')
  @ApiOperation({ summary: 'Soạn thảo văn bản/tờ trình' })
  async draft(@Body() dto: AIDraftDto) {
    return this.aiService.draftProposal(dto.prompt);
  }

  @Post('search-docs')
  @ApiOperation({ summary: 'Tra cứu quy định nội bộ' })
  async searchDocs(@Body('query') query: string) {
    return this.aiService.searchRegulatoryDocs(query);
  }
}
