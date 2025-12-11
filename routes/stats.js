const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Get homepage statistics
router.get('/homepage', async (req, res) => {
  try {
    const totalBuyers = await User.countDocuments({ isBuyer: true });
    const totalSellers = await User.countDocuments({ isSeller: true });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    res.json({
      totalBuyers,
      totalSellers,
      totalProducts,
      totalOrders
    });
  } catch (error) {
    console.error('Error fetching homepage stats:', error);
    res.status(500).json({ 
      message: 'Error fetching statistics', 
      error: error.message 
    });
  }
});

module.exports = router;