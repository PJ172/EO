const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function run() {
  const deptId = '6e9d65b3-ec1a-4ee6-9beb-b3cf252f11b8';
  const department = await p.department.findUnique({
    where: { id: deptId },
    include: {
      employees: {
        select: { id: true, managerEmployeeId: true }
      },
      division: { include: { factory: { include: { company: true } } } }
    }
  });

  const employees = await p.employee.findMany({
    where: { departmentId: deptId, employmentStatus: { not: 'RESIGNED' } }
  });

  const matrixOverrides = await p.orgChartOverride.findMany();

  const employeeIds = new Set();
  employees.forEach(e => employeeIds.add(e.id));
  
  if (department.managerEmployeeId && !department.employees.find(e => e.id === department.managerEmployeeId)) {
    employeeIds.add(department.managerEmployeeId);
  }

  const nodes = [];
  const edges = [];
  
  const rootId = '770d4b82-526f-4991-b0f8-5b16ee6e5ed5'; // Lan

  employees.forEach((emp) => {
    if (emp.managerEmployeeId && employeeIds.has(emp.managerEmployeeId)) {
        edges.push({
          id: `e-${emp.managerEmployeeId}-${emp.id}`,
          source: emp.managerEmployeeId,
          target: emp.id,
          type: 'solid'
        });
    }
  });

  const div = department.division;
  const fac = div.factory;
  const comp = fac.company;

  const globalContextChain = [];
  if (div && div.managerEmployeeId && !employeeIds.has(div.managerEmployeeId)) {
      globalContextChain.unshift({ id: div.managerEmployeeId, name: 'Hà' });
  }
  if (fac && fac.managerEmployeeId && !employeeIds.has(fac.managerEmployeeId) && !globalContextChain.find(g => g.id == fac.managerEmployeeId)) {
      globalContextChain.unshift({ id: fac.managerEmployeeId, name: 'Hà (fac)' });
  }
  if (comp && comp.managerEmployeeId && !employeeIds.has(comp.managerEmployeeId) && !globalContextChain.find(g => g.id == comp.managerEmployeeId)) {
      globalContextChain.unshift({ id: comp.managerEmployeeId, name: 'Khâu' });
  }

  console.log('--- employeeIds Set HAS Khau?', employeeIds.has('51204995-4242-49d6-b73a-e84f924a241d'));
  console.log('--- employeeIds Set HAS Ha?', employeeIds.has('4feae85a-b8d3-4b53-9460-fa87ec814fdb'));
  console.log('--- globalContextChain ---', globalContextChain);

  globalContextChain.forEach((gEmp, idx) => {
      const nextId = globalContextChain[idx + 1]?.id || rootId;
      if (nextId && nextId !== gEmp.id) {
        edges.push({
          id: `e-global-${gEmp.id}-${nextId}`,
          source: gEmp.id,
          target: nextId,
        });
      }
  });

  console.log('Edges for Hà:', edges.filter(e => e.source === '4feae85a-b8d3-4b53-9460-fa87ec814fdb' || e.target === '4feae85a-b8d3-4b53-9460-fa87ec814fdb'));
  console.log('Edges for Khau:', edges.filter(e => e.source === '51204995-4242-49d6-b73a-e84f924a241d' || e.target === '51204995-4242-49d6-b73a-e84f924a241d'));
  await p.$disconnect();
}
run().catch(console.error);
