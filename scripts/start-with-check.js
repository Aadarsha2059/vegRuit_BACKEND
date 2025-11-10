const { spawn } = require('child_process');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const checkAndStart = async () => {
  try {
    console.log('🔍 Checking database before starting server...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if users exist
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log('\n⚠️  No users found in database!');
      console.log('🌱 Seeding database with sample data...\n');
      
      await mongoose.disconnect();
      
      // Run seed script
      const seedProcess = spawn('npm', ['run', 'seed'], {
        stdio: 'inherit',
        shell: true
      });

      seedProcess.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Database seeded successfully!');
          startServer();
        } else {
          console.error('\n❌ Failed to seed database');
          process.exit(1);
        }
      });
    } else {
      console.log(`✅ Found ${userCount} users in database`);
      await mongoose.disconnect();
      startServer();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure MongoDB is running!');
    process.exit(1);
  }
};

const startServer = () => {
  console.log('\n🚀 Starting server...\n');
  
  const serverProcess = spawn('node', ['index.js'], {
    stdio: 'inherit',
    shell: true
  });

  serverProcess.on('close', (code) => {
    process.exit(code);
  });
};

checkAndStart();
