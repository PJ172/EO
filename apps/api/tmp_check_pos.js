const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();
async function run() {
  const deptId = '6e9d65b3-ec1a-4ee6-9beb-b3cf252f11b8';
  const c = await p.orgChartNodePosition.count({ where: { chartKey: 'DEPT-' + deptId } });
  console.log('Saved positions DEPT:', c);
  
  const c2 = await p.orgChartNodePosition.count();
  console.log('TOTAL positions saved in DB:', c2);
  
  await p.$disconnect();
}
run().catch(console.error);
