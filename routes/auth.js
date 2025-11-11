const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middlewares/auth');
const { 
  validateBuyerRegistration, 
  validateSellerRegistration, 
  validateLogin 
} = require('../middlewares/validation');

// Public routes with validation
router.post('/register', validateBuyerRegistration, authController.registerUser);
router.post('/buyer/register', validateBuyerRegistration, authController.registerBuyer);
router.post('/seller/register', validateSellerRegistration, authController.registerSeller);
router.post('/login', validateLogin, authController.login);
router.get('/check-user', authController.checkUserExists);

// Password reset routes (public)
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);
router.post('/logout', auth, authController.logout);

module.exports = router;
