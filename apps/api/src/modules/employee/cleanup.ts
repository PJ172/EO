import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- ĐANG TIẾN HÀNH DỌN DẸP LIÊN KẾT USER_ID ---');

  // Tìm tất cả các nhân viên đã bị xóa (deletedAt != null) mà vẫn còn userId
  const deletedEmployeesWithUser = await prisma.employee.findMany({
    where: {
      deletedAt: { not: null },
      userId: { not: null },
    },
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      userId: true,
    },
  });

  console.log(`Tìm thấy ${deletedEmployeesWithUser.length} hồ sơ cần dọn dẹp.`);

  if (deletedEmployeesWithUser.length === 0) {
    console.log('Không có hồ sơ nào cần xử lý.');
    return;
  }

  // Tiến hành Update hàng loạt
  const result = await prisma.employee.updateMany({
    where: {
      id: { in: deletedEmployeesWithUser.map((e) => e.id) },
    },
    data: {
      userId: null,
    },
  });

  console.log(
    `\nTHÀNH CÔNG: Đã giải phóng ${result.count} liên kết Tài khoản từ các hồ sơ đã xóa.`,
  );
  console.log(
    'Giờ đây bạn có thể tiến hành Import lại mà không bị lỗi Duplicate user_id.',
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
