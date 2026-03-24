const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const { EmployeeQueryService } = require('./dist/modules/employee/services/employee-query.service.js'); // Cannot import easily in raw JS

async function run() {
  const deptId = 'e9682e94-2d68-45e4-8ae0-880d52900422';
  
  const dept = await p.department.findUnique({
    where: { id: deptId },
    select: { managerEmployeeId: true }
  });
  console.log('rootId:', dept.managerEmployeeId);

  const employees = await p.employee.findMany({
    where: { deletedAt: null, departmentId: deptId, employmentStatus: { not: 'RESIGNED' } },
    select: { id: true, fullName: true, managerEmployeeId: true }
  });
  
  const empIds = new Set(employees.map(e => e.id));
  if (dept.managerEmployeeId) empIds.add(dept.managerEmployeeId);
  
  employees.forEach(emp => {
      let managerId = emp.managerEmployeeId;
      if (managerId && empIds.has(managerId)) {
          console.log(`[P1] ${emp.fullName} -> mgr ${managerId}`);
      } else if (dept.managerEmployeeId && emp.id !== dept.managerEmployeeId) {
          console.log(`[P3] ${emp.fullName} -> root ${dept.managerEmployeeId}`);
      }
  });

  await p.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
