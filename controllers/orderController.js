const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Payment = require('../models/Payment');

// Create new order
const createOrder = async (req, res) => {
  try {
    const {
      seller,
      items,
      deliveryAddress,
      paymentMethod,
      deliveryDate,
      deliveryTimeSlot,
      specialInstructions
    } = req.body;

    // Validate items and calculate total
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        product: item.product,
        quantity: item.quantity,
        price: product.price,
        unit: item.unit || product.unit
      });
    }

    // Calculate delivery fee (basic logic - can be enhanced)
    const deliveryFee = totalAmount > 1000 ? 0 : 50;

    // Create order
    const order = new Order({
      buyer: req.user.id,
      seller,
      items: validatedItems,
      totalAmount,
      deliveryFee,
      paymentMethod,
      deliveryAddress,
      deliveryDate,
      deliveryTimeSlot,
      specialInstructions,
      estimatedDeliveryTime: deliveryDate || new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24 hours
    });

    await order.save();

    // Update product stock
    for (const item of validatedItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
    }

    // Add initial tracking update
    await order.addTrackingUpdate('pending', 'Order placed successfully', req.user.id);

    // Populate order details
    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'firstName lastName email phone')
      .populate('seller', 'firstName lastName farmName phone email')
      .populate('items.product', 'name images category');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: populatedOrder
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Get orders for buyer
const getBuyerOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { buyer: req.user.id };

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('seller', 'firstName lastName farmName phone')
      .populate('items.product', 'name images category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get buyer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Get orders for seller
const getSellerOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { seller: req.user.id };

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('buyer', 'firstName lastName phone email')
      .populate('items.product', 'name images category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Get single order
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('buyer', 'firstName lastName email phone')
      .populate('seller', 'firstName lastName farmName phone email')
      .populate('items.product', 'name images category description')
      .populate('trackingUpdates.updatedBy', 'firstName lastName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is authorized to view this order
    if (!order.buyer.equals(req.user.id) && !order.seller.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

// Update order status (seller only)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is the seller
    if (!order.seller.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only seller can update order status'
      });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['out_for_delivery'],
      'out_for_delivery': ['delivered'],
      'delivered': [],
      'cancelled': ['refunded'],
      'refunded': []
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${order.status} to ${status}`
      });
    }

    // Add tracking update
    await order.addTrackingUpdate(status, message || `Order status updated to ${status}`, req.user.id);

    // If order is delivered, update payment status for COD
    if (status === 'delivered' && order.paymentMethod === 'cash_on_delivery') {
      order.paymentStatus = 'paid';
      await order.save();
    }

    const updatedOrder = await Order.findById(id)
      .populate('buyer', 'firstName lastName email phone')
      .populate('seller', 'firstName lastName farmName phone email')
      .populate('items.product', 'name images category')
      .populate('trackingUpdates.updatedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// Cancel order
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

    // Check if user is authorized to cancel
    const isBuyer = order.buyer.equals(req.user.id);
    const isSeller = order.seller.equals(req.user.id);

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['pending', 'confirmed', 'preparing'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    // Update order
    order.cancelReason = reason;
    await order.addTrackingUpdate('cancelled', `Order cancelled: ${reason}`, req.user.id);

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    const updatedOrder = await Order.findById(id)
      .populate('buyer', 'firstName lastName email phone')
      .populate('seller', 'firstName lastName farmName phone email')
      .populate('items.product', 'name images category');

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

// Get order statistics for seller
const getOrderStats = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const stats = await Order.aggregate([
      {
        $match: {
          seller: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments({ seller: sellerId });
    const totalRevenue = await Order.aggregate([
      {
        $match: {
          seller: req.user._id,
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$finalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        periodStats: stats,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        period: `${period} days`
      }
    });

  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics',
      error: error.message
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
