const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function run() {
  const deptId = '6e9d65b3-ec1a-4ee6-9beb-b3cf252f11b8';
  
  const department = await p.department.findUnique({
    where: { id: deptId },
    include: {
      employees: {
        select: { id: true, employeeCode: true, jobTitle: { select: { name: true } } }
      },
      division: { include: { factory: { include: { company: true } } } }
    }
  });

  const employees = await p.employee.findMany({
    where: {
      deletedAt: null,
      departmentId: deptId,
      employmentStatus: { not: 'RESIGNED' },
    },
    select: {
      id: true,
      managerEmployeeId: true,
    }
  });

  const employeeIds = new Set();
  employees.forEach(e => employeeIds.add(e.id));
  
  if (department.managerEmployeeId && !employees.find(e => e.id === department.managerEmployeeId)) {
      employeeIds.add(department.managerEmployeeId);
  }

  const nodes = [];
  const edges = [];
  const rootId = '770d4b82-526f-4991-b0f8-5b16ee6e5ed5'; // Lan

  const globalContextChain = [];
  const div = department.division;
  if (div) {
    if (div.managerEmployeeId && !employeeIds.has(div.managerEmployeeId)) {
      const divMgr = await p.employee.findUnique({ where: { id: div.managerEmployeeId } });
      if (divMgr) globalContextChain.unshift({ id: divMgr.id, name: divMgr.fullName });
    }
    const fac = div.factory;
    if (fac) {
      if (fac.managerEmployeeId && !employeeIds.has(fac.managerEmployeeId) && !globalContextChain.find(g => g.id === fac.managerEmployeeId)) {
        const facMgr = await p.employee.findUnique({ where: { id: fac.managerEmployeeId } });
        if (facMgr) globalContextChain.unshift({ id: facMgr.id, name: facMgr.fullName });
      }
      const comp = fac.company;
      if (comp && comp.managerEmployeeId && !employeeIds.has(comp.managerEmployeeId) && !globalContextChain.find(g => g.id === comp.managerEmployeeId)) {
        const compMgr = await p.employee.findUnique({ where: { id: comp.managerEmployeeId } });
        if (compMgr) globalContextChain.unshift({ id: compMgr.id, name: compMgr.fullName });
      }
    }
  }

  console.log('--- employeeIds Set HAS Khau?', employeeIds.has('51204995-4242-49d6-b73a-e84f924a241d'));
  console.log('--- employeeIds Set HAS Ha?', employeeIds.has('4feae85a-b8d3-4b53-9460-fa87ec814fdb'));
  console.log('--- globalContextChain ---', globalContextChain);

  globalContextChain.forEach((gEmp, idx) => {
    const nextId = globalContextChain[idx + 1]?.id || rootId;
    if (nextId && nextId !== gEmp.id) {
      edges.push({
        source: gEmp.id,
        target: nextId,
        type: 'global-dashed'
      });
    }
  });

  console.log(JSON.stringify(edges, null, 2));
  await p.$disconnect();
}
run().catch(console.error);
