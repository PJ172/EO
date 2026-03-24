import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting role localization...');

    const updates = [
        { code: 'ADMIN', name: 'Quản trị viên', description: 'Toàn quyền hệ thống' },
        { code: 'HR', name: 'Nhân sự', description: 'Nhân viên phòng nhân sự' },
        { code: 'MANAGER', name: 'Trưởng phòng', description: 'Quản lý phòng ban' },
        { code: 'EMPLOYEE', name: 'Nhân viên', description: 'Nhân viên chính thức' },
    ];

    for (const update of updates) {
        const result = await prisma.role.updateMany({
            where: { code: update.code },
            data: {
                name: update.name,
                description: update.description,
            },
        });
        if (result.count > 0) {
            console.log(`✅ Updated role ${update.code} -> ${update.name}`);
        } else {
            console.warn(`⚠️ Role ${update.code} not found`);
        }
    }

    console.log('🎉 Role localization completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
