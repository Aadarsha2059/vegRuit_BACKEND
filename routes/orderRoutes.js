const express = require('express');
const router = express.Router();
const {
  createOrder,
  getBuyerOrders,
  getSellerOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
} = require('../controllers/orderController');
const { auth } = require('../middlewares/auth');

// Create new order (buyer only)
router.post('/', auth, createOrder);

// Get orders for buyer
router.get('/buyer', auth, getBuyerOrders);

// Get orders for seller
router.get('/seller', auth, getSellerOrders);

// Get order statistics for seller
router.get('/seller/stats', auth, getOrderStats);

// Get single order by ID
router.get('/:id', auth, getOrder);

// Update order status (seller only)
router.patch('/:id/status', auth, updateOrderStatus);

// Cancel order
router.patch('/:id/cancel', auth, cancelOrder);

module.exports = router;
