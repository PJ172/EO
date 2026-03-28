const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();
async function run() {
  const deptId = '6e9d65b3-ec1a-4ee6-9beb-b3cf252f11b8';
  const employees = await p.employee.findMany({ 
    where: { departmentId: deptId, employmentStatus: { not: 'RESIGNED' } }
  });
  console.log('Other Hàs in dept:', employees.filter(e => e.fullName.includes('HÀ')).map(e => e.fullName));
  await p.$disconnect();
}
run().catch(console.error);
