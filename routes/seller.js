const express = require('express');
const router = express.Router();
const { auth, requireUserType } = require('../middlewares/auth');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Mock data for development
const mockSellerData = {
  overview: {
    todayEarnings: 1200,
    thisWeekEarnings: 8500,
    thisMonthEarnings: 32000,
    totalEarnings: 125000,
    activeProducts: 12,
    totalProducts: 15,
    pendingOrders: 3,
    totalOrders: 45,
    customerRating: 4.6,
    totalCustomers: 28
  },
  products: [
    {
      id: 1,
      name: 'Fresh Apples',
      category: 'Fruits',
      price: 180,
      stock: 50,
      unit: 'kg',
      status: 'active',
      rating: 4.5,
      orders: 12,
      description: 'Fresh red apples from our organic farm',
      image: '🍎'
    },
    {
      id: 2,
      name: 'Organic Cauliflower',
      category: 'Vegetables',
      price: 80,
      stock: 25,
      unit: 'kg',
      status: 'active',
      rating: 4.2,
      orders: 8,
      description: 'Organic cauliflower grown without pesticides',
      image: '🥦'
    },
    {
      id: 3,
      name: 'Juicy Oranges',
      category: 'Fruits',
      price: 120,
      stock: 5,
      unit: 'kg',
      status: 'low-stock',
      rating: 4.7,
      orders: 15,
      description: 'Sweet and juicy oranges',
      image: '🍊'
    },
    {
      id: 4,
      name: 'Red Tomatoes',
      category: 'Vegetables',
      price: 90,
      stock: 30,
      unit: 'kg',
      status: 'active',
      rating: 4.3,
      orders: 10,
      description: 'Fresh red tomatoes perfect for cooking',
      image: '🍅'
    }
  ],
  orders: [
    {
      id: 'ORD001',
      date: '2024-01-15',
      status: 'Delivered',
      customer: 'John Doe',
      customerEmail: 'john@example.com',
      items: [
        { name: 'Fresh Apples', quantity: 2, price: 180, total: 360 }
      ],
      total: 360,
      deliveryAddress: 'Ward 5, Thamel, Kathmandu'
    },
    {
      id: 'ORD002',
      date: '2024-01-20',
      status: 'Processing',
      customer: 'Jane Smith',
      customerEmail: 'jane@example.com',
      items: [
        { name: 'Organic Cauliflower', quantity: 1, price: 80, total: 80 },
        { name: 'Juicy Oranges', quantity: 3, price: 120, total: 360 }
      ],
      total: 440,
      deliveryAddress: 'Baneshwor, Kathmandu'
    },
    {
      id: 'ORD003',
      date: '2024-01-22',
      status: 'Pending',
      customer: 'Ram Sharma',
      customerEmail: 'ram@example.com',
      items: [
        { name: 'Red Tomatoes', quantity: 2, price: 90, total: 180 }
      ],
      total: 180,
      deliveryAddress: 'Patan, Lalitpur'
    }
  ],
  customers: [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      totalOrders: 5,
      totalSpent: 1200,
      lastOrder: '2024-01-15',
      rating: 4.5
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      totalOrders: 3,
      totalSpent: 800,
      lastOrder: '2024-01-20',
      rating: 4.8
    }
  ]
};

