const mongoose = require('mongoose');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Get reviews for a product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

    let sortOption = { createdAt: -1 }; // newest first
    
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'highest':
        sortOption = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortOption = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sortOption = { helpfulVotes: -1, createdAt: -1 };
        break;
    }

    const reviews = await Review.find({
      product: productId,
      status: 'approved'
    })
    .populate('buyer', 'firstName lastName')
    .populate('product', 'name')
    .sort(sortOption)
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const totalReviews = await Review.countDocuments({
      product: productId,
      status: 'approved'
    });

    // Get rating statistics
    const ratingStats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingCounts: {
            $push: '$rating'
          }
        }
      }
    ]);

    let stats = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    if (ratingStats.length > 0) {
      const { averageRating, totalReviews, ratingCounts } = ratingStats[0];
      stats.averageRating = Math.round(averageRating * 10) / 10;
      stats.totalReviews = totalReviews;
      
      // Count rating distribution
      ratingCounts.forEach(rating => {
        stats.ratingDistribution[rating]++;
      });
    }

    res.json({
      success: true,
      data: {
        reviews,
        stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews,
          hasNext: page * limit < totalReviews,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

// Get buyer's reviews
const getBuyerReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ buyer: req.user._id })
      .populate('product', 'name images')
      .populate('seller', 'firstName lastName farmName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalReviews = await Review.countDocuments({ buyer: req.user._id });

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews
        }
      }
    });
  } catch (error) {
    console.error('Get buyer reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your reviews'
    });
  }
};

// Get seller's received reviews
const getSellerReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, rating } = req.query;

    let filter = { seller: req.user._id, status: 'approved' };
    if (rating) {
      filter.rating = parseInt(rating);
    }

    const reviews = await Review.find(filter)
      .populate('buyer', 'firstName lastName')
      .populate('product', 'name images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalReviews = await Review.countDocuments(filter);

    // Get seller rating statistics
    const sellerStats = await Review.aggregate([
      { $match: { seller: new mongoose.Types.ObjectId(req.user._id), status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          averageQuality: { $avg: '$qualityRating' },
          averageDelivery: { $avg: '$deliveryRating' },
          averageValue: { $avg: '$valueRating' }
        }
      }
    ]);

    let stats = {
      averageRating: 0,
      totalReviews: 0,
      averageQuality: 0,
      averageDelivery: 0,
      averageValue: 0
    };

    if (sellerStats.length > 0) {
      const data = sellerStats[0];
      stats = {
        averageRating: Math.round(data.averageRating * 10) / 10,
        totalReviews: data.totalReviews,
        averageQuality: Math.round((data.averageQuality || 0) * 10) / 10,
        averageDelivery: Math.round((data.averageDelivery || 0) * 10) / 10,
        averageValue: Math.round((data.averageValue || 0) * 10) / 10
      };
    }

    res.json({
      success: true,
      data: {
        reviews,
        stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews
        }
      }
    });
  } catch (error) {
    console.error('Get seller reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

// Create a review
const createReview = async (req, res) => {
  try {
    const {
      productId,
      orderId,
      rating,
      title,
      comment,
      qualityRating,
      deliveryRating,
      valueRating,
      isRecommended
    } = req.body;

    // Validate required fields
    if (!productId || !orderId || !rating || !title || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Product, order, rating, title, and comment are required'
      });
    }

    // Check if buyer can review this product
    const canReviewResult = await Review.canReview(req.user._id, productId, orderId);
    if (!canReviewResult.canReview) {
      return res.status(400).json({
        success: false,
        message: canReviewResult.reason
      });
    }

    // Get product and seller info
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Create review
    const review = new Review({
      buyer: req.user._id,
      product: productId,
      order: orderId,
      seller: product.seller,
      rating: parseInt(rating),
      title: title.trim(),
      comment: comment.trim(),
      qualityRating: qualityRating ? parseInt(qualityRating) : null,
      deliveryRating: deliveryRating ? parseInt(deliveryRating) : null,
      valueRating: valueRating ? parseInt(valueRating) : null,
      isRecommended: isRecommended === 'true' || isRecommended === true
    });

    await review.save();

    // Populate the review for response
    await review.populate('buyer', 'firstName lastName');
    await review.populate('product', 'name');

    res.status(201).json({
      success: true,
      data: { review },
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review'
    });
  }
};

