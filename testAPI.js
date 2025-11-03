const axios = require('axios');

const BASE_URL = 'http://localhost:50011/api';

const testAPI = async () => {
  try {
    console.log('🧪 Testing TarkariShop API endpoints...\n');

    // Test 1: Get public categories
    console.log('1. Testing GET /api/categories/public');
    const categoriesResponse = await axios.get(`${BASE_URL}/categories/public`);
    console.log(`✅ Categories: ${categoriesResponse.data.data.categories.length} found`);

    // Test 2: Get public products
    console.log('\n2. Testing GET /api/products/public');
    const productsResponse = await axios.get(`${BASE_URL}/products/public?limit=20`);
    console.log(`✅ Products: ${productsResponse.data.data.products.length} found`);

    // Test 3: Login as buyer
    console.log('\n3. Testing POST /api/auth/login (buyer)');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'john@example.com',
      password: 'password123'
    });
    console.log('✅ Buyer login successful');
    const buyerToken = loginResponse.data.token;

    // Test 4: Clear cart first
    console.log('\n4. Testing DELETE /api/cart/clear');
    await axios.delete(`${BASE_URL}/cart/clear`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    
    // Get cart (should be empty now)
    console.log('\n5. Testing GET /api/cart');
    const cartResponse = await axios.get(`${BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log(`✅ Cart retrieved: ${cartResponse.data.data.cart.totalItems} items`);

    // Test 6: Add product to cart
    console.log('\n6. Testing POST /api/cart/add');
    const firstProduct = productsResponse.data.data.products[0];
    const addToCartResponse = await axios.post(`${BASE_URL}/cart/add`, {
      productId: firstProduct._id,
      quantity: 2
    }, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log(`✅ Added to cart: ${addToCartResponse.data.data.cart.totalItems} items`);

    // Test 7: Get updated cart
    console.log('\n7. Testing GET /api/cart (after adding item)');
    const updatedCartResponse = await axios.get(`${BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log(`✅ Updated cart: ${updatedCartResponse.data.data.cart.totalItems} items, Total: Rs. ${updatedCartResponse.data.data.cart.totalValue}`);

    // Test 8: Create order
    console.log('\n8. Testing POST /api/orders');
    const orderResponse = await axios.post(`${BASE_URL}/orders`, {
      deliveryAddress: {
        street: 'Thamel Street, Ward 26',
        city: 'Kathmandu',
        state: 'Bagmati',
        postalCode: '44600',
        country: 'Nepal',
        landmark: 'Near Garden of Dreams',
        instructions: 'Call before delivery'
      },
      deliveryTimeSlot: 'morning',
      deliveryInstructions: 'Please handle with care',
      paymentMethod: 'cod',
      notes: 'First order from TarkariShop'
    }, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log(`✅ Order created: ${orderResponse.data.data.order.orderNumber}`);

    // Test 9: Get buyer orders
    console.log('\n9. Testing GET /api/orders/buyer');
    const buyerOrdersResponse = await axios.get(`${BASE_URL}/orders/buyer?limit=5`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log(`✅ Buyer orders: ${buyerOrdersResponse.data.data.orders.length} found`);

    console.log('\n🎉 All API tests passed successfully!');
    console.log('\nAPI is ready for frontend integration.');

  } catch (error) {
    console.error('❌ API Test failed:', error.response?.data || error.message);
  }
};

testAPI();