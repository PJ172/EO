const { EmployeeQueryService } = require('./dist/modules/employee/services/employee-query.service');
const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function run() {
  const svc = new EmployeeQueryService(p, null);
  const result = await svc.getDeptOrgChart('6e9d65b3-ec1a-4ee6-9beb-b3cf252f11b8');
  
  console.log('--- GLOBAL CONTEXT NODES ---');
  result.nodes.filter(n => n.data.isGlobalContext).forEach(n => console.log(n.id, n.data.fullName));
  
  const khauId = '51204995-4242-49d6-b73a-e84f924a241d';
  const haId = '4feae85a-b8d3-4b53-9460-fa87ec814fdb';
  console.log('--- EDGES FROM/TO Khâu & Hà ---');
  result.edges.filter(e => e.source === khauId || e.target === khauId || e.source === haId || e.target === haId).forEach(e => {
    console.log(`${e.id}: [${e.source}] -> [${e.target}]`);
  });
  
  await p.$disconnect();
}
run().catch(console.error);
