import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Attempting to delete many users...');
        const result = await prisma.user.deleteMany({
            where: { deletedAt: { not: null } }
        });
        console.log('Result:', result);
    } catch (error) {
        console.error('Failed deleteMany:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
