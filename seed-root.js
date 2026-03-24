const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('Creating admin user: it / 123456 ...');
    try {
        const passwordHash = await bcrypt.hash('123456', 10);

        // Find administrator role
        const adminRole = await prisma.role.findFirst({
            where: { name: { in: ['administrator', 'Administrator', 'ADMINISTRATOR', 'admin', 'Admin'] } }
        });
        console.log('Admin role found:', adminRole?.id, adminRole?.name);

        // Upsert user "it"
        const user = await prisma.user.upsert({
            where: { username: 'it' },
            update: {
                passwordHash,
                status: 'ACTIVE',
                email: 'it@eoffice.local',
            },
            create: {
                username: 'it',
                email: 'it@eoffice.local',
                passwordHash,
                status: 'ACTIVE',
            }
        });
        console.log('User created/updated:', user.id, user.username);

        // Assign administrator role
        if (adminRole) {
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
                update: {},
                create: { userId: user.id, roleId: adminRole.id }
            });
            console.log('Role assigned:', adminRole.name);
        } else {
            console.warn('WARNING: No administrator role found! Please assign manually.');
            // List all roles for reference
            const roles = await prisma.role.findMany({ select: { id: true, name: true } });
            console.log('Available roles:', roles);
        }

        console.log('\n✅ Done! Login: it / 123456');
    } catch (e) {
        console.error('ERROR:', e.message || e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
