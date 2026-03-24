const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emps = await prisma.employee.findMany({
    select: { id: true, fullName: true, uiPositionX: true, uiPositionY: true },
    where: { uiPositionY: { not: null } }
  });
  console.log(emps);
}
main();
