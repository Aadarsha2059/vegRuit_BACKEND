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
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    enum: ['Fruits', 'Vegetables', 'Leafy Greens', 'Herbs', 'Grains', 'Other'],
    default: 'Vegetables'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'piece', 'bunch', 'packet', 'liter'],
    default: 'kg'
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'low-stock', 'out-of-stock'],
    default: 'active'
  },
  images: [{
    type: String, // URLs to product images
    trim: true
  }],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmName: {
    type: String,
    required: true
  },
  farmLocation: {
    type: String,
    required: true
  },
  // Product metrics
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  // Availability
  isAvailable: {
    type: Boolean,
    default: true
  },
  harvestDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  // SEO and search
  tags: [{
    type: String,
    trim: true
  }],
  searchKeywords: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for search functionality
productSchema.index({ 
  name: 'text', 
  description: 'text', 
  category: 'text',
  farmName: 'text',
  tags: 'text'
});

// Index for filtering
productSchema.index({ category: 1, status: 1, isAvailable: 1 });
productSchema.index({ seller: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });

// Virtual for average rating
productSchema.virtual('averageRating').get(function() {
  return this.totalRatings > 0 ? this.rating / this.totalRatings : 0;
});

// Method to update stock status
productSchema.methods.updateStockStatus = function() {
  if (this.stock === 0) {
    this.status = 'out-of-stock';
    this.isAvailable = false;
  } else if (this.stock <= 5) {
    this.status = 'low-stock';
    this.isAvailable = true;
  } else {
    this.status = 'active';
    this.isAvailable = true;
  }
};

// Pre-save middleware to update stock status
productSchema.pre('save', function(next) {
  this.updateStockStatus();
  
  // Update search keywords
  this.searchKeywords = `${this.name} ${this.category} ${this.farmName} ${this.tags.join(' ')}`.toLowerCase();
  
  next();
});

// Method to add rating
productSchema.methods.addRating = function(rating) {
  this.rating = ((this.rating * this.totalRatings) + rating) / (this.totalRatings + 1);
  this.totalRatings += 1;
};

// Static method to get products by seller
productSchema.statics.getByseller = function(sellerId) {
  return this.find({ seller: sellerId }).sort({ createdAt: -1 });
};

// Static method to get available products for buyers
productSchema.statics.getAvailableProducts = function(filters = {}) {
  const query = { isAvailable: true, status: { $ne: 'inactive' } };
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  
  if (filters.minPrice || filters.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = filters.minPrice;
    if (filters.maxPrice) query.price.$lte = filters.maxPrice;
  }
  
  return this.find(query)
    .populate('seller', 'firstName lastName farmName farmLocation city')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Product', productSchema);