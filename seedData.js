const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');

dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // Create sample users (password will be hashed by the User model pre-save hook)
    const plainPassword = 'password123';
    
    const seller1 = await User.create({
      username: 'farmer_ram',
      email: 'ram@example.com',
      password: plainPassword,
      firstName: 'Ram',
      lastName: 'Bahadur',
      phone: '9841234567',
      userType: ['seller'],
      isSeller: true,
      isBuyer: false,
      farmName: 'Ram Organic Farm',
      farmLocation: 'Kathmandu',
      city: 'Kathmandu'
    });

    const seller2 = await User.create({
      username: 'farmer_sita',
      email: 'sita@example.com',
      password: plainPassword,
      firstName: 'Sita',
      lastName: 'Devi',
      phone: '9841234568',
      userType: ['seller'],
      isSeller: true,
      isBuyer: false,
      farmName: 'Sita Fresh Vegetables',
      farmLocation: 'Bhaktapur',
      city: 'Bhaktapur'
    });

    const buyer1 = await User.create({
      username: 'buyer_john',
      email: 'john@example.com',
      password: plainPassword,
      firstName: 'John',
      lastName: 'Doe',
      phone: '9841234569',
      userType: ['buyer'],
      isBuyer: true,
      isSeller: false,
      address: 'Thamel, Kathmandu',
      city: 'Kathmandu'
    });

    console.log('👥 Created sample users');

    // Create sample categories
    const categories = [
      {
        name: 'Leafy Vegetables',
        description: 'Fresh green leafy vegetables',
        icon: '🥬',
        color: '#10B981',
        seller: seller1._id
      },
      {
        name: 'Root Vegetables',
        description: 'Fresh root vegetables',
        icon: '🥕',
        color: '#F59E0B',
        seller: seller1._id
      },
      {
        name: 'Fruits',
        description: 'Fresh seasonal fruits',
        icon: '🍎',
        color: '#EF4444',
        seller: seller2._id
      },
      {
        name: 'Herbs & Spices',
        description: 'Fresh herbs and spices',
        icon: '🌿',
        color: '#059669',
        seller: seller2._id
      }
    ];

    const createdCategories = await Category.insertMany(categories);
    console.log('📂 Created sample categories');

    // Create sample products
    const products = [
      // Leafy Vegetables
      {
        name: 'Fresh Spinach',
        description: 'Organic fresh spinach leaves, rich in iron and vitamins',
        price: 80,
        unit: 'kg',
        stock: 50,
        category: createdCategories[0]._id,
        seller: seller1._id,
        organic: true,
        fresh: true,
        origin: 'Local Farm',
        tags: ['organic', 'leafy', 'iron-rich'],
        isFeatured: true
      },
      {
        name: 'Mustard Greens',
        description: 'Fresh mustard greens, perfect for traditional dishes',
        price: 60,
        unit: 'kg',
        stock: 30,
        category: createdCategories[0]._id,
        seller: seller1._id,
        organic: true,
        fresh: true,
        tags: ['organic', 'leafy', 'traditional']
      },
      {
        name: 'Lettuce',
        description: 'Crispy fresh lettuce for salads',
        price: 120,
        unit: 'kg',
        stock: 25,
        category: createdCategories[0]._id,
        seller: seller1._id,
        organic: false,
        fresh: true,
        tags: ['salad', 'crispy', 'fresh']
      },
      // Root Vegetables
      {
        name: 'Organic Carrots',
        description: 'Sweet and crunchy organic carrots',
        price: 100,
        unit: 'kg',
        stock: 40,
        category: createdCategories[1]._id,
        seller: seller1._id,
        organic: true,
        fresh: true,
        tags: ['organic', 'sweet', 'crunchy'],
        isFeatured: true
      },
      {
        name: 'Fresh Radish',
        description: 'White radish, perfect for pickles and curry',
        price: 70,
        unit: 'kg',
        stock: 35,
        category: createdCategories[1]._id,
        seller: seller1._id,
        organic: false,
        fresh: true,
        tags: ['white', 'pickle', 'curry']
      },
      // Fruits
      {
        name: 'Red Apples',
        description: 'Sweet and juicy red apples from local orchards',
        price: 200,
        unit: 'kg',
        stock: 60,
        category: createdCategories[2]._id,
        seller: seller2._id,
        organic: false,
        fresh: true,
        origin: 'Mustang',
        tags: ['sweet', 'juicy', 'local'],
        isFeatured: true
      },
      {
        name: 'Bananas',
        description: 'Fresh ripe bananas, rich in potassium',
        price: 120,
        unit: 'dozen',
        stock: 80,
        category: createdCategories[2]._id,
        seller: seller2._id,
        organic: false,
        fresh: true,
        tags: ['ripe', 'potassium', 'energy']
      },
      {
        name: 'Oranges',
        description: 'Juicy oranges packed with vitamin C',
        price: 150,
        unit: 'kg',
        stock: 45,
        category: createdCategories[2]._id,
        seller: seller2._id,
        organic: false,
        fresh: true,
        tags: ['juicy', 'vitamin-c', 'citrus']
      },
      // Herbs & Spices
      {
        name: 'Fresh Coriander',
        description: 'Fresh coriander leaves for garnishing',
        price: 40,
        unit: 'bunch',
        stock: 100,
        category: createdCategories[3]._id,
        seller: seller2._id,
        organic: true,
        fresh: true,
        tags: ['garnish', 'aromatic', 'organic']
      },
      {
        name: 'Mint Leaves',
        description: 'Fresh mint leaves for tea and cooking',
        price: 50,
        unit: 'bunch',
        stock: 75,
        category: createdCategories[3]._id,
        seller: seller2._id,
        organic: true,
        fresh: true,
        tags: ['tea', 'aromatic', 'organic']
      }
    ];

    const createdProducts = await Product.insertMany(products);
    console.log('🛒 Created sample products');

    // Update category product counts
    for (const category of createdCategories) {
      const productCount = await Product.countDocuments({ category: category._id });
      await Category.findByIdAndUpdate(category._id, { productCount });
    }

    console.log('✅ Database seeded successfully!');
    console.log(`Created ${createdCategories.length} categories and ${createdProducts.length} products`);
    console.log('\nSample Login Credentials:');
    console.log('Seller 1: ram@example.com / password123');
    console.log('Seller 2: sita@example.com / password123');
    console.log('Buyer: john@example.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();