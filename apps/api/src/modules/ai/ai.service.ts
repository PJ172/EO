import { Injectable, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class AIService implements OnModuleInit {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private embeddingModel: GenerativeModel;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.embeddingModel = this.genAI.getGenerativeModel({
        model: 'text-embedding-004',
      });
    }
  }

  onModuleInit() {
    // Initialization logic if needed
  }

  private async getSystemContext() {
    // Lấy thông tin tổng quan để AI có ngữ cảnh
    const [empCount, deptCount] = await Promise.all([
      this.prisma.employee.count({ where: { deletedAt: null } }),
      this.prisma.department.count({ where: { deletedAt: null } }),
    ]);

    return `Bạn là trợ lý AI cao cấp của hệ thống E-Office. 
    Hệ thống hiện có ${empCount} nhân viên và ${deptCount} phòng ban.
    Bạn có khả năng:
    1. Tra cứu quy định nội bộ (RAG).
    2. Soạn thảo tờ trình, công văn hành chính.
    3. Phân tích dữ liệu nhân sự cơ bản.
    Hãy trả lời bằng tiếng Việt, văn phong chuyên nghiệp, lịch sự.`;
  }

  async chat(messages: AIChatMessage[]) {
    if (!this.model) {
      return {
        role: 'assistant',
        content:
          'Hệ thống AI chưa được cấu hình API Key. Vui lòng liên hệ quản trị viên.',
      };
    }

    try {
      const userMessage = messages[messages.length - 1].content;

      // 1. Phân tích xem có cần tra cứu quy định không
      // Simple heuristic: if query is question-like or mentions "quy định", "chính sách", "nghỉ"
      const needsSearch =
        userMessage.length > 5 &&
        /quy định|chính sách|nghỉ|lương|thưởng|nội quy/i.test(userMessage);

      let contextInfo = '';
      if (needsSearch) {
        const docs = await this.searchRegulatoryDocs(userMessage);
        if (docs.length > 0) {
          contextInfo = '\n--- QUY ĐỊNH NỘI BỘ TÌM THẤY ---\n';
          docs.forEach((d) => {
            contextInfo += `[Nguồn: ${d.title}]\n${d.content}\n\n`;
          });
          contextInfo += '---------------------------------\n';
        }
      }

      const systemContext = await this.getSystemContext();
      const finalSystemPrompt = `${systemContext}\n\nHƯỚNG DẪN QUAN TRỌNG:
      1. Bạn là chuyên gia nội bộ. KHÔNG trả lời các kiến thức tổng quát ngoài lề (như nấu ăn, thể thao, chính trị thế giới).
      2. Nếu người dùng hỏi câu hỏi ngoài lề, hãy trả lời lịch sự rằng bạn chỉ hỗ trợ các vấn đề liên quan đến eOffice và quy định công ty.
      3. Nếu có dữ liệu quy định ở trên, hãy ưu tiên trả lời dựa trên đó và trích dẫn nguồn.
      4. Nếu không tìm thấy quy định cụ thể, hãy trả lời dựa trên kiến thức hệ thống hoặc hướng dẫn người dùng liên hệ phòng ban liên quan.`;

      // Gemini Format
      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const lastMessageContent = `${finalSystemPrompt}\n${contextInfo}\nCâu hỏi: ${userMessage}`;

      const chatSession = this.model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.2, // Giảm temperature để AI trả lời chính xác hơn, ít sáng tạo lung tung
        },
      });

      const result = await chatSession.sendMessage(lastMessageContent);
      const response = await result.response;

      return {
        role: 'assistant',
        content: response.text(),
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      return {
        role: 'assistant',
        content:
          'Có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
      };
    }
  }

  async draftProposal(prompt: string) {
    if (!this.model)
      return { title: 'Lỗi', content: 'Chưa cấu hình AI API Key' };

    const systemPrompt = `Bạn là một trợ lý chuyên nghiệp về hành chính nhân sự tại Việt Nam. 
    Nhiệm vụ của bạn là soạn thảo tờ trình hoặc công văn công ty dựa trên yêu cầu của người dùng. 
    Văn phong cần trang trọng, đúng quy chuẩn văn bản hành chính Việt Nam.`;

    try {
      const result = await this.model.generateContent([
        systemPrompt,
        `Yêu cầu: ${prompt}`,
      ]);
      const response = await result.response;

      return {
        title: 'Bản thảo tờ trình',
        content: response.text(),
      };
    } catch (error) {
      return { title: 'Lỗi', content: 'Không thể soạn thảo văn bản lúc này.' };
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingModel) return Array(1536).fill(0);
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Embedding Error:', error);
      return Array(1536).fill(0);
    }
  }

  async searchRegulatoryDocs(query: string, limit: number = 3) {
    if (!this.embeddingModel) return [];

    const queryEmbedding = await this.getEmbedding(query);

    // Tính toán similarity bằng raw SQL (Cosine Similarity)
    // Lưu ý: Đây là giải pháp tạm thời nếu db không có pgvector.
    // Nếu có pgvector, câu truy vấn sẽ là ORDER BY embedding <=> $1
    // Ở đây tôi dùng công thức tính cosine similarity cơ bản trên PostgreSQL array
    try {
      const results: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT 
          c.content,
          v."version_no" as version,
          d.title as doc_title,
          (
            1 - (
              SELECT sum(a*b) / (sqrt(sum(a*a)) * sqrt(sum(b*b)))
              FROM unnest(c.embedding) a, unnest(ARRAY[${queryEmbedding.join(',')}]::float8[]) b
            )
          ) as score
        FROM document_chunks c
        JOIN document_versions v ON c.document_version_id = v.id
        JOIN documents d ON v.document_id = d.id
        WHERE d.deleted_at IS NULL AND d.status = 'APPROVED'
        ORDER BY 4 ASC
        LIMIT ${limit}
      `);

      return results.map((r) => ({
        title: `${r.doc_title} (v${r.version})`,
        content: r.content,
        score: r.score,
      }));
    } catch (error) {
      console.error('Search Docs Error:', error);
      return [];
    }
  }
}
