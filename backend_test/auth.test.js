const request = require('supertest');
const app = require('../index');
const User = require('../models/User');

describe('Authentication Tests', () => {
  
  // Test 1: User Registration - Buyer
  test('Should register a new buyer successfully', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '9841234567',
        address: '123 Main St',
        city: 'Kathmandu',
        userType: 'buyer'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('john@example.com');
    expect(response.body.data.token).toBeDefined();
  });

  // Test 2: User Registration - Seller
  test('Should register a new seller successfully', async () => {
    const response = await request(app)
      .post('/api/auth/seller/register')
      .send({
        username: 'janesmith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'password123',
        phone: '9841234568',
        city: 'Kathmandu',
        farmName: 'Green Valley Farm',
        farmLocation: 'Kathmandu'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.farmName).toBe('Green Valley Farm');
  });

  // Test 3: Duplicate Email Registration
  test('Should not register user with duplicate email', async () => {
    await User.create({
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      phone: '9841234569',
      address: '456 Test St',
      city: 'Pokhara',
      userType: ['buyer']
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'anotheruser',
        firstName: 'Another',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
        phone: '9841234570',
        address: '789 Another St',
        city: 'Lalitpur',
        userType: 'buyer'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  // Test 4: Login with Valid Credentials
  test('Should login with valid credentials', async () => {
    const user = await User.create({
      username: 'logintest',
      firstName: 'Login',
      lastName: 'Test',
      email: 'login@example.com',
      password: 'password123',
      phone: '9841234571',
      address: '111 Login St',
      city: 'Bhaktapur',
      userType: ['buyer']
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });

  // Test 5: Login with Invalid Password
  test('Should not login with invalid password', async () => {
    await User.create({
      username: 'testuser2',
      firstName: 'Test',
      lastName: 'User',
      email: 'test2@example.com',
      password: 'password123',
      phone: '9841234572',
      address: '222 Test St',
      city: 'Kathmandu',
      userType: ['buyer']
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test2@example.com',
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // Test 6: Login with Non-existent Email
  test('Should not login with non-existent email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // Test 7: Registration with Missing Fields
  test('Should not register with missing required fields', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        email: 'test@example.com'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  // Test 8: Registration with Invalid Email Format
  test('Should not register with invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testinvalid',
        firstName: 'Test',
        lastName: 'User',
        email: 'invalidemail',
        password: 'password123',
        phone: '9841234573',
        address: '333 Invalid St',
        city: 'Kathmandu',
        userType: 'buyer'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

});
