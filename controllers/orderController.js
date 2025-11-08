const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

// ========================
// Confirm Order Receipt (buyer only)
// ========================
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

// ========================
// Create order from cart
// ========================
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

    const cart = await Cart.findOne({ buyer: req.user._id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    const orderItems = [];
    let subtotal = 0;

    for (let i = 0; i < cart.items.length; i++) {
      const cartItem = cart.items[i];
      const product = cartItem.product;

      if (!product) {
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
        sellerName: sellerName
      };

      orderItems.push(orderItem);
    }

    const deliveryFee = 50;
    const tax = Math.round(subtotal * 0.13);
    const total = subtotal + deliveryFee + tax;

    if (orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid items found in cart'
      });
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `TS${year}${month}${day}${random}`;

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

    const order = new Order(orderData);

    const validationError = order.validateSync();
    if (validationError) {
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

    // Reduce stock for all products
    for (const cartItem of cart.items) {
      await cartItem.product.reduceStock(cartItem.quantity);
    }

    await cart.clear();

    res.status(201).json({
      success: true,
      data: { order: savedOrder },
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

// ========================
// Get buyer's orders
// ========================
const getBuyerOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;
    let query = { buyer: req.user._id };
    if (status) query.status = status;

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

// ========================
// Get seller's orders
// ========================
const getSellerOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;
    let query = { 'items.seller': req.user._id };
    if (status) query.status = status;

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

// ========================
// Get single order
// ========================
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

// ========================
// Accept Order (Seller)
// ========================
const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      'items.seller': req.user._id,
      status: 'pending'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or already processed'
      });
    }

    await order.updateStatus('confirmed');

    res.json({
      success: true,
      data: { order },
      message: 'Order accepted successfully'
    });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept order'
    });
  }
};

// ========================
// Reject Order (Seller)
// ========================
const rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      'items.seller': req.user._id,
      status: 'pending'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or already processed'
      });
    }

    await order.updateStatus('rejected', reason);

    res.json({
      success: true,
      data: { order },
      message: 'Order rejected'
    });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject order'
    });
  }
};

// ========================
// Update Order Status (Seller)
// ========================
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({
      _id: id,
      'items.seller': req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.updateStatus(status);

    res.json({
      success: true,
      data: { order },
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// ========================
// Cancel Order (Buyer)
// ========================
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: id,
      buyer: req.user._id,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or cannot be cancelled'
      });
    }

    await order.updateStatus('cancelled', reason);

    res.json({
      success: true,
      data: { order },
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
};

// ========================
// Get Order Stats
// ========================
const getOrderStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let query = {};
    if (userRole === 'buyer') {
      query = { buyer: userId };
    } else if (userRole === 'seller') {
      query = { 'items.seller': userId };
    }

    const totalOrders = await Order.countDocuments(query);
    const pendingOrders = await Order.countDocuments({ ...query, status: 'pending' });
    const completedOrders = await Order.countDocuments({ ...query, status: 'delivered' });

    const revenueData = await Order.aggregate([
      { $match: query },
      { $match: { status: { $in: ['delivered', 'received'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' }
        }
      }
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue
      },
      message: 'Order stats retrieved successfully'
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order stats'
    });
  }
};

// ========================
// Exports
// ========================
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
};
