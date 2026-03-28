const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const configs = await prisma.orgChartConfig.findMany();
  console.log(JSON.stringify(configs, null, 2));
}
main().finally(() => prisma.$disconnect());
