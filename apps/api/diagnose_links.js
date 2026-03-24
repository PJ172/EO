const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  // 1. Find employees whose manager belongs to a DIFFERENT department
  const emps = await p.employee.findMany({ 
    where: { deletedAt: null, employmentStatus: { not: 'RESIGNED' }, managerEmployeeId: { not: null } },
    select: { id: true, fullName: true, departmentId: true, managerEmployeeId: true },
    take: 50
  });
  
  const cross = [];
  for(const e of emps) {
    if (!e.managerEmployeeId) continue;
    const mgr = await p.employee.findUnique({ 
      where: { id: e.managerEmployeeId }, 
      select: { id: true, fullName: true, departmentId: true, deletedAt: true }
    });
    if (mgr && mgr.departmentId !== e.departmentId) {
      cross.push({ 
        employee: e.fullName, empDeptId: e.departmentId, 
        manager: mgr.fullName, mgrDeptId: mgr.departmentId,
        mgrDeleted: mgr.deletedAt !== null
      });
    }
  }
  
  console.log('=== Cross-department manager cases ===');
  console.log(JSON.stringify(cross.slice(0, 10), null, 2));
  console.log(`Total cross-dept: ${cross.length} / ${emps.length} sampled`);
  
  // 2. Check an employee from dept where we expect the issue
  if (cross.length > 0) {
    const sample = cross[0];
    console.log('\n=== Dept chart data for employee dept ===');
    const dept = await p.department.findUnique({
      where: { id: sample.empDeptId },
      select: { id: true, name: true, managerEmployeeId: true }
    });
    const deptEmps = await p.employee.findMany({
      where: { deletedAt: null, departmentId: sample.empDeptId, employmentStatus: { not: 'RESIGNED' } },
      select: { id: true, fullName: true, managerEmployeeId: true }
    });
    console.log('Dept:', dept?.name, '| managerEmployeeId:', dept?.managerEmployeeId);
    console.log('Employees in dept:', deptEmps.length);
    const empIds = new Set(deptEmps.map(e => e.id));
    const missing = deptEmps.filter(e => e.managerEmployeeId && !empIds.has(e.managerEmployeeId));
    console.log('Employees with missing manager in dept:', missing.map(e => ({ name: e.fullName, mgr: e.managerEmployeeId })));
  }
  
  await p.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
