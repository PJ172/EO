import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Creating admin user: it / 123456 ...');

    const passwordHash = await bcrypt.hash('123456', 10);

    // Find administrator role
    const adminRole = await prisma.role.findFirst({
        where: { name: { in: ['administrator', 'Administrator', 'ADMINISTRATOR', 'admin', 'Admin'] } }
    });
    console.log('Admin role:', adminRole?.id, adminRole?.name);

    if (!adminRole) {
        const roles = await prisma.role.findMany({ select: { id: true, name: true } });
        console.log('Available roles:', JSON.stringify(roles, null, 2));
    }

    // Try to find existing user named 'it'
    const byUsername = await prisma.user.findFirst({ where: { username: 'it' } });
    let user: any;

    if (byUsername) {
        user = await prisma.user.update({
            where: { id: byUsername.id },
            data: { passwordHash, status: 'ACTIVE' }
        });
        console.log('Updated existing user:', user.id, user.username);
    } else {
        // Check for deleted version like "it_DELETED_xxx"
        const deletedUser = await prisma.user.findFirst({
            where: { username: { startsWith: 'it_DELETED' } }
        });

        if (deletedUser) {
            // Restore by fixing username and password
            user = await prisma.user.update({
                where: { id: deletedUser.id },
                data: {
                    username: 'it',
                    email: 'it@eoffice.local',
                    passwordHash,
                    status: 'ACTIVE'
                }
            });
            console.log('Restored deleted user:', user.id, user.username);
        } else {
            user = await prisma.user.create({
                data: {
                    username: 'it',
                    email: 'it@eoffice.local',
                    passwordHash,
                    status: 'ACTIVE',
                }
            });
            console.log('Created new user:', user.id, user.username);
        }
    }

    // Assign admin role
    if (adminRole) {
        await prisma.userRole.upsert({
            where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
            update: {},
            create: { userId: user.id, roleId: adminRole.id }
        });
        console.log('Assigned role:', adminRole.name);
    }

    const total = await prisma.user.count({ where: { status: 'ACTIVE' } });
    console.log('Total active users:', total);
    console.log('\n=== Done! Login: it / 123456 ===');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
