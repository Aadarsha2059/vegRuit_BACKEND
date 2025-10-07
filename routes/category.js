const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { auth } = require('../middlewares/auth');

// Public routes
router.get('/public', categoryController.getPublicCategories);

// Protected routes (seller only)
router.get('/', auth, categoryController.getSellerCategories);
router.post('/', auth, categoryController.createCategory);
router.put('/:id', auth, categoryController.updateCategory);
router.delete('/:id', auth, categoryController.deleteCategory);
router.get('/stats', auth, categoryController.getCategoryStats);

module.exports = router;