async function main() {
    console.log('Testing Login API...');
    try {
        const response = await fetch('http://localhost:3001/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'Admin@123',
            }),
        });

        const data = await response.json();

        console.log('Status:', response.status);
        console.log('Token obtained.');

        if (response.ok) {
            const token = data.accessToken;
            console.log('\nTesting Department Creation...');

            const deptResponse = await fetch('http://localhost:3001/api/v1/departments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    code: `TEST_DEPT_${Date.now()}`,
                    name: 'Test Department Auto',
                    type: 'DEPARTMENT'
                }),
            });

            const deptData = await deptResponse.json();
            console.log('Dept Create Status:', deptResponse.status);
            console.log('Dept Body:', JSON.stringify(deptData, null, 2));
        }

    } catch (error) {
        console.error('Error calling API:', error);
    }
}

main();
