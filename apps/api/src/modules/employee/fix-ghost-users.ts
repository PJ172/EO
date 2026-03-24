import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- KHÔI PHỤC DỮ LIỆU USER BỊ "LIMBO" (ẨN KHỎI UI) ---');

  // Tìm các User có username chứa _DELETED_ nhưng deletedAt vẫn là null
  // Đây là các hồ sơ "thây ma" - không hiện ở Danh sách chính và cũng không hiện ở Thùng rác
  const limboUsers = await prisma.user.findMany({
    where: {
      username: { contains: '_DELETED_' },
      deletedAt: null,
    },
  });

  console.log(`Tìm thấy ${limboUsers.length} tài khoản đang bị ẩn lỗi.`);

  if (limboUsers.length === 0) {
    console.log('Không có dữ liệu nào cần xử lý.');
    return;
  }

  const now = new Date();
  const result = await prisma.user.updateMany({
    where: {
      id: { in: limboUsers.map((u) => u.id) },
    },
    data: {
      deletedAt: now,
      status: 'INACTIVE',
    },
  });

  console.log(
    `\nTHÀNH CÔNG: Đã đưa ${result.count} tài khoản vào Thùng rác (Trash).`,
  );
  console.log(
    'Bây giờ bạn có thể mở Thùng rác trên Giao diện để xem hoặc xóa vĩnh viễn chúng.',
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
