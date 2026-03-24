import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- KIỂM TRA NHẬT KÝ HÀNH ĐỘNG (AUDIT LOG) ---');

  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: { in: ['Employee', 'User'] },
      action: { in: ['DELETE', 'UPDATE'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (logs.length === 0) {
    console.log('Không có nhật ký xóa/cập nhật gần đây.');
  } else {
    console.table(
      logs.map((l) => ({
        'Thời gian': l.createdAt,
        'Hành động': l.action,
        'Đối tượng': l.entityType,
        'ID Đối tượng': l.entityId,
        'Người thực hiện': l.actorUserId,
      })),
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
