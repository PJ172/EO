import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing company query...');
  try {
    const where = {
      deletedAt: null,
    };
    
    console.log('Running findMany with include...');
    const data = await prisma.company.findMany({
      where,
      include: {
        createdBy: { select: { id: true, username: true, email: true } },
        updatedBy: { select: { id: true, username: true, email: true } },
        manager: { select: { id: true, fullName: true, avatar: true } },
        _count: { select: { employees: true, factories: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 50,
    });
    
    console.log('Success! Found companies:', data.length);
    console.log(JSON.stringify(data, null, 2));
    
    const total = await prisma.company.count({ where });
    console.log('Total count:', total);
    
  } catch (error) {
    console.error('Error during query:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
