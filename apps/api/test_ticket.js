async function test() {
    try {
        const loginRes = await fetch('http://127.0.0.1:3001/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.accessToken;

        if (!token) {
            console.log('Login failed:', loginData);
            return;
        }

        const ticketRes = await fetch('http://127.0.0.1:3001/api/v1/tickets/my-tickets', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('GET /my-tickets Status:', ticketRes.status);
        const body = await ticketRes.text();
        console.log('Output length:', body.length);
        if (ticketRes.status >= 400) console.log('Output error:', body);

        // Also try to create a ticket to see if it fails
        const catsRes = await fetch('http://127.0.0.1:3001/api/v1/tickets/categories', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cats = await catsRes.json();
        if (cats.data && cats.data.length > 0) {
            const createRes = await fetch('http://127.0.0.1:3001/api/v1/tickets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Test Error',
                    description: 'Testing 500 error',
                    categoryId: cats.data[0].id,
                    priority: 'URGENT'
                })
            });
            console.log('POST /tickets Status:', createRes.status);
            console.log('POST /tickets Response:', await createRes.text());
        } else {
            console.log('No ticket categories available to test POST /tickets');
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
