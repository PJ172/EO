
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/eOffice_Dev',
});

async function checkColumn() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'graduation_year';
    `);

        if (res.rows.length > 0) {
            console.log('✅ Column "graduation_year" EXISTS in table "employees".');
            console.log('Data Type:', res.rows[0].data_type);
        } else {
            console.log('❌ Column "graduation_year" DOES NOT EXIST in table "employees".');
        }
    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await client.end();
    }
}

checkColumn();
