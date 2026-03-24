require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emps = await prisma.employee.findMany({
    select: { id: true, fullName: true, uiPositionX: true, uiPositionY: true },
    where: { uiPositionY: { not: null } }
  });
  console.log('Employees with positions:', emps.length);
  if (emps.length > 0) {
      console.log(emps.slice(0, 2));
  }
}
main().catch(console.error).finally(() => process.exit(0));
