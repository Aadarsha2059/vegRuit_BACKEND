const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

// Send order confirmation email to buyer
const sendOrderConfirmationEmail = async (order) => {
  try {
    const emailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    
    if (emailConfigured) {
      const nodemailer = require('nodemailer');
      
      // Create transporter
      const transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Create order items list for email
      const itemsList = order.items.map(item => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.productName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity} ${item.unit}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.total}</td>
        </tr>
      `).join('');

      // Email content
      const mailOptions = {
        from: `"Vegruit Order Confirmation" <${process.env.EMAIL_USER}>`,
        to: order.buyerEmail,
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #22c55e; text-align: center; margin-top: 0;">Order Confirmation</h2>
              <p>Hello ${order.buyerName},</p>
              <p>Your order <strong>${order.orderNumber}</strong> has been successfully placed.</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Order Details</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span style="color: #22c55e; font-weight: bold;">${order.status}</span></p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background: #22c55e; color: white;">
                    <th style="padding: 12px; text-align: left;">Item</th>
                    <th style="padding: 12px; text-align: center;">Quantity</th>
                    <th style="padding: 12px; text-align: right;">Price</th>
                    <th style="padding: 12px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #333;">Price Summary</h4>
                <p style="margin: 8px 0;"><strong>Subtotal:</strong> <span style="float: right;">₹${order.subtotal}</span></p>
                <p style="margin: 8px 0;"><strong>Delivery Fee:</strong> <span style="float: right;">₹${order.deliveryFee}</span></p>
                <p style="margin: 8px 0;"><strong>Tax:</strong> <span style="float: right;">₹${order.tax}</span></p>
                <p style="margin: 8px 0; border-top: 1px solid #ddd; padding-top: 10px;"><strong>Total:</strong> <span style="float: right; font-weight: bold;">₹${order.total}</span></p>
              </div>
              
              <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #22c55e;">Delivery Address</h4>
                <p style="margin: 5px 0;">${order.deliveryAddress.street}</p>
                <p style="margin: 5px 0;">${order.deliveryAddress.city}, ${order.deliveryAddress.state}</p>
                <p style="margin: 5px 0;">${order.deliveryAddress.postalCode}, ${order.deliveryAddress.country}</p>
                ${order.deliveryInstructions ? `<p style="margin: 5px 0;"><strong>Instructions:</strong> ${order.deliveryInstructions}</p>` : ''}
              </div>
              
              <p>Thank you for ordering with Vegruit! You will receive updates on your order status via email.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated email from Vegruit. Please do not reply to this email.</p>
            </div>
          </div>
        `
      };

      // Send email
      await transporter.sendMail(mailOptions);
      console.log(`[ORDER CONFIRMATION] Email sent to: ${order.buyerEmail}`);
    } else {
      console.log(`[ORDER CONFIRMATION] Email not configured. Order details for ${order.buyerEmail}: ${order.orderNumber}`);
    }
  } catch (error) {
    console.error('[ORDER CONFIRMATION] Email send error:', error);
  }
};

// Send order status update email to buyer
const sendOrderStatusUpdateEmail = async (order, oldStatus) => {
  try {
    const emailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    
    if (emailConfigured) {
      const nodemailer = require('nodemailer');
      
      // Create transporter
      const transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Status-specific messages
      const statusMessages = {
        'pending': 'Your order has been placed and is pending confirmation.',
        'confirmed': 'Your order has been confirmed and will be processed shortly.',
        'processing': 'Your order is being processed by the seller.',
        'shipped': 'Your order has been shipped and is on the way to you.',
        'delivered': 'Your order has been delivered. You can now confirm receipt.',
        'received': 'Your order has been marked as received.',
        'cancelled': 'Your order has been cancelled.',
        'rejected': 'Your order has been rejected by the seller.'
      };

      // Email content
      const mailOptions = {
        from: `"Vegruit Order Update" <${process.env.EMAIL_USER}>`,
        to: order.buyerEmail,
        subject: `Order Status Update - ${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #22c55e; text-align: center; margin-top: 0;">Order Status Update</h2>
              <p>Hello ${order.buyerName},</p>
              <p>The status of your order <strong>${order.orderNumber}</strong> has been updated from <strong>${oldStatus}</strong> to <strong>${order.status}</strong>.</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; text-align: center; font-size: 16px; color: #22c55e; font-weight: bold;">
                  ${statusMessages[order.status] || `Your order status is now: ${order.status}`}
                </p>
              </div>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Order Summary</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Current Status:</strong> <span style="color: #22c55e; font-weight: bold;">${order.status}</span></p>
                <p><strong>Total Amount:</strong> ₹${order.total}</p>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              
              <p>You can track your order status by logging into your Vegruit account.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated email from Vegruit. Please do not reply to this email.</p>
            </div>
          </div>
        `
      };

      // Send email
      await transporter.sendMail(mailOptions);
      console.log(`[ORDER STATUS UPDATE] Email sent to: ${order.buyerEmail}`);
    } else {
      console.log(`[ORDER STATUS UPDATE] Email not configured. Order status update for ${order.buyerEmail}: ${order.orderNumber} - ${oldStatus} → ${order.status}`);
    }
  } catch (error) {
    console.error('[ORDER STATUS UPDATE] Email send error:', error);
  }
};

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

    // Send order confirmation email to buyer
    await sendOrderConfirmationEmail(savedOrder);

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

    const oldStatus = order.status;
    await order.updateStatus('confirmed');
    
    // Send status update email to buyer
    await sendOrderStatusUpdateEmail(order, oldStatus);

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

    const oldStatus = order.status;
    await order.updateStatus('rejected', reason);
    
    // Send status update email to buyer
    await sendOrderStatusUpdateEmail(order, oldStatus);

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

    const oldStatus = order.status;
    await order.updateStatus(status);
    
    // Send status update email to buyer
    await sendOrderStatusUpdateEmail(order, oldStatus);

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

    const oldStatus = order.status;
    await order.updateStatus('cancelled', reason);
    
    // Send status update email to buyer
    await sendOrderStatusUpdateEmail(order, oldStatus);

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