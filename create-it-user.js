const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log("Creating IT Administrator account...");

    // Find or create Administrator role
    let adminRole = await prisma.role.findFirst({
        where: {
            OR: [
                { code: 'ADMIN' },
                { name: 'Administrator' }
            ]
        }
    });

    if (!adminRole) {
        adminRole = await prisma.role.create({
            data: {
                code: 'ADMIN',
                name: 'Administrator',
                description: 'System Administrator with full access'
            }
        });
        console.log("Created Administrator role.");
    }

    // Check if "it" user already exists
    const existingUser = await prisma.user.findUnique({
        where: { username: 'it' }
    });

    const hashedPassword = await bcrypt.hash('123456', 10);

    if (existingUser) {
        await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                password: hashedPassword,
                roles: {
                    connect: { id: adminRole.id }
                }
            }
        });
        console.log("Updated existing 'it' user with password '123456' and Admin role.");
    } else {
        // Determine the email format, perhaps it@eoffice.local
        await prisma.user.create({
            data: {
                username: 'it',
                password: hashedPassword,
                email: 'it@sunplast.vn',
                status: 'ACTIVE',
                roles: {
                    connect: { id: adminRole.id }
                }
            }
        });
        console.log("Successfully created user 'it' with password '123456' and Admin role.");
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
