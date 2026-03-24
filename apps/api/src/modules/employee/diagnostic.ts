import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- ĐANG QUÉT XUNG ĐỘT USER_ID (V4 - SOFT-DELETE CHECK) ---');

  const employees = await prisma.employee.findMany();
  const users = await prisma.user.findMany();

  const userMap = new Map(users.map((u) => [u.id, u]));

  // 1. Tìm các nhân viên đã xóa nhưng VẪN ĐANG GIỮ userId
  // Điều này sẽ ngăn hồ sơ mới lấy tài khoản đó dù hồ sơ cũ đã "biến mất" khỏi UI
  const deletedHolders = employees.filter(
    (e) => e.deletedAt !== null && e.userId !== null,
  );

  if (deletedHolders.length > 0) {
    console.log(
      '\n[CẢNH BÁO] Nhân viên ĐÃ XÓA nhưng vẫn đang giữ liên kết Tài khoản:',
    );
    console.table(
      deletedHolders.map((e) => {
        const u = userMap.get(e.userId!);
        return {
          'Mã NV cũ': e.employeeCode,
          'Họ Tên': e.fullName,
          Username: u?.username,
          UserID: e.userId,
          'Ngày xóa': e.deletedAt,
        };
      }),
    );
    console.log(
      '\n=> RỦI RO: Nếu bạn import Mã NV trùng với Username của nhân viên đã xóa này,',
    );
    console.log(
      '=> hệ thống sẽ không thể gán UserID cho hồ sơ mới vì nó bị "kẹt" ở hồ sơ cũ.',
    );
  } else {
    console.log('\n[OK] Không có nhân viên đã xóa nào đang giữ UserID.');
  }

  // 2. Kiểm tra xem có hồ sơ nào bị trùng lặp user_id ngay trong file (hoặc trong mảng import) không
  // Nhưng vì đây là quét DB nên ta kiểm tra xem có User nào được > 1 Employee trỏ tới không (dù DB có unique constraint)
  const userIdCounts = new Map();
  employees.forEach((e) => {
    if (e.userId) {
      userIdCounts.set(
        e.userId,
        (userIdCounts.get(e.userId) || []).concat(e.employeeCode),
      );
    }
  });

  const multipleLinks = Array.from(userIdCounts.entries()).filter(
    ([uid, codes]) => codes.length > 1,
  );
  if (multipleLinks.length > 0) {
    console.log(
      '\n[LỖI NGHIÊM TRỌNG] Một tài khoản đang được liên kết với NHIỀU nhân viên:',
    );
    console.table(
      multipleLinks.map(([uid, codes]) => ({
        UserID: uid,
        'Các Mã NV liên quan': codes.join(', '),
      })),
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
