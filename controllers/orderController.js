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

    // Get user's cart
    const cart = await Cart.findOne({ buyer: req.user._id })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate all items are still available
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of cart.items) {
      const product = cartItem.product;
      
      if (!product || !product.isActive || product.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Product "${product?.name || 'Unknown'}" is no longer available`
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

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.images[0] || '',
        quantity: cartItem.quantity,
        unit: product.unit,
        price: product.price,
        total: itemTotal,
        seller: product.seller,
        sellerName: product.sellerName || 'Unknown Seller'
      });
    }

    // Calculate total (add delivery fee, tax, etc.)
    const deliveryFee = 50; // Fixed delivery fee
    const tax = subtotal * 0.13; // 13% tax
    const total = subtotal + deliveryFee + tax;

    // Create order
    const order = new Order({
      buyer: req.user._id,
      buyerName: `${req.user.firstName} ${req.user.lastName}`,
      buyerEmail: req.user.email,
      buyerPhone: req.user.phone,
      items: orderItems,
      subtotal,
      deliveryFee,
      tax,
      total,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod,
      deliveryAddress,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      deliveryTimeSlot,
      deliveryInstructions,
      notes
    });

    await order.save();

    // Reduce stock for all products
    for (const cartItem of cart.items) {
      await cartItem.product.reduceStock(cartItem.quantity);
    }

    // Clear cart
    await cart.clear();

    res.status(201).json({
      success: true,
      data: { order },
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order'
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
  updateOrderStatus,
  cancelOrder,
  getOrderStats
};