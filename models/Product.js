const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'piece', 'bunch', 'dozen', 'pack', 'liter'],
    default: 'kg'
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minOrder: {
    type: Number,
    default: 1,
    min: 1
  },
  maxOrder: {
    type: Number,
    default: 100,
    min: 1
  },
  images: [{
    type: String,
    default: []
  }],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out-of-stock', 'discontinued'],
    default: 'active'
  },
  // Product attributes
  organic: {
    type: Boolean,
    default: false
  },
  fresh: {
    type: Boolean,
    default: true
  },
  origin: {
    type: String,
    default: 'Local'
  },
  harvestDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  // Rating and reviews
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSold: {
    type: Number,
    default: 0
  },
  // SEO and search
  tags: [{
    type: String,
    trim: true
  }],
  searchKeywords: [{
    type: String,
    trim: true
  }],
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

// Update the updatedAt field before saving
productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update status based on stock
  if (this.stock === 0) {
    this.status = 'out-of-stock';
  } else if (this.status === 'out-of-stock' && this.stock > 0) {
    this.status = 'active';
  }
  
  next();
});

// Indexes for better query performance
productSchema.index({ seller: 1, isActive: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ averageRating: -1 });
productSchema.index({ createdAt: -1 });

// Virtual for product availability
productSchema.virtual('isAvailable').get(function() {
  return this.isActive && this.status === 'active' && this.stock > 0;
});

// Method to update product rating
productSchema.methods.updateRating = function(newRating) {
  const totalRating = this.averageRating * this.totalReviews;
  this.totalReviews += 1;
  this.averageRating = (totalRating + newRating) / this.totalReviews;
  return this.save();
};

// Method to reduce stock
productSchema.methods.reduceStock = function(quantity) {
  if (this.stock >= quantity) {
    this.stock -= quantity;
    this.totalSold += quantity;
    return this.save();
  }
  throw new Error('Insufficient stock');
};

module.exports = mongoose.model('Product', productSchema);