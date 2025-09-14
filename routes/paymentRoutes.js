const express = require('express');
const router = express.Router();
const {
  initializePayment,
  verifyPayment,
  confirmCODPayment,
  processRefund,
  getPayment,
  getPaymentStats
} = require('../controllers/paymentController');
const { auth } = require('../middlewares/auth');

// Initialize payment
router.post('/initialize', auth, initializePayment);

// Verify payment (for online payments)
router.post('/:paymentId/verify', auth, verifyPayment);

// Confirm COD payment (seller only)
router.post('/:paymentId/confirm-cod', auth, confirmCODPayment);

// Process refund
router.post('/:paymentId/refund', auth, processRefund);

// Get payment details
router.get('/:paymentId', auth, getPayment);

// Get payment statistics for seller
router.get('/seller/stats', auth, getPaymentStats);

module.exports = router;
