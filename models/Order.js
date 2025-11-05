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
  productImage: {
    type: String,
    default: ''
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
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
  sellerName: {
    type: String,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerName: {
    type: String,
    required: true
  },
  buyerEmail: {
    type: String,
    required: true
  },
  buyerPhone: {
    type: String,
    required: true
  },
  items: [orderItemSchema],
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
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'confirmed', 'processing', 'shipped', 'delivered', 'received', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'khalti', 'esewa', 'bank_transfer'],
    required: true
  },
  paymentDetails: {
    transactionId: String,
    paymentGateway: String,
    paidAt: Date
  },
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String },
    country: { type: String, default: 'Nepal' },
    landmark: String,
    instructions: String
  },
  deliveryDate: {
    type: Date
  },
  deliveryTimeSlot: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime']
  },
  deliveryInstructions: {
    type: String,
    maxlength: 500,
    default: ''
  },
  notes: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  // Order tracking
  orderDate: {
    type: Date,
    default: Date.now
  },
  confirmedAt: Date,
  processedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  receivedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  // Reviews and feedback
  buyerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  buyerReview: {
    type: String,
    maxlength: 500
  },
  sellerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  sellerReview: {
    type: String,
    maxlength: 500
  },
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

// Generate order number before saving
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `TS${year}${month}${day}${random}`;
  }
  
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ 'items.seller': 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });

// Virtual for order age
orderSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, reason = null) {
  this.status = newStatus;
  
  const now = new Date();
  switch (newStatus) {
    case 'confirmed':
      this.confirmedAt = now;
      break;
    case 'processing':
      this.processedAt = now;
      break;
    case 'shipped':
      this.shippedAt = now;
      break;
    case 'delivered':
      this.deliveredAt = now;
      break;
    case 'received':
      this.receivedAt = now;
      break;
    case 'cancelled':
      this.cancelledAt = now;
      this.cancellationReason = reason;
      break;
  }
  
  return this.save();
};

// Method to calculate order summary
orderSchema.methods.getSummary = function() {
  return {
    orderNumber: this.orderNumber,
    totalItems: this.items.length,
    totalQuantity: this.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: this.subtotal,
    total: this.total,
    status: this.status,
    orderDate: this.orderDate
  };
};

module.exports = mongoose.model('Order', orderSchema);