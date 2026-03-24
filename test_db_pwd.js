const { PrismaClient } = require('@prisma/client');
const passwords = ['123456d', '123456', 'postgres', 'root', 'admin', 'password', ''];

async function main() {
  for (const pwd of passwords) {
    const url = `postgresql://postgres:${pwd}@localhost:5432/postgres?schema=public`;
    const prisma = new PrismaClient({
      datasources: { db: { url } },
    });
    try {
      await prisma.$connect();
      console.log(`Success with password: "${pwd}"`);
      await prisma.$disconnect();
      return;
    } catch (e) {
      if (e.message.includes('Authentication failed')) {
        console.log(`Failed with password: "${pwd}"`);
      } else if (e.message.includes('does not exist')) {
          console.log(`Success with password (but DB postgres missing): "${pwd}"`);
          return;
      } else {
        console.log(`Other error for "${pwd}": ${e.message}`);
      }
    } finally {
      await prisma.$disconnect();
    }
  }
  console.log('None of the common passwords worked.');
}

main();
