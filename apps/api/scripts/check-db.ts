import { PrismaClient } from '@prisma/client';

import 'dotenv/config';

async function check() {
    console.log('🔍 Checking database connection...');
    console.log(`URL: ${process.env.DATABASE_URL}`);

    const prisma = new PrismaClient();

    try {
        await prisma.$connect();
        console.log('✅ Connected successfully!');

        const userCount = await prisma.user.count();
        console.log(`📊 Total Users: ${userCount}`);

        const roles = await prisma.role.findMany();
        console.log(`🔑 Roles found: ${roles.map(r => r.code).join(', ')}`);

        const deptCount = await prisma.department.count();
        console.log(`🏢 Departments: ${deptCount}`);

        if (userCount > 0) {
            console.log('🎉 Data exists! Database is ready.');
        } else {
            console.log('⚠️ Database connected but empty.');
        }

    } catch (e) {
        console.error('❌ Connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
