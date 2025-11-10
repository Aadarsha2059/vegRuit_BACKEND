const request = require('supertest');
const app = require('../index');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');

describe('Order Tests', () => {
  let buyerToken;
  let buyerId;
  let sellerToken;
  let sellerId;
  let productId;

  beforeEach(async () => {
    // Create buyer
    const buyer = await User.create({
      username: 'buyerorder',
      firstName: 'Buyer',
      lastName: 'Test',
      email: 'buyer@example.com',
      password: 'password123',
      phone: '9841234595',
      address: '123 Buyer St',
      city: 'Kathmandu',
      userType: ['buyer']
    });
    buyerId = buyer._id;

    const buyerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'buyer@example.com',
        password: 'password123'
      });
    buyerToken = buyerLogin.body.data.token;

    // Create seller
    const seller = await User.create({
      username: 'sellerorder',
      firstName: 'Seller',
      lastName: 'Test',
      email: 'seller@example.com',
      password: 'password123',
      phone: '9841234596',
      city: 'Kathmandu',
      userType: ['seller'],
      isBuyer: false,
      isSeller: true,
      farmName: 'Test Farm',
      farmLocation: 'Kathmandu'
    });
    sellerId = seller._id;

    const sellerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'seller@example.com',
        password: 'password123'
      });
    sellerToken = sellerLogin.body.data.token;

    // Create category and product
    const category = await Category.create({
      name: 'Vegetables',
      description: 'Fresh vegetables',
      seller: sellerId
    });

    const product = await Product.create({
      name: 'Tomatoes',
      description: 'Fresh tomatoes',
      price: 100,
      unit: 'kg',
      stock: 50,
      category: category._id,
      seller: sellerId
    });
    productId = product._id;
  });

  // Test 22: Create Order
  test('Should create a new order', async () => {
    // First add item to cart
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId: productId,
        quantity: 2
      });

    // Then create order from cart
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        deliveryAddress: {
          street: '123 Main St',
          city: 'Kathmandu',
          state: 'Bagmati',
          zipCode: '44600'
        },
        paymentMethod: 'cod'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.order.items.length).toBeGreaterThan(0);
  });

  // Test 23: Get Buyer Orders
  test('Should get buyer orders', async () => {
    await Order.create({
      orderNumber: 'TS' + Date.now(),
      buyer: buyerId,
      buyerName: 'Buyer Test',
      buyerEmail: 'buyer@example.com',
      buyerPhone: '9841234595',
      items: [{
        product: productId,
        productName: 'Tomatoes',
        quantity: 2,
        unit: 'kg',
        price: 100,
        total: 200,
        seller: sellerId,
        sellerName: 'Seller Test'
      }],
      subtotal: 200,
      total: 200,
      status: 'pending',
      paymentMethod: 'cod',
      deliveryAddress: {
        street: '123 Main St',
        city: 'Kathmandu',
        state: 'Bagmati'
      }
    });

    const response = await request(app)
      .get('/api/orders/buyer')
      .set('Authorization', `Bearer ${buyerToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.orders.length).toBeGreaterThan(0);
  });

  // Test 24: Get Seller Orders
  test('Should get seller orders', async () => {
    await Order.create({
      orderNumber: 'TS' + Date.now(),
      buyer: buyerId,
      buyerName: 'Buyer Test',
      buyerEmail: 'buyer@example.com',
      buyerPhone: '9841234595',
      items: [{
        product: productId,
        productName: 'Tomatoes',
        quantity: 2,
        unit: 'kg',
        price: 100,
        total: 200,
        seller: sellerId,
        sellerName: 'Seller Test'
      }],
      subtotal: 200,
      total: 200,
      status: 'pending',
      paymentMethod: 'cod',
      deliveryAddress: {
        street: '123 Main St',
        city: 'Kathmandu',
        state: 'Bagmati'
      }
    });

    const response = await request(app)
      .get('/api/orders/seller')
      .set('Authorization', `Bearer ${sellerToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.orders.length).toBeGreaterThan(0);
  });

  // Test 25: Update Order Status
  test('Should update order status', async () => {
    const order = await Order.create({
      orderNumber: 'TS' + Date.now(),
      buyer: buyerId,
      buyerName: 'Buyer Test',
      buyerEmail: 'buyer@example.com',
      buyerPhone: '9841234595',
      items: [{
        product: productId,
        productName: 'Tomatoes',
        quantity: 2,
        unit: 'kg',
        price: 100,
        total: 200,
        seller: sellerId,
        sellerName: 'Seller Test'
      }],
      subtotal: 200,
      total: 200,
      status: 'pending',
      paymentMethod: 'cod',
      deliveryAddress: {
        street: '123 Main St',
        city: 'Kathmandu',
        state: 'Bagmati'
      }
    });

    const response = await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'confirmed'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.order.status).toBe('confirmed');
  });

});
