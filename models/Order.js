const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmName: {
    type: String,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  
  // Order totals
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Order status
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'],
    default: 'Pending'
  },
  
  // Delivery information
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    area: { type: String },
    landmark: { type: String },
    phone: { type: String, required: true }
  },
  
  // Payment information
  paymentMethod: {
    type: String,
    enum: ['Cash on Delivery', 'Khalti', 'eSewa', 'Bank Transfer', 'Card'],
    default: 'Cash on Delivery'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  paymentId: {
    type: String // For online payment tracking
  },
  
  // Timestamps
  orderDate: {
    type: Date,
    default: Date.now
  },
  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  
  // Delivery tracking
  estimatedDelivery: Date,
  trackingNumber: String,
  
  // Notes and communication
  buyerNotes: String,
  sellerNotes: String,
  adminNotes: String,
  
  // Rating and review
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: String,
  reviewDate: Date
}, {
  timestamps: true
});

// Index for efficient queries
orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ 'items.seller': 1, status: 1 });
orderSchema.index({ orderId: 1 });
orderSchema.index({ status: 1, orderDate: -1 });

// Pre-save middleware to generate order ID
orderSchema.pre('save', function(next) {
  if (!this.orderId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.orderId = `ORD${timestamp}${random}`.toUpperCase();
  }
  next();
});

// Method to update order status with timestamp
orderSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  
  switch (newStatus) {
    case 'Confirmed':
      this.confirmedAt = new Date();
      break;
    case 'Shipped':
    case 'Out for Delivery':
      this.shippedAt = new Date();
      break;
    case 'Delivered':
      this.deliveredAt = new Date();
      this.paymentStatus = 'Paid'; // Auto-mark as paid on delivery for COD
      break;
    case 'Cancelled':
      this.cancelledAt = new Date();
      break;
  }
};

// Method to calculate totals
orderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  this.total = this.subtotal + this.deliveryFee + this.tax;
};

// Static method to get orders by buyer
orderSchema.statics.getByBuyer = function(buyerId, filters = {}) {
  const query = { buyer: buyerId };
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  return this.find(query)
    .populate('items.product', 'name images')
    .populate('items.seller', 'firstName lastName farmName')
    .sort({ orderDate: -1 });
};

// Static method to get orders by seller
orderSchema.statics.getBySeller = function(sellerId, filters = {}) {
  const query = { 'items.seller': sellerId };
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  return this.find(query)
    .populate('buyer', 'firstName lastName phone email')
    .populate('items.product', 'name images')
    .sort({ orderDate: -1 });
};

// Virtual for order age in days
orderSchema.virtual('orderAge').get(function() {
  return Math.floor((Date.now() - this.orderDate) / (1000 * 60 * 60 * 24));
});

// Virtual for total items count
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

module.exports = mongoose.model('Order', orderSchema);