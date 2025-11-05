const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Review identification
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Review content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  
  // Additional feedback
  qualityRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  deliveryRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  valueRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },

  // Review metadata
  isVerifiedPurchase: {
    type: Boolean,
    default: true
  },
  isRecommended: {
    type: Boolean,
    default: null
  },
  
  // Moderation
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hidden'],
    default: 'approved'
  },
  moderationReason: {
    type: String,
    maxlength: 500
  },

  // Helpful votes
  helpfulVotes: {
    type: Number,
    default: 0
  },
  totalVotes: {
    type: Number,
    default: 0
  },
  
  // Seller response
  sellerResponse: {
    comment: {
      type: String,
      maxlength: 500
    },
    respondedAt: {
      type: Date
    }
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ buyer: 1, createdAt: -1 });
reviewSchema.index({ seller: 1, createdAt: -1 });
reviewSchema.index({ order: 1, product: 1 }, { unique: true }); // One review per product per order
reviewSchema.index({ rating: 1 });
reviewSchema.index({ status: 1 });

// Virtual for helpful percentage
reviewSchema.virtual('helpfulPercentage').get(function() {
  if (this.totalVotes === 0) return 0;
  return Math.round((this.helpfulVotes / this.totalVotes) * 100);
});

// Virtual for overall rating (average of all rating aspects)
reviewSchema.virtual('overallRating').get(function() {
  const ratings = [this.rating];
  if (this.qualityRating) ratings.push(this.qualityRating);
  if (this.deliveryRating) ratings.push(this.deliveryRating);
  if (this.valueRating) ratings.push(this.valueRating);
  
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
});

// Method to check if buyer can review this product
reviewSchema.statics.canReview = async function(buyerId, productId, orderId) {
  // Check if order exists and is delivered
  const Order = mongoose.model('Order');
  const order = await Order.findOne({
    _id: orderId,
    buyer: buyerId,
    status: 'delivered',
    'items.product': productId
  });

  if (!order) return { canReview: false, reason: 'Order not found or not delivered' };

  // Check if already reviewed
  const existingReview = await this.findOne({
    buyer: buyerId,
    product: productId,
    order: orderId
  });

  if (existingReview) return { canReview: false, reason: 'Already reviewed' };

  return { canReview: true };
};

// Method to update product rating
reviewSchema.methods.updateProductRating = async function() {
  const Product = mongoose.model('Product');
  const Review = mongoose.model('Review');
  
  const stats = await Review.aggregate([
    { $match: { product: this.product, status: 'approved' } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);

  if (stats.length > 0) {
    const { averageRating, totalReviews } = stats[0];
    await Product.findByIdAndUpdate(this.product, {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: totalReviews
    });
  }
};

// Pre-save middleware
reviewSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Post-save middleware to update product rating
reviewSchema.post('save', function() {
  this.updateProductRating();
});

// Post-remove middleware to update product rating
reviewSchema.post('remove', function() {
  this.updateProductRating();
});

module.exports = mongoose.model('Review', reviewSchema);