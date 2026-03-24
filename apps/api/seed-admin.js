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

        // Upsert user "it" — handle both by username and by old email
        let user;
        try {
            user = await prisma.user.upsert({
                where: { username: 'it' },
                update: { passwordHash, status: 'ACTIVE', email: 'it@eoffice.local' },
                create: { username: 'it', email: 'it@eoffice.local', passwordHash, status: 'ACTIVE' }
            });
        } catch (e) {
            // If username 'it' already exists with different email, try with email
            console.warn('Upsert by username failed, trying by email...');
            user = await prisma.user.upsert({
                where: { email: 'it@eoffice.local' },
                update: { passwordHash, status: 'ACTIVE', username: 'it' },
                create: { username: 'it', email: 'it@eoffice.local', passwordHash, status: 'ACTIVE' }
            });
        }
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
            const roles = await prisma.role.findMany({ select: { id: true, name: true } });
            console.warn('WARNING: No administrator role found. Available roles:', roles);
        }

        // Show total users
        const count = await prisma.user.count({ where: { status: 'ACTIVE' } });
        console.log('Total active users:', count);
        console.log('\n=== Done! Login: username=it  password=123456 ===');
    } catch (e) {
        console.error('ERROR:', e.message || e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
