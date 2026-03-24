import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- DEBUG TRASH QUERY ---');

  // 1. Kiểm tra filter đơn giản nhất (Giống getTrashSummary)
  console.log('\n--- Bước 1: Count với filtering cơ bản ---');
  const simpleCount = await prisma.user.count({
    where: { deletedAt: { not: null } },
  });
  console.log('User count (deletedAt != null):', simpleCount);

  // 2. Mô phỏng TrashService.getTrashItems cho users
  console.log('\n--- Bước 2: Mô phỏng getTrashItems (users) ---');
  const where = { deletedAt: { not: null } };
  const include = {
    employee: { select: { fullName: true } },
    deletedBy: { select: { username: true } },
  };

  const countRaw = await prisma.user.count({ where });
  console.log('Raw Count:', countRaw);

  const rows = await prisma.user.findMany({
    where,
    include,
    take: 20,
  });
  console.log('Rows returned:', rows.length);

  // 3. Kiểm tra logic Middleware (nếu có thể mô phỏng)
  // Vì script này chạy PrismaClient trực tiếp, nó KHÔNG có middleware của PrismaService trừ khi ta copy logic vào đây.
  // NHƯNG nếu script này trả về dữ liệu mà API trả về 0, thì 100% là do Middleware của PrismaService.

  if (rows.length > 0) {
    console.log('Mẫu User:', rows[0].username, 'deletedAt:', rows[0].deletedAt);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
