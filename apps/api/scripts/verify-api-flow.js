const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const target = 'api-test@example.com';
    const apiBase = 'http://localhost:3001/api/v1/auth';

    console.log('--- API VERIFICATION START ---');

    // 1. Setup User
    await prisma.verificationCode.deleteMany({ where: { target } });
    await prisma.user.deleteMany({ where: { email: target } });

    const user = await prisma.user.create({
        data: {
            username: 'api_tester',
            email: target,
            passwordHash: 'old_hash_123',
            status: 'ACTIVE'
        }
    });

    // 2. Request OTP
    console.log('[1] Requesting OTP...');
    const res1 = await fetch(`${apiBase}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, method: 'EMAIL' })
    });
    if (!res1.ok) throw new Error(`Forgot Password Failed: ${res1.statusText}`);

    // 3. Get OTP from DB
    console.log('[2] Fetching OTP from DB...');
    const codeRecord = await prisma.verificationCode.findFirst({
        where: { target },
        orderBy: { createdAt: 'desc' },
    });
    if (!codeRecord) throw new Error('OTP not found in DB');
    console.log(`    OTP: ${codeRecord.code}`);

    // 4. Verify OTP
    console.log('[3] Verifying OTP...');
    const res2 = await fetch(`${apiBase}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, code: codeRecord.code })
    });
    const data2 = await res2.json();
    if (!data2.valid) throw new Error('OTP Verification returned invalid');

    // 5. Reset Password
    console.log('[4] Resetting Password...');
    const newPass = 'newPass_999';
    const res3 = await fetch(`${apiBase}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, code: codeRecord.code, newPassword: newPass })
    });
    if (!res3.ok) throw new Error(`Reset Password Failed: ${res3.statusText}`);

    // 6. Verify Login
    console.log('[5] Verifying Login with new password...');
    const res4 = await fetch(`${apiBase}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'api_tester', password: newPass })
    });
    if (!res4.ok) throw new Error('Login with new password failed');

    const data4 = await res4.json();
    if (!data4.accessToken) throw new Error('No access token returned');

    console.log('--- SUCCESS: Full Flow Verified ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
