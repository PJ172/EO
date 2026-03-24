const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const deptId = 'd6a9b77d-f717-4de5-9f09-e99f2b9362de';
  
  const dept = await p.department.findUnique({
    where: { id: deptId },
    select: { 
      id: true, name: true, managerEmployeeId: true,
      manager: { select: { id: true, fullName: true, employeeCode: true, avatar: true, jobTitle: { select: { name: true } } } }
    }
  });
  
  const emps = await p.employee.findMany({
    where: { deletedAt: null, departmentId: deptId, employmentStatus: { not: 'RESIGNED' } },
    select: { id: true, fullName: true, managerEmployeeId: true, employeeCode: true, avatar: true, jobTitle: { select: { name: true } } }
  });
  
  const empIds = new Set(emps.map(e => e.id));
  const missingMgrIds = new Set();
  emps.forEach(e => {
    if (e.managerEmployeeId && !empIds.has(e.managerEmployeeId)) {
      missingMgrIds.add(e.managerEmployeeId);
    }
  });
  
  let allEmps = [...emps];
  
  if (missingMgrIds.size > 0) {
    const extMgrs = await p.employee.findMany({
      where: { id: { in: Array.from(missingMgrIds) }, deletedAt: null },
      select: { id: true, fullName: true, managerEmployeeId: true, employeeCode: true }
    });
    extMgrs.forEach(m => { allEmps.push(m); empIds.add(m.id); });
  }
  
  const rootId = dept.managerEmployeeId;
  if (rootId && !empIds.has(rootId) && dept.manager) {
    allEmps.push({ id: dept.manager.id, fullName: dept.manager.fullName, managerEmployeeId: null });
    empIds.add(rootId);
  }
  
  console.log('=== All employees (incl. external) ===');
  allEmps.forEach(e => console.log(`${e.id} | ${e.fullName} | mgr: ${e.managerEmployeeId}`));
  
  console.log('\n=== Simulated Edges ===');
  const edges = [];
  allEmps.forEach(emp => {
    if (emp.id === rootId) return; // root has no parent edge
    let managerId = emp.managerEmployeeId;
    if (managerId && empIds.has(managerId)) {
      edges.push({ source: managerId, target: emp.id, srcName: allEmps.find(e => e.id === managerId)?.fullName, tgtName: emp.fullName });
    } else {
      console.log(`  ORPHAN: ${emp.fullName} (mgr ${managerId} not in set)`);
    }
  });
  
  console.log('Edges:', edges.map(e => `${e.srcName} -> ${e.tgtName}`).join('\n'));
  
  await p.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
