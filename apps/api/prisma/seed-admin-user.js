const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  // Find ADMIN role by code
  const adminRole = await prisma.role.findFirst({ where: { code: 'ADMIN' } });
  console.log('Admin role:', adminRole ? adminRole.name : 'NOT FOUND');

  // Upsert user admin
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash, status: 'ACTIVE', email: 'admin@sunplast.vn' },
    create: { username: 'admin', email: 'admin@sunplast.vn', passwordHash, status: 'ACTIVE' },
  });
  console.log('User:', user.username, '| id:', user.id);

  // Assign ADMIN role
  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
      update: {},
      create: { userId: user.id, roleId: adminRole.id },
    });
    console.log('Role assigned: Administrator (ADMIN) - ALL permissions');
  }

  const total = await prisma.user.count({ where: { status: 'ACTIVE' } });
  console.log('Total active users:', total);
  console.log('\n=== Done! Login: admin / 123456 ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
