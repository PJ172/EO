import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const configs = await prisma.tableColumnConfig.findMany();

    const toDelete = [];
    for (const c of configs) {
        if (c.targetId === null) {
            toDelete.push(c.id);
        }
    }

    if (toDelete.length > 0) {
        await prisma.tableColumnConfig.deleteMany({
            where: { id: { in: toDelete } },
        });
        console.log(`Deleted ${toDelete.length} configs where targetId is null.`);
    } else {
        console.log('No configs with targetId = null found.');
    }

    const allRemaining = await prisma.tableColumnConfig.findMany();
    console.log(`There are now ${allRemaining.length} configs total.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
