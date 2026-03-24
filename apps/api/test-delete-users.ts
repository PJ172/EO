import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const usersToDelete = await prisma.user.findMany({
            where: { deletedAt: { not: null } },
            select: { id: true, username: true }
        });

        console.log(`Found ${usersToDelete.length} deleted users.`);

        for (const user of usersToDelete) {
            console.log(`Attempting to delete user ${user.username}...`);
            try {
                await prisma.user.delete({ where: { id: user.id } });
                console.log(`Successfully deleted ${user.username}`);
            } catch (e: any) {
                console.error(`Failed to delete ${user.username}: ${e.message}`);
                break;
            }
        }

    } catch (e: any) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
