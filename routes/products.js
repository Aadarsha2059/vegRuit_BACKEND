const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { uploadProductImages, handleUploadError } = require('../middlewares/upload');
const {
  getSellerProducts,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  getFeaturedProducts
} = require('../controllers/productController');

// Public routes (no authentication required)
// GET /api/products - Get all products for buyers
router.get('/', getProducts);

// GET /api/products/featured - Get featured products
router.get('/featured', getFeaturedProducts);

// GET /api/products/:id - Get single product
router.get('/:id', getProduct);

// Protected routes (authentication required)
router.use(auth);

// GET /api/products/seller/my - Get seller's products
router.get('/seller/my', getSellerProducts);

// GET /api/products/seller/stats - Get product statistics
router.get('/seller/stats', getProductStats);

// POST /api/products - Create new product
router.post('/', uploadProductImages, handleUploadError, createProduct);

// PUT /api/products/:id - Update product
router.put('/:id', uploadProductImages, handleUploadError, updateProduct);

// DELETE /api/products/:id - Delete product
router.delete('/:id', deleteProduct);

module.exports = router;
