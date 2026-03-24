const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deptId = 'e9682e94-2d68-45e4-8ae0-880d52900422';
  const gdId = 'e1a5446b-6ec6-4aba-aedd-e655a2ac41da'; // ID Nguyen Phuong Ha (General Director)

  const employees = await prisma.employee.findMany({
    where: { departmentId: deptId, deletedAt: null, employmentStatus: { not: 'RESIGNED' } },
    select: { id: true, fullName: true, managerEmployeeId: true }
  });

  console.log('Employees in HR Dept reporting to GD (Nguyen Phuong Ha):');
  employees.forEach(emp => {
    if (emp.managerEmployeeId === gdId) {
      console.log(`- ${emp.fullName} (${emp.id}) reports to GD`);
    } else {
      // console.log(`- ${emp.fullName} reports to ${emp.managerEmployeeId}`);
    }
  });

  const gdInfo = await prisma.employee.findUnique({
      where: { id: gdId },
      select: { fullName: true, department: { select: { name: true } } }
  });
  console.log(`\nGD Info: ${gdInfo?.fullName} in Dept: ${gdInfo?.department?.name}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
