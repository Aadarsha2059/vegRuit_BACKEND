const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
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
    enum: ['kg', 'dozen', 'piece', 'liter'],
    required: true
  }
});

const deliveryAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  landmark: {
    type: String,
    trim: true
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
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
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'esewa', 'khalti', 'bank_transfer'],
    required: true
  },
  deliveryAddress: deliveryAddressSchema,
  deliveryDate: {
    type: Date
  },
  deliveryTimeSlot: {
    type: String,
    enum: ['morning', 'afternoon', 'evening']
  },
  specialInstructions: {
    type: String,
    maxlength: 500
  },
  trackingUpdates: [{
    status: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  cancelReason: {
    type: String,
    maxlength: 500
  },
  refundAmount: {
    type: Number,
    min: 0
  },
  estimatedDeliveryTime: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate unique order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `VR${Date.now().toString().slice(-6)}${(count + 1).toString().padStart(3, '0')}`;
  }
  next();
});

// Calculate final amount including delivery fee
orderSchema.pre('save', function(next) {
  this.finalAmount = this.totalAmount + this.deliveryFee;
  next();
});

// Add tracking update method
orderSchema.methods.addTrackingUpdate = function(status, message, updatedBy) {
  this.trackingUpdates.push({
    status,
    message,
    timestamp: new Date(),
    updatedBy
  });
  this.status = status;
  return this.save();
};

// Get order summary method
orderSchema.methods.getOrderSummary = function() {
  return {
    orderNumber: this.orderNumber,
    status: this.status,
    totalItems: this.items.reduce((sum, item) => sum + item.quantity, 0),
    finalAmount: this.finalAmount,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Order', orderSchema);