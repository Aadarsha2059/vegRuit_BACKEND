const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  // User identification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['buyer', 'seller'],
    required: true
  },

  // Feedback type
  feedbackType: {
    type: String,
    enum: ['product_feedback', 'seller_feedback', 'system_complaint', 'general_feedback'],
    required: true
  },

  // Related entities (optional)
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  relatedProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  relatedSeller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Feedback content
  subject: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },

  // Category for system complaints
  complaintCategory: {
    type: String,
    enum: ['delivery', 'payment', 'product_quality', 'customer_service', 'technical_issue', 'other'],
    default: null
  },

  // Priority and status
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    default: 'pending'
  },

  // Admin response
  adminResponse: {
    message: {
      type: String,
      maxlength: 1000
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: {
      type: Date
    }
  },

  // Display on homepage
  displayOnHomepage: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
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

// Indexes
feedbackSchema.index({ user: 1, createdAt: -1 });
feedbackSchema.index({ feedbackType: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ displayOnHomepage: 1, isPublic: 1 });
feedbackSchema.index({ rating: 1 });

// Pre-save middleware
feedbackSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to mark as resolved
feedbackSchema.methods.markAsResolved = function(adminId, responseMessage) {
  this.status = 'resolved';
  this.adminResponse = {
    message: responseMessage,
    respondedBy: adminId,
    respondedAt: new Date()
  };
  return this.save();
};

// Static method to get homepage feedbacks
feedbackSchema.statics.getHomepageFeedbacks = async function(limit = 10) {
  return this.find({
    displayOnHomepage: true,
    isPublic: true,
    rating: { $gte: 4 }
  })
  .populate('user', 'firstName lastName city')
  .sort({ createdAt: -1 })
  .limit(limit);
};

module.exports = mongoose.model('Feedback', feedbackSchema);
