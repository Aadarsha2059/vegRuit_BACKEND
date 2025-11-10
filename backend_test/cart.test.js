const request = require('supertest');
const app = require('../index');
const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Category = require('../models/Category');

describe('Cart Tests', () => {
  let buyerToken;
  let buyerId;
  let productId;

  beforeEach(async () => {
    // Create buyer
    const buyer = await User.create({
      username: 'buyertest',
      firstName: 'Buyer',
      lastName: 'Test',
      email: 'buyer@example.com',
      password: 'password123',
      phone: '9841234590',
      address: '123 Buyer St',
      city: 'Kathmandu',
      userType: ['buyer']
    });
    buyerId = buyer._id;

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'buyer@example.com',
        password: 'password123'
      });
    buyerToken = loginResponse.body.data.token;

    // Create seller and category
    const seller = await User.create({
      username: 'sellertest2',
      firstName: 'Seller',
      lastName: 'Test',
      email: 'seller@example.com',
      password: 'password123',
      phone: '9841234591',
      city: 'Kathmandu',
      userType: ['seller'],
      isBuyer: false,
      isSeller: true,
      farmName: 'Test Farm',
      farmLocation: 'Kathmandu'
    });

    const category = await Category.create({
      name: 'Fruits',
      description: 'Fresh fruits',
      seller: seller._id
    });

    // Create product
    const product = await Product.create({
      name: 'Apples',
      description: 'Fresh apples',
      price: 200,
      unit: 'kg',
      stock: 100,
      category: category._id,
      seller: seller._id
    });
    productId = product._id;
  });

  // Test 16: Add Item to Cart
  test('Should add item to cart', async () => {
    const response = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId: productId,
        quantity: 2
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.cart.items.length).toBe(1);
    expect(response.body.data.cart.items[0].quantity).toBe(2);
  });

  // Test 17: Get Cart
  test('Should get user cart', async () => {
    await Cart.create({
      buyer: buyerId,
      items: [{
        product: productId,
        quantity: 3
      }]
    });

    const response = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${buyerToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.cart.totalItems).toBe(3);
  });

  // Test 18: Update Cart Item Quantity
  test('Should update cart item quantity', async () => {
    await Cart.create({
      buyer: buyerId,
      items: [{
        product: productId,
        quantity: 2
      }]
    });

    const response = await request(app)
      .put(`/api/cart/item/${productId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        quantity: 5
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.cart.items[0].quantity).toBe(5);
  });

  // Test 19: Remove Item from Cart
  test('Should remove item from cart', async () => {
    await Cart.create({
      buyer: buyerId,
      items: [{
        product: productId,
        quantity: 2
      }]
    });

    const response = await request(app)
      .delete(`/api/cart/item/${productId}`)
      .set('Authorization', `Bearer ${buyerToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.cart.items.length).toBe(0);
  });

  // Test 20: Clear Cart
  test('Should clear entire cart', async () => {
    await Cart.create({
      buyer: buyerId,
      items: [{
        product: productId,
        quantity: 2
      }]
    });

    const response = await request(app)
      .delete('/api/cart/clear')
      .set('Authorization', `Bearer ${buyerToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.cart.items.length).toBe(0);
    expect(response.body.data.cart.totalItems).toBe(0);
  });

  // Test 21: Add Item Without Authentication
  test('Should not add item to cart without authentication', async () => {
    const response = await request(app)
      .post('/api/cart/add')
      .send({
        productId: productId,
        quantity: 2
      });
    
    expect(response.status).toBe(401);
  });

});
