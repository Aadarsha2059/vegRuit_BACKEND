const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { auth } = require('../middlewares/auth');
const { uploadProductImages } = require('../middlewares/upload');

// Public routes
router.get('/public', productController.getPublicProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/:id', productController.getProduct);

// Protected routes (seller only)
router.get('/seller/all', auth, productController.getSellerProducts);
router.post('/', auth, uploadProductImages, productController.createProduct);
router.put('/:id', auth, uploadProductImages, productController.updateProduct);
router.delete('/:id', auth, productController.deleteProduct);
router.get('/seller/stats', auth, productController.getProductStats);

module.exports = router;