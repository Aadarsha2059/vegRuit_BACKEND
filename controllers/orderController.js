const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

// Create order from cart
const createOrder = async (req, res) => {
  try {
    const {
      deliveryAddress,
      deliveryDate,
      deliveryTimeSlot,
      deliveryInstructions,
      paymentMethod,
      notes
    } = req.body;

    // Validate required fields
    if (!deliveryAddress || !deliveryAddress.street?.trim() || !deliveryAddress.city?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address with street and city is required'
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }

    // Get user's cart
    console.log('Finding cart for user:', req.user._id);
    const cart = await Cart.findOne({ buyer: req.user._id })
      .populate('items.product');

    console.log('Cart found:', cart ? `${cart.items.length} items` : 'No cart');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate all items are still available
    const orderItems = [];
    let subtotal = 0;

    console.log('Processing cart items:', cart.items.length);

    for (let i = 0; i < cart.items.length; i++) {
      const cartItem = cart.items[i];
      const product = cartItem.product;
      
      console.log(`Processing cart item ${i + 1}:`, {
        productId: product?._id,
        productName: product?.name,
        quantity: cartItem.quantity,
        isActive: product?.isActive,
        status: product?.status,
        stock: product?.stock
      });
      
      if (!product) {
        console.error('Product not found in cart item:', cartItem);
        return res.status(400).json({
          success: false,
          message: 'Invalid product in cart'
        });
      }

      if (!product.isActive || product.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Product "${product.name || 'Unknown'}" is no longer available`
        });
      }

      if (product.stock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} ${product.unit} available for "${product.name}"`
        });
      }

      const itemTotal = product.price * cartItem.quantity;
      subtotal += itemTotal;

      // Get seller information
      const seller = await User.findById(product.seller);
      const sellerName = seller ? `${seller.firstName} ${seller.lastName}` : 'Unknown Seller';

      const orderItem = {
        product: product._id,
        productName: product.name || 'Unknown Product',
        productImage: product.images[0] || '',
        quantity: cartItem.quantity,
        unit: product.unit || 'piece',
        price: product.price,
        total: itemTotal,
        seller: product.seller,
        sellerName: sellerName || 'Unknown Seller'
      };
      
      console.log('Adding order item:', orderItem);
      orderItems.push(orderItem);
    }

    // Calculate total (add delivery fee, tax, etc.)
    const deliveryFee = 50; // Fixed delivery fee
    const tax = Math.round(subtotal * 0.13); // 13% tax
    const total = subtotal + deliveryFee + tax;

    console.log('Order totals:', { subtotal, deliveryFee, tax, total });
    console.log('Order items:', orderItems.length);
    console.log('Delivery address:', deliveryAddress);

    if (orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid items found in cart'
      });
    }

    // Generate order number
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `TS${year}${month}${day}${random}`;

    // Create order
    const orderData = {
      orderNumber,
      buyer: req.user._id,
      buyerName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Unknown User',
      buyerEmail: req.user.email || '',
      buyerPhone: req.user.phone || '',
      items: orderItems,
      subtotal,
      deliveryFee,
      tax,
      total,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod,
      deliveryAddress: {
        street: deliveryAddress.street?.trim() || 'Not provided',
        city: deliveryAddress.city?.trim() || 'Kathmandu',
        state: deliveryAddress.state?.trim() || 'Bagmati',
        postalCode: deliveryAddress.postalCode?.trim() || '',
        country: deliveryAddress.country?.trim() || 'Nepal',
        landmark: deliveryAddress.landmark?.trim() || '',
        instructions: deliveryAddress.instructions?.trim() || ''
      },
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      deliveryTimeSlot: deliveryTimeSlot || 'anytime',
      deliveryInstructions: deliveryInstructions || '',
      notes: notes || ''
    };

    console.log('Creating order:', orderNumber);
    
    // Validate the order data before creating
    try {
      const order = new Order(orderData);
      console.log('Order object created successfully');
      
      // Validate the order without saving
      const validationError = order.validateSync();
      if (validationError) {
        console.error('Validation error before save:', validationError);
        const validationErrors = Object.keys(validationError.errors).map(key => ({
          field: key,
          message: validationError.errors[key].message,
          value: validationError.errors[key].value
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validationErrors
        });
      }

      const savedOrder = await order.save();
      console.log('Order saved successfully:', savedOrder._id);

      // Reduce stock for all products
      for (const cartItem of cart.items) {
        try {
          console.log(`Reducing stock for product ${cartItem.product.name}: ${cartItem.quantity}`);
          await cartItem.product.reduceStock(cartItem.quantity);
        } catch (stockError) {
          console.error('Stock reduction error:', stockError);
          // If stock reduction fails, delete the order and return error
          await Order.findByIdAndDelete(savedOrder._id);
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${cartItem.product.name}. Only ${cartItem.product.stock} available.`
          });
        }
      }

      // Clear cart
      console.log('Clearing cart...');
      await cart.clear();
      console.log('Cart cleared successfully');

      console.log('Order creation completed successfully');
      res.status(201).json({
        success: true,
        data: { order: savedOrder },
        message: 'Order created successfully'
      });
    } catch (orderCreationError) {
      console.error('Order creation failed:', orderCreationError);
      throw orderCreationError;
    }
  } catch (error) {
    console.error('Create order error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message,
        value: error.errors[key].value
      }));
      
      console.error('Validation errors:', validationErrors);
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get buyer's orders
const getBuyerOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { buyer: req.user._id };

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('items.product', 'name images')
      .populate('items.seller', 'firstName lastName farmName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      },
      message: 'Orders retrieved successfully'
    });
  } catch (error) {
    console.error('Get buyer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
};

// Get seller's orders
const getSellerOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { 'items.seller': req.user._id };

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('buyer', 'firstName lastName email phone')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      },
      message: 'Orders retrieved successfully'
    });
  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
};

// Get single order
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('buyer', 'firstName lastName email phone')
      .populate('items.product', 'name images description')
      .populate('items.seller', 'firstName lastName farmName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user has access to this order
    const isBuyer = order.buyer._id.toString() === req.user._id.toString();
    const isSeller = order.items.some(item => 
      item.seller._id.toString() === req.user._id.toString()
    );

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { order },
      message: 'Order retrieved successfully'
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order'
    });
  }
};

// Accept order (seller only)
const acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is seller for this order
    const isSeller = order.items.some(item => 
      item.seller.toString() === req.user._id.toString()
    );

    if (!isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Order can only be accepted when pending'
      });
    }

    await order.updateStatus('approved');

    res.json({
      success: true,
      data: { order },
      message: 'Order accepted successfully'
    });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while accepting order'
    });
  }
};

// Reject order (seller only)
const rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is seller for this order
    const isSeller = order.items.some(item => 
      item.seller.toString() === req.user._id.toString()
    );

    if (!isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Order can only be rejected when pending'
      });
    }

    await order.updateStatus('rejected', reason);

    // Restore stock for rejected items
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        product.totalSold -= item.quantity;
        await product.save();
      }
    }

    res.json({
      success: true,
      data: { order },
      message: 'Order rejected successfully'
    });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting order'
    });
  }
};

// Update order status (seller only)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is seller for this order
    const isSeller = order.items.some(item => 
      item.seller.toString() === req.user._id.toString()
    );

    if (!isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await order.updateStatus(status, reason);

    res.json({
      success: true,
      data: { order },
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status'
    });
  }
};

// Cancel order (buyer only)
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is buyer for this order
    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled'
      });
    }

    await order.updateStatus('cancelled', reason);

    // Restore stock for cancelled items
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        product.totalSold -= item.quantity;
        await product.save();
      }
    }

    res.json({
      success: true,
      data: { order },
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling order'
    });
  }
};

// Get order statistics
const getOrderStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.user.userType;

    let stats = {};

    if (userType.includes('buyer')) {
      const buyerStats = await Order.aggregate([
        { $match: { buyer: userId } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$total' },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            }
          }
        }
      ]);

      stats.buyer = buyerStats[0] || {
        totalOrders: 0,
        totalSpent: 0,
        pendingOrders: 0,
        deliveredOrders: 0
      };
    }

    if (userType.includes('seller')) {
      const sellerStats = await Order.aggregate([
        { $match: { 'items.seller': userId } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalEarnings: { $sum: '$total' },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            }
          }
        }
      ]);

      stats.seller = sellerStats[0] || {
        totalOrders: 0,
        totalEarnings: 0,
        pendingOrders: 0,
        deliveredOrders: 0
      };
    }

    res.json({
      success: true,
      data: { stats },
      message: 'Order statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order statistics'
    });
  }
};

module.exports = {
  createOrder,
  getBuyerOrders,
  getSellerOrders,
  getOrder,
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  confirmOrderReceipt
};// C
onfirm order receipt by buyer
const confirmOrderReceipt = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      buyer: req.user._id,
      status: 'delivered'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not eligible for confirmation'
      });
    }

    // Update status to received
    await order.updateStatus('received');

    res.json({
      success: true,
      data: { order },
      message: 'Order receipt confirmed successfully'
    });
  } catch (error) {
    console.error('Confirm order receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm order receipt'
    });
  }
};