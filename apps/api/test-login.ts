import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({
        where: { username: 'admin' }
    });

    if (!admin) {
        console.log("Admin not found!");
        return;
    }

    console.log("Admin record:", {
        id: admin.id,
        username: admin.username,
        status: admin.status,
        passwordHash: admin.passwordHash
    });

    const isMatch = await bcrypt.compare('Admin@123', admin.passwordHash || '');
    console.log("Match for 'Admin@123':", isMatch);

    // Re-hash using the exact method in auth.service:
    const salt = await bcrypt.genSalt();
    const newHash = await bcrypt.hash('Admin@123', salt);
    console.log("Generated new hash with genSalt:", newHash);

    await prisma.user.update({
        where: { id: admin.id },
        data: { passwordHash: newHash, status: 'ACTIVE' } // ensure active too
    });
    console.log("Updated to new hash. Try logging in again.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
