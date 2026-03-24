
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = [
        { email: 'it@sunplast.vn', username: 'itadmin', passwordHash: '$2b$10$EpRn.testHash' },
        { email: 'admin@iterp.local', username: 'admin', passwordHash: '$2b$10$EpRn.testHash' }
    ];

    for (const u of users) {
        const exists = await prisma.user.findFirst({
            where: { OR: [{ email: u.email }, { username: u.username }] }
        });

        if (!exists) {
            await prisma.user.create({
                data: {
                    username: u.username,
                    email: u.email,
                    passwordHash: u.passwordHash,
                    status: 'ACTIVE'
                }
            });
            console.log(`Created user: ${u.email}`);
        } else {
            console.log(`User already exists: ${u.email}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
