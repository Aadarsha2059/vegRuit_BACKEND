const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  getBuyerReviews,
  getSellerReviews,
  createReview,
  updateReview,
  deleteReview,
  voteReview,
  respondToReview,
  getReviewableProducts,
  getRecentPublicReviews
} = require('../controllers/reviewController');
const { auth } = require('../middlewares/auth');

// Public routes
router.get('/product/:productId', getProductReviews);
router.get('/recent-public', getRecentPublicReviews);

// Protected routes - Buyer
router.get('/buyer/my-reviews', auth, getBuyerReviews);
router.get('/buyer/reviewable', auth, getReviewableProducts);
router.post('/create', auth, createReview);
router.put('/:reviewId', auth, updateReview);
router.delete('/:reviewId', auth, deleteReview);
router.post('/:reviewId/vote', auth, voteReview);

// Protected routes - Seller
router.get('/seller/received', auth, getSellerReviews);
router.post('/:reviewId/respond', auth, respondToReview);

module.exports = router;