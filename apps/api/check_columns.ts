import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking database columns for companies table...');
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'companies' AND table_schema = 'public'
    `;
    console.log('Columns in public.companies:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error during query:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
