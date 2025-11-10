const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');

dotenv.config();

const checkDatabase = async () => {
  try {
    console.log('🔍 Checking database status...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check users
    const userCount = await User.countDocuments();
    console.log(`👥 Users: ${userCount}`);
    
    if (userCount > 0) {
      const users = await User.find().select('email username userType');
      console.log('   Existing users:');
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.username}) - ${user.userType.join(', ')}`);
      });
    } else {
      console.log('   ⚠️  No users found! Run: npm run seed');
    }

    // Check categories
    const categoryCount = await Category.countDocuments();
    console.log(`\n📁 Categories: ${categoryCount}`);
    if (categoryCount === 0) {
      console.log('   ⚠️  No categories found! Run: npm run seed');
    }

    // Check products
    const productCount = await Product.countDocuments();
    console.log(`\n📦 Products: ${productCount}`);
    if (productCount === 0) {
      console.log('   ⚠️  No products found! Run: npm run seed');
    }

    console.log('\n' + '='.repeat(50));
    
    if (userCount === 0 || categoryCount === 0 || productCount === 0) {
      console.log('\n⚠️  DATABASE IS EMPTY OR INCOMPLETE');
      console.log('\n💡 Solution: Run the following command:');
      console.log('   npm run seed\n');
      console.log('This will create:');
      console.log('   - Sample buyer: buyer@example.com / password123');
      console.log('   - Sample seller: seller@example.com / password123');
      console.log('   - 4 categories');
      console.log('   - 8 sample products\n');
    } else {
      console.log('\n✅ DATABASE IS READY TO USE!\n');
      console.log('Sample credentials:');
      console.log('   Buyer:  buyer@example.com / password123');
      console.log('   Seller: seller@example.com / password123\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    console.log('\n💡 Make sure MongoDB is running!');
    process.exit(1);
  }
};

checkDatabase();
