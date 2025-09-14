const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// Create new review
const createReview = async (req, res) => {
  try {
    const {
      reviewType,
      productId,
      sellerId,
      orderId,
      rating,
      title,
      comment,
      aspectRatings,
      images
    } = req.body;

    // Validate review type and required fields
    if (reviewType === 'product' && !productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required for product reviews'
      });
    }

    if (reviewType === 'order' && !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required for order reviews'
      });
    }

    // Verify order exists and user is the buyer
    if (orderId) {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (!order.buyer.equals(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'You can only review your own orders'
        });
      }

      // Check if order is delivered
      if (order.status !== 'delivered') {
        return res.status(400).json({
          success: false,
          message: 'You can only review delivered orders'
        });
      }
    }

    // Verify product exists
    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
    }

    // Check if user has already reviewed this item
    const existingReview = await Review.findOne({
      reviewer: req.user.id,
      ...(productId && { product: productId }),
      ...(orderId && { order: orderId })
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this item'
      });
    }

    // Create review
    const review = new Review({
      reviewType,
      product: productId,
      seller: sellerId,
      order: orderId,
      reviewer: req.user.id,
      rating,
      title,
      comment,
      aspectRatings,
      images: images || [],
      verifiedPurchase: !!orderId, // If order exists, it's a verified purchase
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await review.save();

    // Populate review details
    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'firstName lastName')
      .populate('product', 'name images')
      .populate('seller', 'firstName lastName farmName');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: populatedReview
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review',
      error: error.message
    });
  }
};

// Get reviews for a product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'newest', rating } = req.query;

    const query = {
      product: productId,
      status: 'approved'
    };

    if (rating) {
      query.rating = parseInt(rating);
    }

    let sortOption = { createdAt: -1 }; // Default: newest first
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'rating_high') {
      sortOption = { rating: -1, createdAt: -1 };
    } else if (sort === 'rating_low') {
      sortOption = { rating: 1, createdAt: -1 };
    } else if (sort === 'helpful') {
      sortOption = { helpfulVotes: -1, createdAt: -1 };
    }

    const reviews = await Review.find(query)
      .populate('reviewer', 'firstName lastName')
      .populate('sellerResponse.respondedBy', 'firstName lastName')
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(query);

    // Get review statistics
    const stats = await Review.getProductStats(productId);

    res.json({
      success: true,
      data: {
        reviews,
        stats: stats[0] || {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: []
        },
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product reviews',
      error: error.message
    });
  }
};

// Get reviews for a seller
const getSellerReviews = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

    const query = {
      seller: sellerId,
      status: 'approved'
    };

    let sortOption = { createdAt: -1 };
    if (sort === 'rating_high') {
      sortOption = { rating: -1, createdAt: -1 };
    } else if (sort === 'rating_low') {
      sortOption = { rating: 1, createdAt: -1 };
    }

    const reviews = await Review.find(query)
      .populate('reviewer', 'firstName lastName')
      .populate('product', 'name images')
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(query);

    // Get seller review statistics
    const stats = await Review.getSellerStats(sellerId);

    res.json({
      success: true,
      data: {
        reviews,
        stats: stats[0] || {
          totalReviews: 0,
          averageRating: 0
        },
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get seller reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller reviews',
      error: error.message
    });
  }
};

// Get single review
const getReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findOne({ reviewId })
      .populate('reviewer', 'firstName lastName')
      .populate('product', 'name images category')
      .populate('seller', 'firstName lastName farmName')
      .populate('sellerResponse.respondedBy', 'firstName lastName');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: review
    });

  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review',
      error: error.message
    });
  }
};

// Add helpful vote to review
const voteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { voteType } = req.body; // 'helpful' or 'unhelpful'

    if (!['helpful', 'unhelpful'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type. Must be "helpful" or "unhelpful"'
      });
    }

    const review = await Review.findOne({ reviewId });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is trying to vote on their own review
    if (review.reviewer.equals(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot vote on your own review'
      });
    }

    await review.addVote(req.user.id, voteType);

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        helpfulVotes: review.helpfulVotes,
        unhelpfulVotes: review.unhelpfulVotes
      }
    });

  } catch (error) {
    console.error('Vote review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record vote',
      error: error.message
    });
  }
};

// Add seller response to review
const addSellerResponse = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { comment } = req.body;

    const review = await Review.findOne({ reviewId });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is the seller
    if (!review.seller.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller can respond to this review'
      });
    }

    // Check if seller has already responded
    if (review.sellerResponse && review.sellerResponse.comment) {
      return res.status(400).json({
        success: false,
        message: 'You have already responded to this review'
      });
    }

    await review.addSellerResponse(req.user.id, comment);

    const updatedReview = await Review.findOne({ reviewId })
      .populate('reviewer', 'firstName lastName')
      .populate('sellerResponse.respondedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Response added successfully',
      data: updatedReview
    });

  } catch (error) {
    console.error('Add seller response error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add response',
      error: error.message
    });
  }
};

// Flag review
const flagReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason, description } = req.body;

    const review = await Review.findOne({ reviewId });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user is trying to flag their own review
    if (review.reviewer.equals(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot flag your own review'
      });
    }

    await review.flagReview(req.user.id, reason, description);

    res.json({
      success: true,
      message: 'Review flagged successfully'
    });

  } catch (error) {
    console.error('Flag review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to flag review',
      error: error.message
    });
  }
};

// Get user's reviews
const getUserReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ reviewer: req.user.id })
      .populate('product', 'name images')
      .populate('seller', 'firstName lastName farmName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments({ reviewer: req.user.id });

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user reviews',
      error: error.message
    });
  }
};

// Moderate review (admin function)
const moderateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status, reason } = req.body;

    const review = await Review.findOne({ reviewId });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await review.moderateReview(req.user.id, status, reason);

    res.json({
      success: true,
      message: 'Review moderated successfully',
      data: review
    });

  } catch (error) {
    console.error('Moderate review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to moderate review',
      error: error.message
    });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getSellerReviews,
  getReview,
  voteReview,
  addSellerResponse,
  flagReview,
  getUserReviews,
  moderateReview
};
