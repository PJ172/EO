import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { DocumentIndexingService } from './document-indexing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AIController],
  providers: [AIService, DocumentIndexingService],
  exports: [AIService, DocumentIndexingService],
})
export class AIModule {}
