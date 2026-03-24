const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const deptId = 'e9682e94-2d68-45e4-8ae0-880d52900422'; // PHÒNG HÀNH CHÍNH NHÂN SỰ
  
  const department = await p.department.findUnique({
    where: { id: deptId },
    include: { manager: true }
  });
  const rootId = department.managerEmployeeId; // TRẦN THỊ PHƯƠNG LAN
  console.log('rootId:', rootId);

  const employees = await p.employee.findMany({
    where: { deletedAt: null, departmentId: deptId, employmentStatus: { not: 'RESIGNED' } },
    select: { id: true, fullName: true, managerEmployeeId: true }
  });
  
  const employeeIds = new Set(employees.map(e => e.id));
  if (rootId && !employeeIds.has(rootId)) {
      employees.push({ id: rootId, fullName: department.manager.fullName, managerEmployeeId: null });
      employeeIds.add(rootId);
  }

  const customSolidEdges = new Map();
  const edges = [];

  employees.forEach((emp) => {
      // 1. Skip if it's rootId AND it doesn't have an external human manager
      if (emp.id === rootId) {
          let rootManagerId = emp.managerEmployeeId;
          if (!rootManagerId || !employeeIds.has(rootManagerId)) {
              console.log(`[SKIP] Skipping root manager ${emp.fullName} because they have no external manager loaded.`);
              return; 
          }
      }

      let managerId = emp.managerEmployeeId;

      if (managerId && employeeIds.has(managerId)) {
          // Priority 1
          console.log(`[EDGE P1] ${managerId} -> ${emp.id} (${emp.fullName})`);
          edges.push({ source: managerId, target: emp.id });
      } else if (rootId && employeeIds.has(rootId) && emp.id !== rootId) {
          // Priority 3
          console.log(`[EDGE P3] ${rootId} -> ${emp.id} (${emp.fullName})`);
          edges.push({ source: rootId, target: emp.id });
      } else {
          console.log(`[NO EDGE] ${emp.fullName} has no edge (managerId: ${managerId})`);
      }
  });

  await p.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
