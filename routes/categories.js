const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { auth } = require('../middlewares/auth');
const { uploadSingle } = require('../middlewares/upload'); // use uploadSingle

// Public routes
router.get('/public', categoryController.getPublicCategories);
router.get('/public/:id', categoryController.getPublicCategoryById);

// Protected routes
router.use(auth);

router.get('/', categoryController.getCategories);
router.get('/stats', categoryController.getCategoryStats);
router.get('/:id', categoryController.getCategoryById);
router.post('/', uploadSingle('image'), categoryController.createCategory);
router.put('/:id', uploadSingle('image'), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