// Get seller dashboard overview
router.get('/dashboard', auth, requireUserType('seller'), async (req, res) => {
  try {
    // Get seller's products
    const products = await Product.find({ seller: req.user._id });
    const activeProducts = products.filter(p => p.status === 'active').length;
    const lowStockProducts = products.filter(p => p.status === 'low-stock' || p.stock < 10);
    
    // Get seller's orders (mock for now)
    const recentOrders = mockSellerData.orders.slice(0, 3);
    
    // Calculate earnings (mock for now)
    const todayEarnings = 1200;
    const thisWeekEarnings = 8500;
    const thisMonthEarnings = 32000;
    const totalEarnings = 125000;
    
    // Get top products by total orders
    const topProducts = products
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 3);
    
    const dashboardData = {
      success: true,
      data: {
        overview: {
          todayEarnings,
          thisWeekEarnings,
          thisMonthEarnings,
          totalEarnings,
          activeProducts,
          totalProducts: products.length,
          pendingOrders: 3,
          totalOrders: 45,
          customerRating: 4.6,
          totalCustomers: 28
        },
        recentOrders,
        topProducts,
        lowStockProducts
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Seller dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get seller products
router.get('/products', auth, requireUserType('seller'), async (req, res) => {
  try {
    const { category, status, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = { seller: req.user._id };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Get total count for pagination
    const totalProducts = await Product.countDocuments(query);
    
    // Get products with pagination
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('seller', 'firstName lastName farmName farmLocation');
    
    res.json({
      success: true,
      data: {
        products,
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
    console.error('Seller products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// Add new product
router.post('/products', auth, requireUserType('seller'), async (req, res) => {
  try {
    const { name, category, price, stock, unit, description, tags } = req.body;
    
    if (!name || !category || !price || stock === undefined || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, price, stock, and unit are required'
      });
    }
    
    // Create new product
    const newProduct = new Product({
      name,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      unit,
      description: description || '',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      seller: req.user._id,
      farmName: req.user.farmName,
      farmLocation: req.user.farmLocation
    });
    
    await newProduct.save();
    
    // Populate seller information
    await newProduct.populate('seller', 'firstName lastName farmName farmLocation');
    
    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: {
        product: newProduct
      }
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add product'
    });
  }
});

// Update product
router.put('/products/:productId', auth, requireUserType('seller'), async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, category, price, stock, unit, description, status, tags } = req.body;
    
    // Find product and verify ownership
    const product = await Product.findOne({ _id: productId, seller: req.user._id });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to update it'
      });
    }
    
    // Update fields
    if (name) product.name = name;
    if (category) product.category = category;
    if (price !== undefined) product.price = parseFloat(price);
    if (stock !== undefined) product.stock = parseInt(stock);
    if (unit) product.unit = unit;
    if (description !== undefined) product.description = description;
    if (status) product.status = status;
    if (tags) product.tags = tags.split(',').map(tag => tag.trim());
    
    await product.save();
    await product.populate('seller', 'firstName lastName farmName farmLocation');
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product
      }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
});

// Delete product
router.delete('/products/:productId', auth, requireUserType('seller'), async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Find and delete product (verify ownership)
    const product = await Product.findOneAndDelete({ _id: productId, seller: req.user._id });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to delete it'
      });
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});

// Get seller orders
router.get('/orders', auth, requireUserType('seller'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let orders = mockSellerData.orders;
    
    // Filter by status if provided
    if (status && status !== 'all') {
      orders = orders.filter(order => order.status.toLowerCase() === status.toLowerCase());
    }
    
    // Pagination
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
    console.error('Seller orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// Update order status
router.put('/orders/:orderId/status', auth, requireUserType('seller'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }
    
    const orderIndex = mockSellerData.orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    mockSellerData.orders[orderIndex].status = status;
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        order: mockSellerData.orders[orderIndex]
      }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// Get seller earnings
router.get('/earnings', auth, requireUserType('seller'), async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const earnings = {
      today: mockSellerData.overview.todayEarnings,
      thisWeek: mockSellerData.overview.thisWeekEarnings,
      thisMonth: mockSellerData.overview.thisMonthEarnings,
      total: mockSellerData.overview.totalEarnings
    };
    
    // Mock earnings chart data
    const chartData = {
      daily: [
        { date: '2024-01-15', earnings: 800 },
        { date: '2024-01-16', earnings: 1200 },
        { date: '2024-01-17', earnings: 950 },
        { date: '2024-01-18', earnings: 1100 },
        { date: '2024-01-19', earnings: 1300 },
        { date: '2024-01-20', earnings: 1050 },
        { date: '2024-01-21', earnings: 1200 }
      ],
      weekly: [
        { week: 'Week 1', earnings: 6500 },
        { week: 'Week 2', earnings: 7200 },
        { week: 'Week 3', earnings: 8500 },
        { week: 'Week 4', earnings: 9800 }
      ],
      monthly: [
        { month: 'Oct', earnings: 28000 },
        { month: 'Nov', earnings: 31000 },
        { month: 'Dec', earnings: 35000 },
        { month: 'Jan', earnings: 32000 }
      ]
    };
    
    res.json({
      success: true,
      data: {
        earnings,
        chartData: chartData[period] || chartData.monthly
      }
    });
  } catch (error) {
    console.error('Seller earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings data'
    });
  }
});

// Get seller customers
router.get('/customers', auth, requireUserType('seller'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const customers = mockSellerData.customers;
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedCustomers = customers.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        customers: paginatedCustomers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(customers.length / limit),
          totalCustomers: customers.length,
          hasNext: endIndex < customers.length,
          hasPrev: startIndex > 0
        },
        stats: {
          totalCustomers: customers.length,
          newThisMonth: 5,
          repeatCustomers: customers.filter(c => c.totalOrders > 1).length
        }
      }
    });
  } catch (error) {
    console.error('Seller customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers data'
    });
  }
});

module.exports = router;