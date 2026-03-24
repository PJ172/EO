const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/eOffice_Dev',
});

async function checkHiddenData() {
    try {
        await client.connect();
        console.log('Connected to database.\n');

        // 1. Check role codes
        console.log('=== ROLES TABLE (code values) ===');
        const roles = await client.query('SELECT id, code, name FROM "roles" ORDER BY code');
        console.table(roles.rows);

        // 2. Check factories table columns
        console.log('\n=== FACTORIES TABLE COLUMNS ===');
        const factoryColumns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'factories'
            ORDER BY ordinal_position;
        `);
        console.table(factoryColumns.rows);

        // 3. Check user_roles - who has what role
        console.log('\n=== USER ROLES (who has admin?) ===');
        const userRoles = await client.query(`
            SELECT u.username, u.email, r.code as role_code, r.name as role_name
            FROM user_roles ur
            JOIN users u ON u.id = ur.user_id
            JOIN roles r ON r.id = ur.role_id
            ORDER BY u.username;
        `);
        console.table(userRoles.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkHiddenData();
