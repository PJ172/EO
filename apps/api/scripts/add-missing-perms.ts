import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Adding missing permissions...');

    const newPermissions = [
        // NEWS
        { code: 'NEWS_VIEW', description: 'View news', module: 'NEWS' },
        { code: 'NEWS_CREATE', description: 'Create news', module: 'NEWS' },
        { code: 'NEWS_APPROVE', description: 'Approve news', module: 'NEWS' },
        { code: 'NEWS_MANAGE', description: 'Manage news (Categories)', module: 'NEWS' },

        // KPI
        { code: 'KPI_VIEW', description: 'View KPIs', module: 'KPI' },
        { code: 'KPI_CREATE', description: 'Create/Assign KPIs', module: 'KPI' },
        { code: 'KPI_EVALUATE', description: 'Evaluate KPIs', module: 'KPI' },
        { code: 'KPI_APPROVE', description: 'Approve KPIs', module: 'KPI' },

        // PROJECTS
        { code: 'PROJECT_VIEW', description: 'View projects', module: 'PROJECTS' },
        { code: 'PROJECT_CREATE', description: 'Create projects', module: 'PROJECTS' },
        { code: 'PROJECT_MANAGE', description: 'Manage projects', module: 'PROJECTS' },

        // TASKS
        { code: 'TASK_VIEW', description: 'View tasks', module: 'TASKS' },
        { code: 'TASK_CREATE', description: 'Create/Assign tasks', module: 'TASKS' },
        { code: 'TASK_MANAGE', description: 'Manage tasks', module: 'TASKS' },

        // CAR BOOKING (Rename from Room)
        { code: 'CAR_VIEW', description: 'View car bookings', module: 'CAR_BOOKING' },
        { code: 'CAR_BOOK', description: 'Book cars', module: 'CAR_BOOKING' },
        { code: 'CAR_MANAGE', description: 'Manage car bookings', module: 'CAR_BOOKING' },

        // REQUESTS (Generic Workflow)
        { code: 'REQUEST_VIEW', description: 'View requests', module: 'REQUESTS' },
        { code: 'REQUEST_CREATE', description: 'Create requests', module: 'REQUESTS' },
        { code: 'REQUEST_APPROVE', description: 'Approve requests', module: 'REQUESTS' },
    ];

    let createdCount = 0;

    for (const perm of newPermissions) {
        // Upsert to ensure no duplicates
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: {
                description: perm.description,
                module: perm.module
            },
            create: {
                code: perm.code,
                description: perm.description,
                module: perm.module
            }
        });
        createdCount++;
    }

    // Auto-assign some basic view/create permissions to EMPLOYEE role
    const employeeRole = await prisma.role.findUnique({ where: { code: 'EMPLOYEE' } });
    const employeePerms = [
        'NEWS_VIEW',
        'KPI_VIEW',
        'PROJECT_VIEW',
        'TASK_VIEW', 'TASK_CREATE',
        'CAR_VIEW', 'CAR_BOOK',
        'REQUEST_VIEW', 'REQUEST_CREATE'
    ];

    if (employeeRole) {
        console.log('🔄 Updating EMPLOYEE role permissions...');
        for (const code of employeePerms) {
            const perm = await prisma.permission.findUnique({ where: { code } });
            if (perm) {
                await prisma.rolePermission.upsert({
                    where: { roleId_permissionId: { roleId: employeeRole.id, permissionId: perm.id } },
                    update: {},
                    create: { roleId: employeeRole.id, permissionId: perm.id }
                });
            }
        }
    }

    // Assign ALL to ADMIN
    const adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
    if (adminRole) {
        console.log('🔄 Updating ADMIN role permissions...');
        const allPerms = await prisma.permission.findMany();
        for (const perm of allPerms) {
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
                update: {},
                create: { roleId: adminRole.id, permissionId: perm.id }
            });
        }
    }

    console.log(`✅ Added ${createdCount} new permissions checked/inserted.`);
    console.log('🎉 Permission update completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
