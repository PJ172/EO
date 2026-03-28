const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  const department = await p.department.findUnique({
    where: { id: '6e9d65b3-ec1a-4ee6-9beb-b3cf252f11b8' },
    include: {
      division: { include: { factory: { include: { company: true } } } }
    }
  });

  const div = department.division;
  const fac = div.factory;
  const comp = fac.company;

  console.log('Div Mgr:', div.managerEmployeeId);
  console.log('Fac Mgr:', fac.managerEmployeeId);
  console.log('Comp Mgr:', comp.managerEmployeeId);

  const testArr = [];
  if (div.managerEmployeeId) {
    testArr.unshift(div.managerEmployeeId);
  }
  if (fac.managerEmployeeId && !testArr.includes(fac.managerEmployeeId)) {
    testArr.unshift(fac.managerEmployeeId);
  }
  if (comp.managerEmployeeId && !testArr.includes(comp.managerEmployeeId)) {
    testArr.unshift(comp.managerEmployeeId);
  }

  console.log('Chain:', testArr);

  await p.$disconnect();
}
main().catch(console.error);
