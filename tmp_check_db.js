const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const factory = await prisma.factory.findFirst({
            where: { name: { contains: 'NHẬT VIỆT', mode: 'insensitive' } }
        });
        
        if (!factory) {
            console.log('Factory NHẬT VIỆT not found');
        } else {
            console.log('Factory:', factory.name, 'ID:', factory.id);
            const divisions = await prisma.division.findMany({
                where: { factoryId: factory.id }
            });
            console.log('Divisions for this factory:', divisions.length);
            divisions.forEach(d => console.log(`- ${d.name} (${d.id})`));
        }

        const dept = await prisma.department.findFirst({
            where: { name: { contains: 'BAN GIÁM ĐỐC', mode: 'insensitive' } }
        });

        if (!dept) {
            console.log('Department BAN GIÁM ĐỐC not found');
        } else {
            console.log('Department:', dept.name, 'ID:', dept.id, 'DivisionId:', dept.divisionId);
            const sections = await prisma.section.findMany({
                where: { departmentId: dept.id }
            });
            console.log('Sections for this department:', sections.length);
            sections.forEach(s => console.log(`- ${s.name} (${s.id})`));
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
