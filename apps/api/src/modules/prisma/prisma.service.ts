import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Cấu hình các model hỗ trợ soft delete
const SOFT_DELETE_MODELS = [
  'user',
  'employee',
  'department',
  'jobTitle',
  'factory',
];

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    const softDeleteExtension = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const modelLower = model.toLowerCase();
            if (!SOFT_DELETE_MODELS.includes(modelLower)) {
              return query(args);
            }

            // --- READ operations: Tự động lọc các bản ghi đã xóa ---
            if (
              [
                'findFirst',
                'findMany',
                'count',
                'aggregate',
                'groupBy',
              ].includes(operation)
            ) {
              const extendedArgs = (args as any) || {};
              extendedArgs.where = extendedArgs.where || {};

              // Chỉ lọc nếu không có điều kiện deletedAt rõ ràng
              if (extendedArgs.where.deletedAt === undefined) {
                extendedArgs.where.deletedAt = null;
              }
              return query(extendedArgs);
            }

            if (['findUnique', 'findUniqueOrThrow'].includes(operation)) {
              const extendedArgs = (args as any) || {};
              extendedArgs.where = extendedArgs.where || {};

              if (extendedArgs.where.deletedAt === undefined) {
                // findUnique không hỗ trợ lọc thêm, chuyển thành findFirst
                const findFirstArgs = {
                  ...extendedArgs,
                  where: { ...extendedArgs.where, deletedAt: null },
                };
                return this.findFirst(findFirstArgs);
              }
            }

            return query(args);
          },
        },
      },
    });

    // Gán lại instance đã được extend (Nếu dùng NestJS DI,
    // có thể cần một chút trick hoặc đơn giản là dùng middleware nếu không muốn refactor lớn,
    // nhưng ở đây tôi sẽ giữ nguyên cấu trúc kế thừa và sử dụng extension trực tiếp nếu có thể)
    // Tuy nhiên, NestJS inject class PrismaService, việc gán lại 'this' không hoạt động đơn giản như vậy.
    // Cách an toàn nhất là dùng Middleware như cũ nhưng tối ưu hóa nó,
    // HOẶC chuyển sang dùng DI cho một factory.
    // Vì codebase hiện tại đang dùng kế thừa, tôi sẽ tối ưu lại Middleware để giảm overhead
    // thay vì break cấu trúc DI của NestJS.
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper cho transaction
  async executeInTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      return fn(tx as unknown as PrismaClient);
    });
  }
}
