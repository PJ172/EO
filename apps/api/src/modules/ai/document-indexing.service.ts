import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from './ai.service';

@Injectable()
export class DocumentIndexingService {
  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
  ) {}

  /**
   * Chia nhỏ nội dung văn bản thành các đoạn (chunks) để AI dễ dàng xử lý
   */
  private chunkText(
    text: string,
    size: number = 1000,
    overlap: number = 200,
  ): string[] {
    const chunks: string[] = [];
    if (!text) return chunks;

    let start = 0;
    while (start < text.length) {
      const end = start + size;
      chunks.push(text.slice(start, end));
      start = end - overlap;
    }
    return chunks;
  }

  /**
   * Lấy tất cả DocumentVersions chưa được index và thực hiện indexing
   */
  async indexAllDocuments() {
    const versions = await this.prisma.documentVersion.findMany({
      where: {
        chunks: { none: {} } as any,
        content: { not: null },
      },
      include: { document: true },
    });

    for (const version of versions) {
      await this.indexDocumentVersion(version.id, version.content || '');
    }

    return { indexedCount: versions.length };
  }

  async indexDocumentVersion(versionId: string, content: string) {
    const chunks = this.chunkText(content);

    // Xóa các chunks cũ nếu có
    await (this.prisma as any).documentChunk.deleteMany({
      where: { documentVersionId: versionId },
    });

    for (const chunkContent of chunks) {
      // Gọi embedding API từ AIService (sẽ bổ sung method này vào AIService)
      const embedding = await this.aiService.getEmbedding(chunkContent);

      await (this.prisma as any).documentChunk.create({
        data: {
          documentVersionId: versionId,
          content: chunkContent,
          embedding: embedding,
          metadata: { length: chunkContent.length },
        },
      });
    }
  }
}
