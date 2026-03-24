import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({
        where: { username: 'admin' }
    });

    if (!admin) {
        console.log("Admin user not found!");
        return;
    }

    // Hash the new password "Admin@123"
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    await prisma.user.update({
        where: { id: admin.id },
        data: { passwordHash: hashedPassword }
    });

    console.log("Admin password reset to: Admin@123");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
