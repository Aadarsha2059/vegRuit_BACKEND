const express = require('express');
const router = express.Router();
const { auth, requireUserType } = require('../middlewares/auth');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Mock data for development
const mockBuyerData = {
  overview: {
    totalOrders: 12,
    favoriteItems: 8,
    totalSpent: 4500,
    recentProducts: 15
  },
  orders: [
    {
      id: 'ORD001',
      date: '2024-01-15',
      status: 'Delivered',
      items: [
        { name: 'Fresh Apples', quantity: 2, price: 180, farmer: 'Green Valley Farm' },
        { name: 'Organic Cauliflower', quantity: 1, price: 80, farmer: 'Fresh Harvest Farm' }
      ],
      total: 440,
      deliveryAddress: 'Ward 5, Thamel, Kathmandu'
    },
    {
      id: 'ORD002',
      date: '2024-01-20',
      status: 'Processing',
      items: [
        { name: 'Juicy Oranges', quantity: 3, price: 120, farmer: 'Green Valley Farm' },
        { name: 'Red Tomatoes', quantity: 2, price: 90, farmer: 'Fresh Harvest Farm' }
      ],
      total: 540,
      deliveryAddress: 'Ward 5, Thamel, Kathmandu'
    },
    {
      id: 'ORD003',
      date: '2024-01-22',
      status: 'Pending',
      items: [
        { name: 'Fresh Mangoes', quantity: 1, price: 200, farmer: 'Tropical Farm' }
      ],
      total: 200,
      deliveryAddress: 'Ward 5, Thamel, Kathmandu'
    }
  ],
  favorites: [
    { id: 1, name: 'Fresh Apples', image: '🍎', price: 'Rs. 180/kg', farmer: 'Green Valley Farm', rating: 4.5 },
    { id: 2, name: 'Organic Cauliflower', image: '🥦', price: 'Rs. 80/kg', farmer: 'Fresh Harvest Farm', rating: 4.2 },
    { id: 3, name: 'Juicy Oranges', image: '🍊', price: 'Rs. 120/kg', farmer: 'Green Valley Farm', rating: 4.7 },
    { id: 4, name: 'Red Tomatoes', image: '🍅', price: 'Rs. 90/kg', farmer: 'Fresh Harvest Farm', rating: 4.3 },
    { id: 5, name: 'Fresh Mangoes', image: '🥭', price: 'Rs. 200/kg', farmer: 'Tropical Farm', rating: 4.8 }
  ],
  recentProducts: [
    { id: 1, name: 'Fresh Mangoes', price: 'Rs. 200/kg', farmer: 'Tropical Farm', rating: 4.8, category: 'Fruits' },
    { id: 2, name: 'Organic Cucumbers', price: 'Rs. 60/kg', farmer: 'Fresh Harvest Farm', rating: 4.2, category: 'Vegetables' },
    { id: 3, name: 'Sweet Corn', price: 'Rs. 100/kg', farmer: 'Green Valley Farm', rating: 4.7, category: 'Vegetables' },
    { id: 4, name: 'Fresh Bananas', price: 'Rs. 80/kg', farmer: 'Tropical Farm', rating: 4.4, category: 'Fruits' },
    { id: 5, name: 'Green Spinach', price: 'Rs. 40/kg', farmer: 'Organic Farm', rating: 4.6, category: 'Leafy Greens' }
  ]
};

