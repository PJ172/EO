import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const factories = await prisma.factory.findMany({ include: { company: true } });
    console.log("Factories in DB:");
    console.log(factories.map(f => ({ code: f.code, name: f.name, companyCode: f.company?.code })));
}

main().finally(() => prisma.$disconnect());
