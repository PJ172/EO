import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting DB cleanup using TRUNCATE CASCADE...");

    // TRUNCATE CASCADE will delete all data in the listed tables 
    // AND automatically wipe any dependent data in referencing tables.
    const tablesToTruncate = [
        'import_history',
        'employees',
        'job_titles',
        'sections',
        'departments',
        'divisions',
        'factories',
        'companies'
    ];

    for (const table of tablesToTruncate) {
        console.log(`Truncating ${table}...`);
        try {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        } catch (e) {
            console.log(`Failed to truncate ${table}:`, e);
        }
    }

    console.log("Cleanup complete!");
}

main()
    .catch((e) => {
        console.error("Cleanup error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
