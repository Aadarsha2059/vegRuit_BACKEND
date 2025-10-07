// Simple test script to verify authentication endpoints
const axios = require('axios');

const API_BASE = 'http://localhost:5001/api/auth';

async function testAuth() {
  console.log('🧪 Testing Authentication Endpoints...\n');

  try {
    // Test 1: Register a new user
    console.log('1. Testing User Registration...');
    const registerData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      phone: '1234567890',
      city: 'Test City',
      userType: ['buyer'],
      isBuyer: true,
      isSeller: false,
      address: 'Test Address'
    };

    const registerResponse = await axios.post(`${API_BASE}/register`, registerData);
    console.log('✅ Registration successful:', registerResponse.data.message);
    console.log('   User ID:', registerResponse.data.user._id);
    console.log('   Token:', registerResponse.data.token ? 'Generated' : 'Missing');
    console.log('');

    // Test 2: Login with username
    console.log('2. Testing Login with Username...');
    const loginData = {
      username: 'testuser',
      password: 'password123'
    };

    const loginResponse = await axios.post(`${API_BASE}/login`, loginData);
    console.log('✅ Login successful:', loginResponse.data.message);
    console.log('   User Type:', loginResponse.data.userType);
    console.log('');

    // Test 3: Login with email
    console.log('3. Testing Login with Email...');
    const loginEmailData = {
      username: 'test@example.com',
      password: 'password123'
    };

    const loginEmailResponse = await axios.post(`${API_BASE}/login`, loginEmailData);
    console.log('✅ Email login successful:', loginEmailResponse.data.message);
    console.log('');

    // Test 4: Test incorrect password
    console.log('4. Testing Incorrect Password...');
    try {
      await axios.post(`${API_BASE}/login`, {
        username: 'testuser',
        password: 'wrongpassword'
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected incorrect password:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');

    // Test 5: Test non-existent user
    console.log('5. Testing Non-existent User...');
    try {
      await axios.post(`${API_BASE}/login`, {
        username: 'nonexistent',
        password: 'password123'
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected non-existent user:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');

    console.log('🎉 All authentication tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAuth();
