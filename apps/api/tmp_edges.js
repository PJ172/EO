const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function run() {
  const department = await p.department.findUnique({
    where: { id: '6e9d65b3-ec1a-4ee6-9beb-b3cf252f11b8' },
    include: { division: { include: { factory: { include: { company: true } } } } }
  });
  
  const div = department.division;
  const fac = div.factory;
  const comp = fac.company;
  
  const globalContextChain = [];
  if (div && div.managerEmployeeId) {
    globalContextChain.unshift({ id: div.managerEmployeeId, name: 'Hà (div)' });
  }
  if (fac && fac.managerEmployeeId && !globalContextChain.find(g => g.id === fac.managerEmployeeId)) {
    globalContextChain.unshift({ id: fac.managerEmployeeId, name: 'Hà (fac)' });
  }
  if (comp && comp.managerEmployeeId && !globalContextChain.find(g => g.id === comp.managerEmployeeId)) {
    globalContextChain.unshift({ id: comp.managerEmployeeId, name: 'Khâu (comp)' });
  }
  
  console.log('Chain:', globalContextChain.map(g => g.name));

  const edges = [];
  const rootId = 'Lan_Id';
  globalContextChain.forEach((gEmp, idx) => {
    const nextId = globalContextChain[idx + 1]?.id || rootId;
    if (nextId && nextId !== gEmp.id) {
       edges.push({
         sourceName: gEmp.name,
         source: gEmp.id,
         targetId: nextId,
       });
    }
  });

  console.log('Edges generated:', edges);
  await p.$disconnect();
}
run().catch(console.error);