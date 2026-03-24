import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Checking Admin Employee Link...');

    const adminUser = await prisma.user.findUnique({
        where: { username: 'admin' }
    });

    if (!adminUser) {
        console.error('❌ Admin user not found! Please run seed first.');
        return;
    }

    const adminEmployee = await prisma.employee.findUnique({
        where: { userId: adminUser.id }
    });

    if (adminEmployee) {
        console.log('✅ Admin is already linked to employee:', adminEmployee.fullName);
        return;
    }

    // Find a department (Head Office/IT) for admin
    const department = await prisma.department.findFirst({
        where: { code: 'IT' }
    });

    if (!department) {
        console.warn('⚠️ IT Department not found. Using first available department.');
    }

    const fallbackDept = await prisma.department.findFirst();

    // Find a job title (Manager/Admin)
    const jobTitle = await prisma.jobTitle.findFirst({
        where: { code: 'MANAGER' }
    });

    console.log('🛠 Creating Employee record for Admin...');

    await prisma.employee.create({
        data: {
            employeeCode: 'ADMIN001',
            fullName: 'Administrator',
            emailCompany: adminUser.email || 'admin@eoffice.local',
            departmentId: department?.id || fallbackDept?.id,
            jobTitleId: jobTitle?.id,
            employmentStatus: 'OFFICIAL',
            userId: adminUser.id
        }
    });

    console.log('✅ Successfully linked Admin user to new Employee record: Administrator (ADMIN001)');
}

main()
    .catch((e) => {
        console.error('❌ Error linking admin:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
