import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Creating user: admin / 123456 ...');

    const passwordHash = await bcrypt.hash('123456', 10);

    // Find administrator role (code: ADMIN or name: Administrator)
    const adminRole = await prisma.role.findFirst({
        where: {
            OR: [
                { code: 'ADMIN' },
                { name: { in: ['Administrator', 'administrator', 'admin', 'Admin', 'ADMINISTRATOR'] } }
            ]
        }
    });
    console.log('Admin role found:', adminRole?.id, adminRole?.name, adminRole?.code);

    if (!adminRole) {
        const roles = await prisma.role.findMany({ select: { id: true, name: true, code: true } });
        console.log('Available roles:', JSON.stringify(roles, null, 2));
        console.log('❌ No administrator role found. Please run seed.ts first.');
        return;
    }

    // Upsert user 'admin'
    const user = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            passwordHash,
            status: 'ACTIVE',
        },
        create: {
            username: 'admin',
            email: 'admin@eoffice.local',
            passwordHash,
            status: 'ACTIVE',
        },
    });

    console.log('User upserted:', user.id, user.username);

    // Assign administrator role
    await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
        update: {},
        create: { userId: user.id, roleId: adminRole.id },
    });
    console.log('Assigned role:', adminRole.name);

    // Create an employee profile (optional, for display in HR)
    try {
        await prisma.employee.upsert({
            where: { userId: user.id },
            update: { fullName: 'Admin', employmentStatus: 'OFFICIAL' },
            create: {
                employeeCode: 'EMP-ADMIN',
                fullName: 'Admin',
                emailCompany: 'admin@eoffice.local',
                employmentStatus: 'OFFICIAL',
                userId: user.id,
            },
        });
        console.log('Employee profile created/updated.');
    } catch (e) {
        console.log('Note: Could not create employee profile (field may not exist):', (e as Error).message);
    }

    const total = await prisma.user.count({ where: { status: 'ACTIVE' } });
    console.log('Total active users:', total);
    console.log('\n=== ✅ Done! Login: admin / 123456 ===');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
