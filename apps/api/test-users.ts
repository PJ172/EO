import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            where: { status: 'ACTIVE' },
            select: { username: true, email: true }
        });
        console.log("Users:", users);
    } catch (e: any) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