// Update a review
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const {
      rating,
      title,
      comment,
      qualityRating,
      deliveryRating,
      valueRating,
      isRecommended
    } = req.body;

    const review = await Review.findOne({
      _id: reviewId,
      buyer: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Update fields
    if (rating) review.rating = parseInt(rating);
    if (title) review.title = title.trim();
    if (comment) review.comment = comment.trim();
    if (qualityRating) review.qualityRating = parseInt(qualityRating);
    if (deliveryRating) review.deliveryRating = parseInt(deliveryRating);
    if (valueRating) review.valueRating = parseInt(valueRating);
    if (isRecommended !== undefined) review.isRecommended = isRecommended === 'true' || isRecommended === true;

    await review.save();

    await review.populate('buyer', 'firstName lastName');
    await review.populate('product', 'name');

    res.json({
      success: true,
      data: { review },
      message: 'Review updated successfully'
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review'
    });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findOne({
      _id: reviewId,
      buyer: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await review.remove();

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review'
    });
  }
};

// Vote on review helpfulness
const voteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { helpful } = req.body; // true for helpful, false for not helpful

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Update vote counts
    review.totalVotes += 1;
    if (helpful) {
      review.helpfulVotes += 1;
    }

    await review.save();

    res.json({
      success: true,
      data: {
        helpfulVotes: review.helpfulVotes,
        totalVotes: review.totalVotes,
        helpfulPercentage: review.helpfulPercentage
      },
      message: 'Vote recorded successfully'
    });
  } catch (error) {
    console.error('Vote review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record vote'
    });
  }
};

// Seller response to review
const respondToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Response comment is required'
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      seller: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.sellerResponse = {
      comment: comment.trim(),
      respondedAt: new Date()
    };

    await review.save();

    res.json({
      success: true,
      data: { review },
      message: 'Response added successfully'
    });
  } catch (error) {
    console.error('Respond to review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add response'
    });
  }
};

// Get reviewable products for buyer
const getReviewableProducts = async (req, res) => {
  try {
    const orders = await Order.find({
      buyer: req.user._id,
      status: 'received'
    }).populate('items.product', 'name images seller');

    const reviewableItems = [];
    
    for (const order of orders) {
      for (const item of order.items) {
        if (item.product) {
          // Check if already reviewed
          const existingReview = await Review.findOne({
            buyer: req.user._id,
            product: item.product._id,
            order: order._id
          });

          if (!existingReview) {
            reviewableItems.push({
              orderId: order._id,
              orderNumber: order.orderNumber,
              orderDate: order.orderDate,
              deliveredAt: order.deliveredAt || order.updatedAt,
              productId: item.product._id,
              productName: item.product.name,
              productImage: item.product.images?.[0] || '',
              quantity: item.quantity,
              unit: item.unit || 'pcs',
              price: item.price,
              seller: item.seller,
              sellerName: item.sellerName || 'Unknown Seller'
            });
          }
        }
      }
    }

    res.json({
      success: true,
      data: { reviewableItems },
      message: 'Reviewable products fetched successfully'
    });
  } catch (error) {
    console.error('Get reviewable products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviewable products'
    });
  }
};

// Get recent public reviews for homepage
const getRecentPublicReviews = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const reviews = await Review.find({
      status: 'approved',
      rating: { $gte: 4 } // Only show 4+ star reviews on homepage
    })
    .populate('buyer', 'firstName lastName city')
    .populate('product', 'name')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      data: { reviews },
      message: 'Recent reviews fetched successfully'
    });
  } catch (error) {
    console.error('Get recent public reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent reviews'
    });
  }
};

module.exports = {
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
};