const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function reset() {
    const hash = await bcrypt.hash('admin123', 10);
    await prisma.user.update({
        where: { username: 'admin' },
        data: { passwordHash: hash }
    });
    console.log('Password reset to admin123');
}

reset().finally(() => prisma.$disconnect());
