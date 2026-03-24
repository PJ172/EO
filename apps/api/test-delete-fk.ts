import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst({
            where: { deletedAt: { not: null } }
        });

        if (!user) return;

        await prisma.user.delete({
            where: { id: user.id }
        });
    } catch (e: any) {
        console.log('Error code:', e.code);
        console.log('Meta:', e.meta);
        console.log('Message:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
