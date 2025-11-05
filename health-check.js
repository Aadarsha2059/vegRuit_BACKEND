// Health check script for TarkariShop Backend
const http = require('http');

const checkHealth = () => {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200 && data.includes('TarkariShop Backend is running')) {
        console.log('✅ Backend is healthy');
        process.exit(0);
      } else {
        console.log('❌ Backend responded but not healthy');
        process.exit(1);
      }
    });
  });

  req.on('error', (err) => {
    console.log('❌ Backend is not responding:', err.message);
    process.exit(1);
  });

  req.on('timeout', () => {
    console.log('❌ Backend health check timed out');
    req.destroy();
    process.exit(1);
  });

  req.end();
};

checkHealth();