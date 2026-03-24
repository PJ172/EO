
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging DB ---');

    // 1. Check User
    console.log('Checking User...');
    const user = await prisma.user.findFirst({
        where: { email: 'it@sunplast.vn' },
        include: { employee: true }
    });
    console.log('User found:', user ? 'YES' : 'NO');
    if (user) console.log('Employee relation:', user.employee ? 'YES' : 'NO');

    // 2. Check VerificationCode Table by creating a dummy record
    console.log('Checking VerificationCode table...');
    try {
        await prisma.verificationCode.create({
            data: {
                target: 'test-debug',
                code: '123456',
                type: 'PASSWORD_RESET',
                expiresAt: new Date()
            }
        });
        console.log('VerificationCode created successfully.');

        // Cleanup
        await prisma.verificationCode.deleteMany({ where: { target: 'test-debug' } });
    } catch (e: any) {
        console.error('FAILED to create VerificationCode:', e.message);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
