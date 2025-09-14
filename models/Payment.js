const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'esewa', 'khalti', 'bank_transfer', 'card'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    sparse: true // For online payments
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed // Store gateway-specific response data
  },
  // eSewa specific fields
  esewaDetails: {
    transactionUuid: String,
    productCode: String,
    totalAmount: Number,
    status: String,
    refId: String
  },
  // Khalti specific fields
  khaltiDetails: {
    token: String,
    amount: Number,
    mobile: String,
    productIdentity: String,
    productName: String,
    productUrl: String
  },
  // Bank transfer details
  bankTransferDetails: {
    bankName: String,
    accountNumber: String,
    accountHolder: String,
    referenceNumber: String,
    transferDate: Date
  },
  // Cash on delivery details
  codDetails: {
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    collectedAt: Date,
    receiptNumber: String
  },
  // Payment processing details
  processingFee: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'NPR'
  },
  // Refund information
  refundDetails: {
    refundId: String,
    refundAmount: Number,
    refundDate: Date,
    refundReason: String,
    refundMethod: String,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed']
    }
  },
  // Payment attempts and retries
  attempts: [{
    attemptNumber: Number,
    timestamp: {
      type: Date,
      default: Date.now
    },
    status: String,
    errorMessage: String,
    gatewayResponse: mongoose.Schema.Types.Mixed
  }],
  // Verification and security
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceInfo: String
  },
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Generate unique payment ID
paymentSchema.pre('save', async function(next) {
  if (!this.paymentId) {
    const count = await mongoose.model('Payment').countDocuments();
    this.paymentId = `PAY${Date.now().toString().slice(-6)}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Calculate net amount after processing fee
paymentSchema.pre('save', function(next) {
  this.netAmount = this.amount - this.processingFee;
  next();
});

// Add payment attempt method
paymentSchema.methods.addAttempt = function(status, errorMessage = null, gatewayResponse = null) {
  const attemptNumber = this.attempts.length + 1;
  this.attempts.push({
    attemptNumber,
    timestamp: new Date(),
    status,
    errorMessage,
    gatewayResponse
  });
  return this.save();
};

// Process refund method
paymentSchema.methods.processRefund = function(refundAmount, reason, method = 'original') {
  this.refundDetails = {
    refundId: `REF${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    refundAmount,
    refundDate: new Date(),
    refundReason: reason,
    refundMethod: method,
    refundStatus: 'pending'
  };
  this.status = 'refunded';
  return this.save();
};

// Verify payment method
paymentSchema.methods.verifyPayment = function(verifiedBy) {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.verifiedBy = verifiedBy;
  this.status = 'completed';
  return this.save();
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = function(sellerId, dateRange = {}) {
  const matchStage = { seller: mongoose.Types.ObjectId(sellerId) };
  
  if (dateRange.start && dateRange.end) {
    matchStage.createdAt = {
      $gte: new Date(dateRange.start),
      $lte: new Date(dateRange.end)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        netAmount: { $sum: '$netAmount' }
      }
    }
  ]);
};

// Indexes for efficient queries
paymentSchema.index({ order: 1 });
paymentSchema.index({ buyer: 1, status: 1 });
paymentSchema.index({ seller: 1, status: 1 });
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
