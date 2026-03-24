import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- KIỂM TRA TỔNG QUAN DỮ LIỆU ---');

  const userTotal = await prisma.user.count();
  const userActive = await prisma.user.count({ where: { deletedAt: null } });
  const userDeleted = await prisma.user.count({
    where: { deletedAt: { not: null } },
  });

  const empTotal = await prisma.employee.count();
  const empActive = await prisma.employee.count({ where: { deletedAt: null } });
  const empDeleted = await prisma.employee.count({
    where: { deletedAt: { not: null } },
  });

  console.log('\n[USER]');
  console.log(`- Tổng: ${userTotal}`);
  console.log(`- Active: ${userActive}`);
  console.log(`- Deleted: ${userDeleted}`);

  console.log('\n[EMPLOYEE]');
  console.log(`- Tổng: ${empTotal}`);
  console.log(`- Active: ${empActive}`);
  console.log(`- Deleted: ${empDeleted}`);

  if (empActive === 0 && empTotal > 0) {
    console.log(
      '\n!!! CẢNH BÁO: TẤT CẢ NHÂN VIÊN ĐANG Ở TRẠNG THÁI ĐÃ XÓA !!!',
    );
    const sample = await prisma.employee.findFirst({
      where: { deletedAt: { not: null } },
    });
    console.log(
      'Mẫu nhân viên đã xóa:',
      sample?.employeeCode,
      sample?.fullName,
      'Ngày xóa:',
      sample?.deletedAt,
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
