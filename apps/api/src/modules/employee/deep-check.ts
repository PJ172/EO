import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- DEEP DATABASE CHECK ---');

  // Check tables directly via raw query to bypass any possible Prisma abstractions
  const tables = ['users', 'employees', 'departments'];

  for (const table of tables) {
    try {
      const result = await prisma.$queryRawUnsafe(
        `SELECT count(*) as count FROM public."${table}"`,
      );
      console.log(`Table "${table}" raw count:`, result);
    } catch (e: any) {
      console.log(`Error checking table "${table}":`, e.message);
    }
  }

  // Check specific user record (admin)
  const admin = await prisma.user.findFirst({
    where: { username: 'admin' },
  });
  console.log('\nAdmin user:', admin ? 'Found' : 'NOT FOUND');
  if (admin)
    console.log(
      'Admin ID:',
      admin.id,
      'Status:',
      admin.status,
      'DeletedAt:',
      admin.deletedAt,
    );

  // Check for any deleted users with names
  const deletedUsersSample = await prisma.user.findMany({
    where: { deletedAt: { not: null } },
    take: 5,
    select: { id: true, username: true, deletedAt: true },
  });
  console.log('\nDeleted Users Sample:', deletedUsersSample);

  // Check for any employees at all
  const anyEmployee = await prisma.employee.findFirst({});
  console.log('\nAny employee in table?:', anyEmployee ? 'YES' : 'NO');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
