const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middlewares/auth');

// Get all sellers (public route for displaying sellers)
router.get('/sellers', async (req, res) => {
  try {
    const sellers = await User.find({ 
      isSeller: true, 
      isActive: true 
    }).select('firstName lastName farmName farmLocation city createdAt');

    res.json({
      success: true,
      count: sellers.length,
      data: {
        sellers
      }
    });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sellers',
      error: error.message
    });
  }
});

// Get all buyers (admin only)
router.get('/buyers', auth, async (req, res) => {
  try {
    const buyers = await User.find({ 
      isBuyer: true, 
      isActive: true 
    }).select('firstName lastName city address createdAt');

    res.json({
      success: true,
      count: buyers.length,
      buyers
    });
  } catch (error) {
    console.error('Error fetching buyers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching buyers',
      error: error.message
    });
  }
});

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('firstName lastName email userType city createdAt lastLogin');

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('firstName lastName email userType city farmName farmLocation createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

module.exports = router;