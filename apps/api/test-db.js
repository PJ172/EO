const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const roles = await prisma.role.findMany();
        console.log('Roles in DB:', roles.map(r => r.code));

        // Also try to find a problematic employee record if any
        const emps = await prisma.employee.findMany({ take: 1, orderBy: { createdAt: 'desc' } });
        console.log('Last employee:', emps.length > 0 ? emps[0].employeeCode : 'None');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
