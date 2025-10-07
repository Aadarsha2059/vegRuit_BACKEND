const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth } = require('../middlewares/auth');

// All order routes require authentication
router.post('/', auth, orderController.createOrder);
router.get('/buyer', auth, orderController.getBuyerOrders);
router.get('/seller', auth, orderController.getSellerOrders);
router.get('/stats', auth, orderController.getOrderStats);
router.get('/:id', auth, orderController.getOrder);
router.put('/:id/status', auth, orderController.updateOrderStatus);
router.put('/:id/cancel', auth, orderController.cancelOrder);

module.exports = router;
