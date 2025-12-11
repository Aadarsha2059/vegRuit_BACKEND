const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
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
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
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
cartSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for better query performance
cartSchema.index({ buyer: 1 });

// Virtual for cart total items
cartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Method to add item to cart
cartSchema.methods.addItem = function(productId, quantity = 1) {
  const existingItem = this.items.find(item => item.product.toString() === productId.toString());
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({ product: productId, quantity });
  }
  
  return this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => item.product.toString() !== productId.toString());
  return this.save();
};

// Method to update item quantity
cartSchema.methods.updateQuantity = function(productId, quantity) {
  const item = this.items.find(item => item.product.toString() === productId.toString());
  
  if (item) {
    if (quantity <= 0) {
      return this.removeItem(productId);
    } else {
      item.quantity = quantity;
    }
  }
  
  return this.save();
};

// Method to clear cart
cartSchema.methods.clear = function() {
  this.items = [];
  return this.save();
};

// Method to get cart summary
cartSchema.methods.getSummary = async function() {
  // Populate both product and seller information
  await this.populate({
    path: 'items.product',
    populate: {
      path: 'seller',
      model: 'User'
    }
  });
  
  const summary = {
    totalItems: this.totalItems,
    totalValue: 0,
    items: []
  };
  
  for (const item of this.items) {
    if (item.product) {
      const itemTotal = item.product.price * item.quantity;
      summary.totalValue += itemTotal;
      
      // Ensure we have the full image URL
      const productImage = item.product.images && item.product.images.length > 0 
        ? item.product.images[0] 
        : '';
      
      // Get seller information
      const seller = item.product.seller;
      const sellerName = seller ? `${seller.firstName} ${seller.lastName}` : 'Unknown Seller';
      const farmName = seller ? seller.farmName : '';
      const farmLocation = seller ? seller.farmLocation : '';
      
      summary.items.push({
        productId: item.product._id,
        productName: item.product.name,
        productImage: productImage,
        productImages: item.product.images || [], // Include all images
        quantity: item.quantity,
        unit: item.product.unit,
        price: item.product.price,
        total: itemTotal,
        seller: item.product.seller,
        sellerName: sellerName,
        farmName: farmName,
        farmLocation: farmLocation,
        description: item.product.description || '',
        category: item.product.category
      });
    }
  }
  
  return summary;
};

module.exports = mongoose.model('Cart', cartSchema);