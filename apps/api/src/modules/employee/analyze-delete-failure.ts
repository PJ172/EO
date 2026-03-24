import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- TRUY VẤN LỖI XÓA VĨNH VIỄN ---');

  // 1. Tìm tài khoản IT
  const itUser = await prisma.user.findFirst({
    where: { username: { startsWith: 'it_DELETED_' } },
  });

  if (!itUser) {
    console.log('Không tìm thấy tài khoản IT trong Thùng rác.');
    return;
  }

  console.log(`Đang kiểm tra tài khoản: ${itUser.username} (ID: ${itUser.id})`);

  // 2. Kiểm tra các bảng có thể đang tham chiếu (Foreign Key)
  // Dựa trên schema.prisma, các trường thường gặp là createdById, updatedById, deletedById

  const checkTables = [
    { name: 'AuditLog', field: 'actorUserId' },
    { name: 'Department', field: 'createdById' },
    { name: 'Department', field: 'updatedById' },
    { name: 'Department', field: 'deletedById' },
    { name: 'Section', field: 'createdById' },
    { name: 'Factory', field: 'createdById' },
    { name: 'Company', field: 'createdById' },
    { name: 'User', field: 'createdById' },
    { name: 'User', field: 'updatedById' },
    { name: 'Employee', field: 'createdById' },
  ];

  console.log('\nPhân tích các ràng buộc:');
  for (const table of checkTables) {
    try {
      const count = await (prisma as any)[
        table.name.charAt(0).toLowerCase() + table.name.slice(1)
      ].count({
        where: { [table.field]: itUser.id },
      });
      if (count > 0) {
        console.log(
          `- [!] Bảng ${table.name} (trường ${table.field}): Có ${count} bản ghi đang tham chiếu.`,
        );
      }
    } catch (e) {}
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
