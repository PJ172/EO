import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Adding missing Room Permissions...');

    const permissions = [
        { code: 'ROOM_CREATE', description: 'Create new meeting room', module: 'BOOKING' },
        { code: 'ROOM_UPDATE', description: 'Update meeting room', module: 'BOOKING' },
        { code: 'ROOM_DELETE', description: 'Delete meeting room', module: 'BOOKING' },
    ];

    for (const perm of permissions) {
        const created = await prisma.permission.upsert({
            where: { code: perm.code },
            update: {},
            create: perm,
        });
        console.log(`- Upserted: ${created.code}`);
    }

    // Assign to ADMIN role
    const adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
    if (adminRole) {
        console.log('Assigning to ADMIN role...');
        for (const perm of permissions) {
            const p = await prisma.permission.findUnique({ where: { code: perm.code } });
            if (p) {
                await prisma.rolePermission.upsert({
                    where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
                    update: {},
                    create: { roleId: adminRole.id, permissionId: p.id }
                });
            }
        }
    }

    console.log('✅ Permissions added successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
