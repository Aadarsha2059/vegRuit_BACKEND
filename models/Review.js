const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewId: {
    type: String,
    required: true
  },
  // Review target - can be product or seller
  reviewType: {
    type: String,
    enum: ['product', 'seller', 'order'],
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: function() { return this.reviewType === 'product'; }
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: function() { return this.reviewType === 'order'; }
  },
  // Reviewer information
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Rating and review content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  // Detailed ratings for different aspects
  aspectRatings: {
    quality: {
      type: Number,
      min: 1,
      max: 5
    },
    freshness: {
      type: Number,
      min: 1,
      max: 5
    },
    packaging: {
      type: Number,
      min: 1,
      max: 5
    },
    delivery: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  // Review images
  images: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Verification status
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedPurchase: {
    type: Boolean,
    default: false
  },
  // Moderation
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date,
  moderationReason: String,
  // Helpfulness tracking
  helpfulVotes: {
    type: Number,
    default: 0
  },
  unhelpfulVotes: {
    type: Number,
    default: 0
  },
  votedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vote: {
      type: String,
      enum: ['helpful', 'unhelpful']
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Seller response
  sellerResponse: {
    comment: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  // Flags and reports
  flags: [{
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['inappropriate', 'spam', 'fake', 'offensive', 'irrelevant', 'other']
    },
    description: String,
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceInfo: String
  }
}, {
  timestamps: true
});

// Generate unique review ID
reviewSchema.pre('save', async function(next) {
  if (!this.reviewId) {
    const count = await mongoose.model('Review').countDocuments();
    this.reviewId = `REV${Date.now().toString().slice(-6)}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Add unique index for reviewId
reviewSchema.index({ reviewId: 1 }, { unique: true });

// Add helpful vote method
reviewSchema.methods.addVote = function(userId, voteType) {
  // Remove existing vote by this user
  this.votedBy = this.votedBy.filter(vote => !vote.user.equals(userId));
  
  // Add new vote
  this.votedBy.push({
    user: userId,
    vote: voteType,
    votedAt: new Date()
  });
  
  // Update vote counts
  this.helpfulVotes = this.votedBy.filter(vote => vote.vote === 'helpful').length;
  this.unhelpfulVotes = this.votedBy.filter(vote => vote.vote === 'unhelpful').length;
  
  return this.save();
};

// Add seller response method
reviewSchema.methods.addSellerResponse = function(sellerId, comment) {
  this.sellerResponse = {
    comment,
    respondedAt: new Date(),
    respondedBy: sellerId
  };
  return this.save();
};

// Flag review method
reviewSchema.methods.flagReview = function(userId, reason, description = '') {
  this.flags.push({
    flaggedBy: userId,
    reason,
    description,
    flaggedAt: new Date()
  });
  
  // Auto-flag if multiple reports
  if (this.flags.length >= 3) {
    this.status = 'flagged';
  }
  
  return this.save();
};

// Moderate review method
reviewSchema.methods.moderateReview = function(moderatorId, status, reason = '') {
  this.status = status;
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  this.moderationReason = reason;
  return this.save();
};

// Static method to get review statistics for a product
reviewSchema.statics.getProductStats = function(productId) {
  return this.aggregate([
    { 
      $match: { 
        product: mongoose.Types.ObjectId(productId),
        status: 'approved'
      }
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingDistribution: {
          $push: '$rating'
        },
        aspectAverages: {
          $avg: {
            quality: '$aspectRatings.quality',
            freshness: '$aspectRatings.freshness',
            packaging: '$aspectRatings.packaging',
            delivery: '$aspectRatings.delivery',
            communication: '$aspectRatings.communication',
            value: '$aspectRatings.value'
          }
        }
      }
    }
  ]);
};

// Static method to get seller review statistics
reviewSchema.statics.getSellerStats = function(sellerId) {
  return this.aggregate([
    { 
      $match: { 
        seller: mongoose.Types.ObjectId(sellerId),
        status: 'approved'
      }
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);
};

// Virtual for helpfulness ratio
reviewSchema.virtual('helpfulnessRatio').get(function() {
  const totalVotes = this.helpfulVotes + this.unhelpfulVotes;
  return totalVotes > 0 ? (this.helpfulVotes / totalVotes) * 100 : 0;
});

// Indexes for efficient queries
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
reviewSchema.index({ seller: 1, status: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ reviewId: 1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ verifiedPurchase: 1, status: 1 });

// Compound index for review queries
reviewSchema.index({ product: 1, status: 1, rating: -1 });
reviewSchema.index({ seller: 1, status: 1, rating: -1 });

module.exports = mongoose.model('Review', reviewSchema);
