import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const where: any = { deletedAt: null };
    const d = await prisma.factory.findMany({ where });
    console.log("Basic FindMany count:", d.length);

    const [data, total] = await Promise.all([
        prisma.factory.findMany({
            where,
            include: {
                createdBy: { select: { username: true, email: true } },
                updatedBy: { select: { username: true, email: true } },
            },
            orderBy: { code: 'asc' },
            skip: 0,
            take: 50,
        }),
        prisma.factory.count({ where }),
    ]);
    console.log("With Includes and Pagination - Data:", data.length, "Total:", total);
}

main().finally(() => prisma.$disconnect());
