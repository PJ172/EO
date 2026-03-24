const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  // Check the specific problematic manager
  const manager = await p.employee.findUnique({
    where: { id: '12e76064-1046-452e-aa5f-697655c53c23' }, // NGUYỄN PHƯƠNG HOA's manager ID  
    select: { id: true, fullName: true, departmentId: true, deletedAt: true, employmentStatus: true }
  });
  console.log('Manager record:', JSON.stringify(manager, null, 2));

  // Simulate what getDeptOrgChart returns for dept d6a9b77d-f717-4de5-9f09-e99f2b9362de (PHONG KINH DOANH)
  const deptId = 'd6a9b77d-f717-4de5-9f09-e99f2b9362de';
  const emps = await p.employee.findMany({
    where: { deletedAt: null, departmentId: deptId, employmentStatus: { not: 'RESIGNED' } },
    select: { id: true, fullName: true, managerEmployeeId: true }
  });
  
  const empIds = new Set(emps.map(e => e.id));
  const missingMgrIds = new Set();
  emps.forEach(e => {
    if (e.managerEmployeeId && !empIds.has(e.managerEmployeeId)) {
      missingMgrIds.add(e.managerEmployeeId);
    }
  });
  
  console.log('\nemployees in dept:', emps.map(e => e.fullName));
  console.log('Missing manager IDs (to be fetched):', Array.from(missingMgrIds));

  if (missingMgrIds.size > 0) {
    const extMgrs = await p.employee.findMany({
      where: { id: { in: Array.from(missingMgrIds) }, deletedAt: null },
      select: { id: true, fullName: true, employmentStatus: true }
    });
    console.log('External managers found:', JSON.stringify(extMgrs, null, 2));
    console.log('Managers NOT found (missing from result):', Array.from(missingMgrIds).filter(id => !extMgrs.find(m => m.id === id)));
  }

  await p.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