// Get buyer dashboard overview
router.get('/dashboard', auth, requireUserType('buyer'), async (req, res) => {
  try {
    // Get recent available products
    const recentProducts = await Product.find({ 
      isAvailable: true, 
      status: { $ne: 'inactive' } 
    })
    .populate('seller', 'firstName lastName farmName')
    .sort({ createdAt: -1 })
    .limit(3);
    
    // Transform products for frontend
    const transformedProducts = recentProducts.map(product => ({
      id: product._id,
      name: product.name,
      price: `Rs. ${product.price}/${product.unit}`,
      farmer: product.farmName,
      rating: product.rating,
      category: product.category
    }));
    
    const dashboardData = {
      success: true,
      data: {
        overview: mockBuyerData.overview,
        recentOrders: mockBuyerData.orders.slice(0, 3),
        favoriteItems: mockBuyerData.favorites.slice(0, 3),
        recentProducts: transformedProducts
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Buyer dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get buyer orders
router.get('/orders', auth, requireUserType('buyer'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let orders = mockBuyerData.orders;
    
    // Filter by status if provided
    if (status && status !== 'all') {
      orders = orders.filter(order => order.status.toLowerCase() === status.toLowerCase());
    }
    
    // Pagination (mock implementation)
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedOrders = orders.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        orders: paginatedOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(orders.length / limit),
          totalOrders: orders.length,
          hasNext: endIndex < orders.length,
          hasPrev: startIndex > 0
        }
      }
    });
  } catch (error) {
    console.error('Buyer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// Get buyer favorites
router.get('/favorites', auth, requireUserType('buyer'), async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        favorites: mockBuyerData.favorites
      }
    });
  } catch (error) {
    console.error('Buyer favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorites'
    });
  }
});

// Add item to favorites
router.post('/favorites', auth, requireUserType('buyer'), async (req, res) => {
  try {
    const { productId } = req.body;
    
    // In a real application, you would add this to the database
    // For now, we'll just return a success response
    
    res.json({
      success: true,
      message: 'Item added to favorites',
      data: {
        productId
      }
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to favorites'
    });
  }
});

// Remove item from favorites
router.delete('/favorites/:productId', auth, requireUserType('buyer'), async (req, res) => {
  try {
    const { productId } = req.params;
    
    // In a real application, you would remove this from the database
    
    res.json({
      success: true,
      message: 'Item removed from favorites',
      data: {
        productId
      }
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from favorites'
    });
  }
});

// Get recent products (available products from sellers)
router.get('/products/recent', auth, requireUserType('buyer'), async (req, res) => {
  try {
    const { category, limit = 10 } = req.query;
    
    // Build query for recent available products
    const query = { isAvailable: true, status: { $ne: 'inactive' } };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Get recent products
    const products = await Product.find(query)
      .populate('seller', 'firstName lastName farmName farmLocation')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Transform products for frontend
    const transformedProducts = products.map(product => ({
      id: product._id,
      name: product.name,
      price: `Rs. ${product.price}/${product.unit}`,
      priceValue: product.price,
      unit: product.unit,
      farmer: product.farmName,
      rating: product.rating,
      category: product.category,
      stock: product.stock,
      status: product.status
    }));
    
    res.json({
      success: true,
      data: {
        products: transformedProducts
      }
    });
  } catch (error) {
    console.error('Recent products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent products'
    });
  }
});

// Get all available products from sellers
router.get('/products', auth, requireUserType('buyer'), async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query for available products
    const query = { isAvailable: true, status: { $ne: 'inactive' } };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { farmName: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Get total count for pagination
    const totalProducts = await Product.countDocuments(query);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get products with pagination
    const products = await Product.find(query)
      .populate('seller', 'firstName lastName farmName farmLocation city')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Transform products for frontend
    const transformedProducts = products.map(product => ({
      id: product._id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: `Rs. ${product.price}/${product.unit}`,
      priceValue: product.price,
      unit: product.unit,
      stock: product.stock,
      status: product.status,
      rating: product.rating,
      totalRatings: product.totalRatings,
      farmer: product.farmName,
      farmLocation: product.farmLocation,
      seller: product.seller,
      images: product.images,
      tags: product.tags,
      createdAt: product.createdAt,
      isAvailable: product.isAvailable
    }));
    
    res.json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProducts / limit),
          totalProducts,
          hasNext: (page * limit) < totalProducts,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// Update delivery address
router.put('/address', auth, requireUserType('buyer'), async (req, res) => {
  try {
    const { address, city } = req.body;
    
    if (!address || !city) {
      return res.status(400).json({
        success: false,
        message: 'Address and city are required'
      });
    }
    
    // In a real application, you would update the user's address in the database
    // For now, we'll just return a success response
    
    res.json({
      success: true,
      message: 'Delivery address updated successfully',
      data: {
        address,
        city
      }
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery address'
    });
  }
});

module.exports = router;