const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  // Đọc file .env từ thư mục gốc
  const envPath = path.join(__dirname, '..', '..', '.env');
  console.log('Reading .env from:', envPath);
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/DATABASE_URL="([^"]+)"/);
  
  if (!match) {
    console.error('DATABASE_URL not found in .env');
    return;
  }
  
  const url = match[1];
  console.log('Connecting to:', url.replace(/:([^:]+)@/, ':****@')); // Ẩn password
  
  const client = new Client({ connectionString: url });
  await client.connect();
  
  const res = await client.query(`
    SELECT current_database(), current_schema();
  `);
  console.log('Current DB/Schema:', res.rows[0]);
  
  const res2 = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'employees' 
    ORDER BY column_name;
  `);
  
  console.log('\nColumns in employees table:');
  const columns = res2.rows.map(r => r.column_name);
  columns.forEach(c => console.log('- ' + c));
  
  const hasColumn = columns.includes('show_on_org_chart');
  console.log('\nHas show_on_org_chart:', hasColumn);
  
  await client.end();
}

main().catch(console.error);
