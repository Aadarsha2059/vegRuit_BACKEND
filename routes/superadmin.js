const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBuyers = await User.countDocuments({ isBuyer: true });
    const totalSellers = await User.countDocuments({ isSeller: true });
    const totalProducts = await Product.countDocuments();
    const totalCategories = await Category.countDocuments();
    const totalOrders = await Order.countDocuments();
    
    // Calculate total revenue
    const orders = await Order.find({ status: 'delivered' });
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    res.json({
      totalUsers,
      totalBuyers,
      totalSellers,
      totalProducts,
      totalCategories,
      totalOrders,
      totalRevenue: totalRevenue.toFixed(2),
      growthRate: 12.5 // This could be calculated based on historical data
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Get all buyers
router.get('/buyers', async (req, res) => {
  try {
    const buyers = await User.find({ isBuyer: true })
      .select('-password')
      .sort({ createdAt: -1 });
    
    // Add orders count for each buyer
    const buyersWithStats = await Promise.all(
      buyers.map(async (buyer) => {
        const ordersCount = await Order.countDocuments({ buyer: buyer._id });
        return {
          ...buyer.toObject(),
          ordersCount
        };
      })
    );
    
    res.json(buyersWithStats);
  } catch (error) {
    console.error('Error fetching buyers:', error);
    res.status(500).json({ message: 'Error fetching buyers', error: error.message });
  }
});

// Get all sellers
router.get('/sellers', async (req, res) => {
  try {
    const sellers = await User.find({ isSeller: true })
      .select('-password')
      .sort({ createdAt: -1 });
    
    // Add products count for each seller
    const sellersWithStats = await Promise.all(
      sellers.map(async (seller) => {
        const productsCount = await Product.countDocuments({ seller: seller._id });
        return {
          ...seller.toObject(),
          productsCount
        };
      })
    );
    
    res.json(sellersWithStats);
  } catch (error) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({ message: 'Error fetching sellers', error: error.message });
  }
});

// Deactivate user
router.patch('/users/:userId/deactivate', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive: false },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ message: 'Error deactivating user', error: error.message });
  }
});

// Activate user
router.patch('/users/:userId/activate', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive: true },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User activated successfully', user });
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({ message: 'Error activating user', error: error.message });
  }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Also delete user's products if seller
    if (user.isSeller) {
      await Product.deleteMany({ seller: user._id });
    }
    
    // Delete user's orders if buyer
    if (user.isBuyer) {
      await Order.deleteMany({ buyer: user._id });
    }
    
    res.json({ message: 'User and associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find()
      .populate('seller', 'username firstName lastName')
      .populate('category', 'name')
      .sort({ createdAt: -1 });
    
    // Format products with proper data
    const formattedProducts = products.map(product => ({
      _id: product._id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      stock: product.stock,
      image: product.images && product.images.length > 0 ? product.images[0] : null,
      category: product.category?.name || 'Uncategorized',
      seller: product.seller ? {
        _id: product.seller._id,
        username: product.seller.username,
        firstName: product.seller.firstName,
        lastName: product.seller.lastName
      } : null,
      isActive: product.isActive,
      createdAt: product.createdAt
    }));
    
    res.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Delete product
router.delete('/products/:productId', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    
    // Add products count for each category
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const productsCount = await Product.countDocuments({ category: category._id });
        return {
          _id: category._id,
          name: category.name,
          description: category.description,
          productsCount,
          createdAt: category.createdAt
        };
      })
    );
    
    res.json(categoriesWithStats);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// Delete category
router.delete('/categories/:categoryId', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.categoryId);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Find or create 'Uncategorized' category
    let uncategorized = await Category.findOne({ name: 'Uncategorized' });
    if (!uncategorized) {
      uncategorized = await Category.create({ 
        name: 'Uncategorized',
        description: 'Products without a specific category'
      });
    }
    
    // Update products in this category to 'Uncategorized'
    await Product.updateMany(
      { category: req.params.categoryId },
      { category: uncategorized._id }
    );
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
});

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('buyer', 'username firstName lastName email')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

module.exports = router;
