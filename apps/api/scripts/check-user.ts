
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // 1. Seed Email User
    const user = await prisma.user.upsert({
        where: { email: 'it@sunplast.vn' },
        update: {},
        create: {
            username: 'itadmin',
            email: 'it@sunplast.vn',
            passwordHash: '$2b$10$EpRn.testHash',
            status: 'ACTIVE'
        }
    });
    console.log('User synced (Email):', user.id);

    // 2. Seed Phone User
    const phoneUser = await prisma.user.upsert({
        where: { username: 'phoneuser' },
        update: {},
        create: {
            username: 'phoneuser',
            email: 'phone@sunplast.vn',
            passwordHash: '$2b$10$EpRn.testHash',
            status: 'ACTIVE'
        }
    });

    // Check if phoneUser is already linked to ANY employee
    const existingLink = await prisma.employee.findFirst({
        where: { userId: phoneUser.id }
    });

    if (existingLink) {
        console.log(`User ${phoneUser.id} is already linked to Employee ${existingLink.fullName} (${existingLink.id}). Unlinking...`);
        // We set userId to null for the old link to free up the user
        await prisma.employee.update({
            where: { id: existingLink.id },
            data: { userId: null }
        });
    }

    console.log('--- Cleaning up duplicates for 0347701165 ---');
    const employees = await prisma.employee.findMany({
        where: { phone: '0347701165' }
    });
    console.log(`Found ${employees.length} employees with this phone.`);

    if (employees.length > 0) {
        // CRITICAL: Delete duplicates first, keep only one
        const targetEmp = employees[0];

        if (employees.length > 1) {
            console.log(`Found ${employees.length - 1} duplicates. Deleting...`);
            for (let i = 1; i < employees.length; i++) {
                console.log(`  Deleting: ${employees[i].fullName} (${employees[i].id})`);
                await prisma.employee.delete({ where: { id: employees[i].id } });
            }
        }

        console.log(`Linking Employee ${targetEmp.fullName} (${targetEmp.id}) to User ${phoneUser.id}`);
        await prisma.employee.update({
            where: { id: targetEmp.id },
            data: { userId: phoneUser.id }
        });
    } else {
        console.log('No employee found with phone 0347701165. Creating one...');
        await prisma.employee.create({
            data: {
                employeeCode: 'PHONE001',
                fullName: 'Người dùng Số điện thoại',
                phone: '0347701165',
                userId: phoneUser.id,
                emailCompany: 'phone@sunplast.vn',
                employmentStatus: 'OFFICIAL'
            }
        });
    }

    // 3. Verify Phone Lookup again
    const finalCheck = await prisma.employee.findFirst({
        where: { phone: '0347701165' },
        include: { user: true }
    });
    console.log('FINAL CHECK - Found Employee:', finalCheck?.fullName);
    console.log('FINAL CHECK - Linked User:', finalCheck?.user?.username);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
