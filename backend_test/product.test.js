const request = require('supertest');
const app = require('../index');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');

describe('Product Tests', () => {
  let sellerToken;
  let sellerId;
  let categoryId;

  beforeEach(async () => {
    // Create a seller user
    const seller = await User.create({
      username: 'sellertest',
      firstName: 'Seller',
      lastName: 'Test',
      email: 'seller@example.com',
      password: 'password123',
      phone: '9841234580',
      city: 'Kathmandu',
      userType: ['seller'],
      isBuyer: false,
      isSeller: true,
      farmName: 'Test Farm',
      farmLocation: 'Kathmandu Valley'
    });
    sellerId = seller._id;

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'seller@example.com',
        password: 'password123'
      });
    sellerToken = loginResponse.body.data.token;

    // Create a category
    const category = await Category.create({
      name: 'Vegetables',
      description: 'Fresh vegetables',
      icon: '🥬',
      seller: sellerId
    });
    categoryId = category._id;
  });

  // Test 9: Create Product Successfully
  test('Should create a new product', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Fresh Tomatoes',
        description: 'Organic tomatoes',
        price: 100,
        unit: 'kg',
        stock: 50,
        category: categoryId,
        organic: true
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.product.name).toBe('Fresh Tomatoes');
  });

  // Test 10: Get All Products
  test('Should get all products', async () => {
    await Product.create({
      name: 'Product 1',
      description: 'Test product 1',
      price: 100,
      unit: 'kg',
      stock: 50,
      category: categoryId,
      seller: sellerId
    });

    await Product.create({
      name: 'Product 2',
      description: 'Test product 2',
      price: 150,
      unit: 'kg',
      stock: 30,
      category: categoryId,
      seller: sellerId
    });

    const response = await request(app)
      .get('/api/products');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.products.length).toBeGreaterThanOrEqual(2);
  });

  // Test 11: Get Product by ID
  test('Should get product by ID', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test description',
      price: 100,
      unit: 'kg',
      stock: 50,
      category: categoryId,
      seller: sellerId
    });

    const response = await request(app)
      .get(`/api/products/${product._id}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.product.name).toBe('Test Product');
  });

  // Test 12: Update Product
  test('Should update product', async () => {
    const product = await Product.create({
      name: 'Old Name',
      description: 'Old description',
      price: 100,
      unit: 'kg',
      stock: 50,
      category: categoryId,
      seller: sellerId
    });

    const response = await request(app)
      .put(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'New Name',
        price: 150
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.product.name).toBe('New Name');
    expect(response.body.data.product.price).toBe(150);
  });

  // Test 13: Delete Product
  test('Should delete product', async () => {
    const product = await Product.create({
      name: 'To Delete',
      description: 'Will be deleted',
      price: 100,
      unit: 'kg',
      stock: 50,
      category: categoryId,
      seller: sellerId
    });

    const response = await request(app)
      .delete(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const deletedProduct = await Product.findById(product._id);
    expect(deletedProduct).toBeNull();
  });

  // Test 14: Create Product Without Authentication
  test('Should not create product without authentication', async () => {
    const response = await request(app)
      .post('/api/products')
      .send({
        name: 'Test Product',
        price: 100,
        unit: 'kg',
        stock: 50
      });
    
    expect(response.status).toBe(401);
  });

  // Test 15: Search Products by Name
  test('Should search products by name', async () => {
    await Product.create({
      name: 'Red Apples',
      description: 'Fresh apples',
      price: 200,
      unit: 'kg',
      stock: 30,
      category: categoryId,
      seller: sellerId
    });

    const response = await request(app)
      .get('/api/products?search=apple');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.products.length).toBeGreaterThan(0);
  });

});
