import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst({
            where: { deletedAt: { not: null } }
        });

        if (!user) {
            console.log('No deleted users found');
            return;
        }

        console.log(`Trying to delete user: ${user.username} (${user.id})`);
        await prisma.user.delete({
            where: { id: user.id }
        });
        console.log('Successfully deleted!');
    } catch (error) {
        console.error('Failed to delete:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
