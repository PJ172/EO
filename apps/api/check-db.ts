import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany();
    const departments = await prisma.department.findMany();

    console.log("Companies:", companies.length);
    if (companies.length > 0) console.log(companies.map(c => ({ code: c.code, name: c.name, deletedAt: c.deletedAt })));

    console.log("Departments:", departments.length);
    if (departments.length > 0) console.log(departments.map(d => ({ code: d.code, name: d.name })));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
