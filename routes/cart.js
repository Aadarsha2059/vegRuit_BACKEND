const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { auth } = require('../middlewares/auth');

// All cart routes require authentication (buyer only)
router.get('/', auth, cartController.getCart);
router.post('/add', auth, cartController.addToCart);
router.put('/item/:productId', auth, cartController.updateCartItem);
router.delete('/item/:productId', auth, cartController.removeFromCart);
router.delete('/clear', auth, cartController.clearCart);
router.get('/count', auth, cartController.getCartCount);

module.exports = router;
