const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Testing isDeleted=true query in UsersService");

    const where = {};

    where.OR = [
        { deletedAt: { not: null } },
        { username: { contains: '_DELETED_' } },
    ];

    console.log("Querying with where:", JSON.stringify(where, null, 2));

    const results = await prisma.user.findMany({
        where,
    });

    console.log(`Found ${results.length} deleted users.`);
    if (results.length > 0) {
        console.log("First deleted user:", results[0]);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
