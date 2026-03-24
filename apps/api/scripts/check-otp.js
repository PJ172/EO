
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const target = process.argv[2];
    if (!target) {
        console.error('Usage: node check-otp.js <email_or_phone>');
        process.exit(1);
    }

    const codeRecord = await prisma.verificationCode.findFirst({
        where: { target },
        orderBy: { createdAt: 'desc' },
    });

    if (codeRecord) {
        console.log(codeRecord.code);
    } else {
        console.error('NOT_FOUND');
        process.exit(1);
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
