const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { employee: { isNot: null } },
        include: { employee: true }
    });

    const category = await prisma.ticketCategory.findFirst();

    if (!user || !category) {
        console.log('Missing data');
        return;
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.ticket.count({
        where: { code: { startsWith: `TK-${dateStr}` } },
    });
    const code = `TK-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    const priority = 'URGENT';
    const slaDeadline = new Date();
    if (priority === 'URGENT') {
        slaDeadline.setHours(slaDeadline.getHours() + 2);
    }

    console.log('Creating ticket with data:', {
        code,
        title: 'Test Error',
        description: 'Testing 500 err',
        categoryId: category.id,
        priority: 'URGENT',
        requesterId: user.employee.id,
        slaDeadline,
    });

    try {
        const result = await prisma.ticket.create({
            data: {
                code,
                title: 'Test Error',
                description: 'Testing 500 err',
                categoryId: category.id,
                priority: 'URGENT',
                requesterId: user.employee.id,
                slaDeadline,
            },
            include: {
                category: true,
                requester: { select: { id: true, fullName: true } },
            },
        });
        console.log('Success:', result);
    } catch (err) {
        console.error('Prisma Error:', err);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
