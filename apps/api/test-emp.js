const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const emps = await prisma.employee.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
        console.log('Last 5 imported employees:');
        emps.forEach(e => {
            console.log(`- ${e.employeeCode}: deptId=${e.departmentId}, status=${e.employmentStatus}, deletedAt=${e.deletedAt}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
