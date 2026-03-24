import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      fullName: true,
      employeeCode: true,
      managerEmployeeId: true,
      jobTitle: { select: { name: true } },
    },
  });

  console.log('--- DANH SÁCH NHÂN SỰ CHỦ CHỐT ---');
  employees.forEach(emp => {
    const title = emp.jobTitle?.name || '---';
    if (title.toLowerCase().includes('chủ tịch') || title.toLowerCase().includes('tổng giám đốc') || title.toLowerCase().includes('giám đốc')) {
      const manager = employees.find(m => m.id === emp.managerEmployeeId);
      console.log(`[${emp.employeeCode}] ${emp.fullName} - ${title} -> Quản lý: ${manager ? manager.fullName : 'CHƯA CÓ'}`);
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
