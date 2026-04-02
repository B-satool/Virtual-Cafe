// Test login endpoint
const http = require('http');

// Test credentials (these will fail because user doesn't exist, but we can see if endpoint is reachable)
const postData = JSON.stringify({
    email: 'test@example.com',
    password: 'TestPassword123!'
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('BODY:', data);
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    console.error('Server may not be running on port 3001');
    process.exit(1);
});

req.write(postData);
req.end();
