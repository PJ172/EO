import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const usersToDelete = await prisma.user.findMany({
            where: { deletedAt: { not: null } },
            select: { id: true },
        });
        const userIds = usersToDelete.map(u => u.id);

        if (userIds.length > 0) {
            console.log(`Found ${userIds.length} users in trash. Attempting to delete...`);

            // Detach from Employee
            await prisma.employee.updateMany({
                where: { userId: { in: userIds } },
                data: { userId: null },
            });

            try {
                const { count } = await prisma.user.deleteMany({
                    where: { id: { in: userIds } },
                });
                console.log(`Deleted ${count} users.`);
            } catch (error: any) {
                console.error("--------- ERROR CATCH ---------");
                console.error("code:", error.code);
                console.error("name:", error.name);
                console.error("message:", error.message);
            }
        } else {
            console.log("No users in trash.");
        }
    } catch (e: any) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
