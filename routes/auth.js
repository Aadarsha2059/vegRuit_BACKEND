const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middlewares/auth');
const { 
  validateBuyerRegistration, 
  validateSellerRegistration, 
  validateLogin 
} = require('../middlewares/validation');

// Public routes - Remove validation middleware to avoid conflicts
router.post('/buyer/register', authController.registerBuyer);
router.post('/seller/register', authController.registerSeller);
router.post('/login', authController.login);
router.get('/check-user', authController.checkUserExists);

// Protected routes
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);
router.post('/logout', auth, authController.logout);

module.exports = router;
