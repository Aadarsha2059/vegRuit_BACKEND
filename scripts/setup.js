const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up TarkariShop Backend...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  
  const envContent = `PORT=5001
MONGODB_URI=mongodb://localhost:27017/tarkarishop
JWT_SECRET=${generateRandomSecret()}
NODE_ENV=development
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created\n');
  
  // Also create .env.example
  fs.writeFileSync(envExamplePath, envContent.replace(/JWT_SECRET=.+/, 'JWT_SECRET=your_jwt_secret_key_here'));
  console.log('✅ .env.example file created\n');
} else {
  console.log('✅ .env file already exists\n');
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  console.log('📁 Creating uploads directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Uploads directory created\n');
} else {
  console.log('✅ Uploads directory already exists\n');
}

console.log('🎉 Setup complete!\n');
console.log('Next steps:');
console.log('1. Make sure MongoDB is running');
console.log('2. Run: npm run seed (to populate database with sample data)');
console.log('3. Run: npm run dev (to start the server)');
console.log('4. Run: npm test (to verify everything works)\n');

function generateRandomSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let secret = '';
  for (let i = 0; i < 64; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}
