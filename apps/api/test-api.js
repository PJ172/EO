const http = require('http');

const jwt = require('jsonwebtoken');
const token = jwt.sign({ sub: 'admin', id: 'admin', username: 'admin', roles: ['SUPER_ADMIN'] }, 'your-super-secret-jwt-key-change-in-production', { expiresIn: '1d' });

http.get('http://localhost:3001/api/v1/factories?sort=code&order=asc&page=1&limit=50&isDeleted=false', { headers: { 'Authorization': `Bearer ${token}` } }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => console.log(data));
})
