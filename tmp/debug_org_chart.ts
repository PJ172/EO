import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const deptName = 'PHONG HANH CHINH NHAN SU';
  
  const dept = await prisma.department.findFirst({
    where: { name: { contains: deptName } },
    select: { id: true, name: true, managerEmployeeId: true }
  });

  if (!dept) {
    console.log('Department not found');
    return;
  }

  console.log(`Department: ${dept.name} (${dept.id})`);
  console.log(`Dept Manager ID: ${dept.managerEmployeeId}`);

  const employees = await prisma.employee.findMany({
    where: { departmentId: dept.id, deletedAt: null },
    select: { id: true, fullName: true, managerEmployeeId: true }
  });

  console.log('\nEmployees in this Dept:');
  for (const emp of employees) {
    console.log(`- ${emp.fullName} (${emp.id}) -> Manager ID: ${emp.managerEmployeeId}`);
    if (emp.managerEmployeeId === dept.managerEmployeeId) {
        console.log('  [MATCHES DEPT MANAGER]');
    }
  }

  // Check if Dept Manager itself is in another dept
  if (dept.managerEmployeeId) {
      const mgr = await prisma.employee.findUnique({
          where: { id: dept.managerEmployeeId },
          select: { id: true, fullName: true, departmentId: true }
      });
      if (mgr) {
          console.log(`\nDept Manager Info: ${mgr.fullName} (${mgr.id}) in Dept ID: ${mgr.departmentId}`);
      }
  }

  await prisma.$disconnect();
}

main();
