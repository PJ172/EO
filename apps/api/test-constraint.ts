import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            where: { username: { startsWith: 'admin_DELETED' } },
            select: { id: true, username: true }
        });

        for (const user of users) {
            console.log(`Trying to delete ${user.username}...`);
            try {
                // Detach employee
                await prisma.employee.updateMany({
                    where: { userId: user.id },
                    data: { userId: null }
                });

                await prisma.user.delete({ where: { id: user.id } });
            } catch (error: any) {
                console.log("------- CATCH -------");
                console.log("CODE:", error.code);
                console.log("MESSAGE:");
                console.log(error.message);

                // Try parsing
                const msg = error.message || '';

                // Example P2003 message: 
                // Foreign key constraint failed on the field: `userId`

                // Example Postgres native message wrapped in UnknownError:
                // ... update or delete on table "users" violates foreign key constraint "table_column_configs_userId_fkey" on table "table_column_configs"
                // ... Key (id)=(...) is referenced from table "table_column_configs".

                let table = 'Bảng không xác định';
                let type = 'Lịch sử';

                const refTableMatch = msg.match(/is referenced from table "([^"]+)"/);
                if (refTableMatch) {
                    table = refTableMatch[1];
                }

                console.log(`Parsed table: ${table}`);
            }
        }

    } catch (e: any) {
        console.error('Fatal Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
