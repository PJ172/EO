
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtService } from '@nestjs/jwt';

// Mock PrismaService (extends Client + onModuleInit)
class MockPrismaService extends PrismaClient {
    async onModuleInit() { await this.$connect(); }
}

const prisma = new MockPrismaService();
const jwtService = new JwtService({ secret: 'test-secret' });
const authService = new AuthService(prisma as any, jwtService);

async function main() {
    console.log('--- STARTING PASSWORD RECOVERY VERIFICATION ---');

    const target = 'test-recovery@example.com';

    // 1. Cleanup old data
    await prisma.verificationCode.deleteMany({ where: { target } });
    await prisma.user.deleteMany({ where: { email: target } });

    // 2. Create Mock User
    const user = await prisma.user.create({
        data: {
            username: 'test_recovery',
            email: target,
            passwordHash: 'old_hash',
            status: 'ACTIVE'
        }
    });
    console.log(`[1] Created mock user: ${user.email}`);

    // 3. Request OTP
    try {
        await authService.forgotPassword(target);
        console.log('[2] Requested Forgot Password -> Success');
    } catch (e) {
        console.error('[2] Request Failed:', e);
        process.exit(1);
    }

    // 4. Retrieve OTP from DB
    const codeRecord = await prisma.verificationCode.findFirst({
        where: { target },
        orderBy: { createdAt: 'desc' }
    });

    if (!codeRecord) {
        console.error('[3] FATAL: OTP not found in DB!');
        process.exit(1);
    }
    console.log(`[3] Retrieved OTP from DB: ${codeRecord.code}`);

    // 5. Verify OTP
    const isValid = await authService.verifyOtp(target, codeRecord.code);
    if (isValid) {
        console.log('[4] OTP Verification -> Valid');
    } else {
        console.error('[4] OTP Verification -> Invalid');
        process.exit(1);
    }

    // 6. Reset Password
    const newPass = 'newPassword123';
    await authService.resetPassword(target, codeRecord.code, newPass);
    console.log('[5] Reset Password -> Success');

    // 7. Verify New Password Login (Mock validation)
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (updatedUser?.passwordHash !== 'old_hash') {
        console.log('[6] Password Hash Changed -> Verified');
    } else {
        console.error('[6] Password Hash Unchanged -> Failed');
    }

    console.log('--- VERIFICATION COMPLETED SUCCESSFULLY ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
