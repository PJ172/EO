import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
    console.log("Creating IT Administrator account...");

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

    const existingUser = await prisma.user.findUnique({
        where: { username: 'it' }
    });

    const hashedPassword = await bcrypt.hash('123456', 10);

    if (existingUser) {
        await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                passwordHash: hashedPassword,
                roles: {
                    create: [{ role: { connect: { id: adminRole.id } } }]
                }
            }
        });
        console.log("Updated existing 'it' user with password '123456' and Admin role.");
    } else {
        await prisma.user.create({
            data: {
                username: 'it',
                passwordHash: hashedPassword,
                email: 'it_admin@eoffice.local',
                status: 'ACTIVE',
                roles: {
                    create: [{ role: { connect: { id: adminRole.id } } }]
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
    });
