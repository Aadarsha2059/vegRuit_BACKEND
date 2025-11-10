const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (only categories and products, not users)
    await Category.deleteMany({});
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing categories and products');

    // Check if any users exist
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log('\n⚠️  No users found in database!');
      console.log('📝 Please register users through the frontend:');
      console.log('   - Buyer registration: /buyer/signup');
      console.log('   - Seller registration: /seller/signup\n');
      
      console.log('⏭️  Skipping seed - Categories and products need a seller to be created.');
      console.log('💡 After registering a seller, run: npm run seed\n');
      process.exit(0);
    }

    // Get the first seller to assign categories and products
    const seller = await User.findOne({ userType: 'seller' });
    
    if (!seller) {
      console.log('\n⚠️  No seller accounts found!');
      console.log('📝 Please register a seller account first through: /seller/signup');
      console.log('💡 Then run: npm run seed\n');
      process.exit(0);
    }

    console.log(`✅ Using seller: ${seller.email} for categories and products`);

    // Create categories
    const categories = await Category.insertMany([
      {
        name: 'Vegetables',
        description: 'Fresh organic vegetables',
        icon: '🥬',
        color: '#10b981',
        seller: seller._id
      },
      {
        name: 'Fruits',
        description: 'Fresh seasonal fruits',
        icon: '🍎',
        color: '#ef4444',
        seller: seller._id
      },
      {
        name: 'Leafy Greens',
        description: 'Fresh leafy vegetables',
        icon: '🥗',
        color: '#22c55e',
        seller: seller._id
      },
      {
        name: 'Root Vegetables',
        description: 'Fresh root vegetables',
        icon: '🥕',
        color: '#f97316',
        seller: seller._id
      }
    ]);
    console.log(`✅ Created ${categories.length} categories`);

    // Create sample products
    const products = await Product.insertMany([
      {
        name: 'Fresh Tomatoes',
        description: 'Organic red tomatoes, locally grown',
        price: 80,
        unit: 'kg',
        stock: 100,
        category: categories[0]._id,
        seller: seller._id,
        images: [],
        organic: true,
        fresh: true,
        origin: 'Kathmandu Valley',
        tags: ['organic', 'fresh', 'local'],
        isActive: true,
        status: 'active',
        isFeatured: true
      },
      {
        name: 'Green Spinach',
        description: 'Fresh organic spinach leaves',
        price: 60,
        unit: 'kg',
        stock: 50,
        category: categories[2]._id,
        seller: seller._id,
        images: [],
        organic: true,
        fresh: true,
        origin: 'Local Farm',
        tags: ['organic', 'leafy', 'healthy'],
        isActive: true,
        status: 'active',
        isFeatured: true
      },
      {
        name: 'Fresh Apples',
        description: 'Sweet and crispy red apples',
        price: 200,
        unit: 'kg',
        stock: 75,
        category: categories[1]._id,
        seller: seller._id,
        images: [],
        organic: false,
        fresh: true,
        origin: 'Mustang',
        tags: ['fresh', 'sweet', 'crispy'],
        isActive: true,
        status: 'active',
        isFeatured: true
      },
      {
        name: 'Carrots',
        description: 'Fresh orange carrots',
        price: 70,
        unit: 'kg',
        stock: 80,
        category: categories[3]._id,
        seller: seller._id,
        images: [],
        organic: true,
        fresh: true,
        origin: 'Kavre',
        tags: ['organic', 'root', 'healthy'],
        isActive: true,
        status: 'active',
        isFeatured: false
      },
      {
        name: 'Potatoes',
        description: 'Fresh local potatoes',
        price: 50,
        unit: 'kg',
        stock: 150,
        category: categories[3]._id,
        seller: seller._id,
        images: [],
        organic: false,
        fresh: true,
        origin: 'Kavre',
        tags: ['local', 'staple'],
        isActive: true,
        status: 'active',
        isFeatured: false
      },
      {
        name: 'Cucumbers',
        description: 'Fresh green cucumbers',
        price: 60,
        unit: 'kg',
        stock: 60,
        category: categories[0]._id,
        seller: seller._id,
        images: [],
        organic: true,
        fresh: true,
        origin: 'Bhaktapur',
        tags: ['organic', 'fresh', 'crunchy'],
        isActive: true,
        status: 'active',
        isFeatured: false
      },
      {
        name: 'Bananas',
        description: 'Ripe yellow bananas',
        price: 120,
        unit: 'dozen',
        stock: 100,
        category: categories[1]._id,
        seller: seller._id,
        images: [],
        organic: false,
        fresh: true,
        origin: 'Chitwan',
        tags: ['fresh', 'sweet', 'ripe'],
        isActive: true,
        status: 'active',
        isFeatured: true
      },
      {
        name: 'Cauliflower',
        description: 'Fresh white cauliflower',
        price: 90,
        unit: 'kg',
        stock: 40,
        category: categories[0]._id,
        seller: seller._id,
        images: [],
        organic: true,
        fresh: true,
        origin: 'Kathmandu',
        tags: ['organic', 'fresh', 'healthy'],
        isActive: true,
        status: 'active',
        isFeatured: false
      }
    ]);
    console.log('✅ Created sample products');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Assigned to seller: ${seller.email}`);
    console.log('\n✅ Your application is ready to use!');
    console.log('📝 Users can now register through the frontend.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
