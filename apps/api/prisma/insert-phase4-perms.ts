import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Inserting Phase 4 permissions...');

    const permissions = [
        {
            code: 'EMPLOYEE_SENSITIVE_READ',
            description: 'Quyền xem thông tin nhạy cảm của nhân viên (CCCD, Bậc lương, Mã số thuế, etc.)',
            module: 'HR',
        },
        {
            code: 'EMPLOYEE_ALL_VIEW',
            description: 'Quyền xem TOÀN BỘ hồ sơ nhân viên không bị giới hạn bởi phòng ban (Row-Level Security bypass)',
            module: 'HR',
        }
    ];

    for (const p of permissions) {
        const existing = await prisma.permission.findUnique({ where: { code: p.code } });
        if (!existing) {
            await prisma.permission.create({ data: p });
            console.log(`Created permission: ${p.code}`);
        } else {
            console.log(`Permission already exists: ${p.code}`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
