const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deptId = 'e9682e94-2d68-45e4-8ae0-880d52900422';

  const employees = await prisma.employee.findMany({
    where: { departmentId: deptId, deletedAt: null, employmentStatus: { not: 'RESIGNED' } },
    select: { 
      fullName: true, 
      sectionId: true, 
      section: { select: { name: true, managerEmployeeId: true } },
      managerEmployeeId: true
    }
  });

  console.log('HR Employees & Sections:');
  employees.forEach(emp => {
    console.log(`${emp.fullName} | Section: ${emp.section?.name || 'NONE'} | Mgr: ${emp.managerEmployeeId}`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
