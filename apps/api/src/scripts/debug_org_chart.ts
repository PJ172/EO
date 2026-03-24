import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching Org Chart data...");
    const [companies, factories, divisions, departments, sections] = await Promise.all([
        prisma.company.findMany({ where: { deletedAt: null, status: 'ACTIVE' } }),
        prisma.factory.findMany({ where: { deletedAt: null, status: 'ACTIVE' } }),
        prisma.division.findMany({ where: { deletedAt: null, status: 'ACTIVE' } }),
        prisma.department.findMany({ where: { deletedAt: null, status: 'ACTIVE' } }),
        prisma.section.findMany({ where: { deletedAt: null, status: 'ACTIVE' } }),
    ]);

    const fs = require('fs');
    const dumpData = {
        companies,
        factories,
        divisions,
        departments,
        sections
    };
    fs.writeFileSync('org_chart_dump.json', JSON.stringify(dumpData, null, 2));
    console.log("Dumped to org_chart_dump.json");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
