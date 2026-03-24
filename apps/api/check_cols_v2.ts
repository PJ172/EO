import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking columns via SELECT * ...');
  try {
    const result = await prisma.$queryRawUnsafe('SELECT * FROM companies LIMIT 1');
    if (Array.isArray(result) && result.length > 0) {
      console.log('Columns found in first row:', Object.keys(result[0]));
    } else {
      console.log('No rows found, but query succeeded.');
      // Try to get column names even if empty
      const cols = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'companies'
      `;
      console.log('All columns for table "companies" (any schema):', (cols as any[]).map(c => c.column_name));
    }
    
  } catch (error) {
    console.error('Error during query:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
