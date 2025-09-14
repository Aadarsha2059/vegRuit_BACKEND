const express = require('express');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  getSellerReviews,
  getReview,
  voteReview,
  addSellerResponse,
  flagReview,
  getUserReviews,
  moderateReview
} = require('../controllers/reviewController');
const { auth } = require('../middlewares/auth');

// Create new review
router.post('/', auth, createReview);

// Get user's reviews
router.get('/user', auth, getUserReviews);

// Get reviews for a product
router.get('/product/:productId', getProductReviews);

// Get reviews for a seller
router.get('/seller/:sellerId', getSellerReviews);

// Get single review
router.get('/:reviewId', getReview);

// Vote on review (helpful/unhelpful)
router.post('/:reviewId/vote', auth, voteReview);

// Add seller response to review
router.post('/:reviewId/response', auth, addSellerResponse);

// Flag review
router.post('/:reviewId/flag', auth, flagReview);

// Moderate review (admin function)
router.patch('/:reviewId/moderate', auth, moderateReview);

module.exports = router;
