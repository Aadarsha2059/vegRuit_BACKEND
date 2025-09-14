const Payment = require('../models/Payment');
const Order = require('../models/Order');
const crypto = require('crypto');

// Initialize payment
const initializePayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is the buyer
    if (!order.buyer.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to make payment for this order'
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ order: orderId });
    if (existingPayment && existingPayment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this order'
      });
    }

    // Calculate processing fee based on payment method
    let processingFee = 0;
    if (paymentMethod === 'esewa') {
      processingFee = Math.max(order.finalAmount * 0.02, 10); // 2% or minimum Rs. 10
    } else if (paymentMethod === 'khalti') {
      processingFee = Math.max(order.finalAmount * 0.025, 15); // 2.5% or minimum Rs. 15
    }

    // Create or update payment record
    let payment;
    if (existingPayment) {
      payment = existingPayment;
      payment.paymentMethod = paymentMethod;
      payment.processingFee = processingFee;
      payment.status = 'pending';
    } else {
      payment = new Payment({
        order: orderId,
        buyer: order.buyer,
        seller: order.seller,
        amount: order.finalAmount,
        paymentMethod,
        processingFee,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    }

    await payment.save();

    // Generate payment gateway specific data
    let gatewayData = {};
    
    if (paymentMethod === 'esewa') {
      gatewayData = {
        productCode: 'EPAYTEST',
        totalAmount: payment.amount,
        transactionUuid: payment.paymentId,
        productServiceCharge: 0,
        productDeliveryCharge: 0,
        taxAmount: 0,
        successUrl: `${process.env.FRONTEND_URL}/payment/success`,
        failureUrl: `${process.env.FRONTEND_URL}/payment/failure`
      };
    } else if (paymentMethod === 'khalti') {
      gatewayData = {
        publicKey: process.env.KHALTI_PUBLIC_KEY,
        productIdentity: payment.paymentId,
        productName: `VegRuit Order ${order.orderNumber}`,
        productUrl: `${process.env.FRONTEND_URL}/orders/${orderId}`,
        amount: payment.amount * 100, // Khalti expects amount in paisa
        mobile: req.user.phone || ''
      };
    }

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        payment: {
          paymentId: payment.paymentId,
          amount: payment.amount,
          processingFee: payment.processingFee,
          netAmount: payment.netAmount,
          paymentMethod: payment.paymentMethod,
          status: payment.status
        },
        gatewayData
      }
    });

  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message
    });
  }
};

// Verify payment (for online payments)
const verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { transactionId, gatewayResponse } = req.body;

    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Add verification attempt
    await payment.addAttempt('processing', null, gatewayResponse);

    let verificationResult = false;

    // Verify based on payment method
    if (payment.paymentMethod === 'esewa') {
      verificationResult = await verifyEsewaPayment(payment, transactionId, gatewayResponse);
    } else if (payment.paymentMethod === 'khalti') {
      verificationResult = await verifyKhaltiPayment(payment, transactionId, gatewayResponse);
    }

    if (verificationResult) {
      // Payment verified successfully
      payment.transactionId = transactionId;
      payment.gatewayResponse = gatewayResponse;
      await payment.verifyPayment(req.user.id);

      // Update order payment status
      const order = await Order.findById(payment.order);
      order.paymentStatus = 'paid';
      await order.save();

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: payment
      });
    } else {
      // Payment verification failed
      payment.status = 'failed';
      await payment.addAttempt('failed', 'Payment verification failed', gatewayResponse);
      await payment.save();

      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// Confirm cash on delivery payment
const confirmCODPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { receiptNumber } = req.body;

    const payment = await Payment.findOne({ paymentId }).populate('order');
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user is the seller
    if (!payment.seller.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only seller can confirm COD payment'
      });
    }

    // Update payment details
    payment.codDetails = {
      collectedBy: req.user.id,
      collectedAt: new Date(),
      receiptNumber
    };
    await payment.verifyPayment(req.user.id);

    // Update order status
    const order = await Order.findById(payment.order);
    order.paymentStatus = 'paid';
    await order.save();

    res.json({
      success: true,
      message: 'COD payment confirmed successfully',
      data: payment
    });

  } catch (error) {
    console.error('Confirm COD payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm COD payment',
      error: error.message
    });
  }
};

// Process refund
const processRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { refundAmount, reason } = req.body;

    const payment = await Payment.findOne({ paymentId }).populate('order');
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if refund amount is valid
    if (refundAmount > payment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed payment amount'
      });
    }

    // Process refund based on payment method
    let refundMethod = 'original';
    if (payment.paymentMethod === 'cash_on_delivery') {
      refundMethod = 'bank_transfer';
    }

    await payment.processRefund(refundAmount, reason, refundMethod);

    // Update order status
    const order = await Order.findById(payment.order);
    order.refundAmount = refundAmount;
    await order.addTrackingUpdate('refunded', `Refund processed: Rs. ${refundAmount}`, req.user.id);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: payment
    });

  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

// Get payment details
const getPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({ paymentId })
      .populate('order', 'orderNumber status finalAmount')
      .populate('buyer', 'firstName lastName email')
      .populate('seller', 'firstName lastName farmName')
      .populate('verifiedBy', 'firstName lastName');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check authorization
    const isBuyer = payment.buyer._id.equals(req.user.id);
    const isSeller = payment.seller._id.equals(req.user.id);

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message
    });
  }
};

// Get payment statistics for seller
const getPaymentStats = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const stats = await Payment.getPaymentStats(req.user.id, {
      start: startDate,
      end: new Date()
    });

    res.json({
      success: true,
      data: {
        stats,
        period: `${period} days`
      }
    });

  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics',
      error: error.message
    });
  }
};

// Helper function to verify eSewa payment
const verifyEsewaPayment = async (payment, transactionId, gatewayResponse) => {
  try {
    // In production, you would make an API call to eSewa verification endpoint
    // For now, we'll simulate verification based on response data
    if (gatewayResponse && gatewayResponse.status === 'COMPLETE') {
      payment.esewaDetails = {
        transactionUuid: gatewayResponse.transaction_uuid,
        productCode: gatewayResponse.product_code,
        totalAmount: gatewayResponse.total_amount,
        status: gatewayResponse.status,
        refId: gatewayResponse.ref_id
      };
      return true;
    }
    return false;
  } catch (error) {
    console.error('eSewa verification error:', error);
    return false;
  }
};

// Helper function to verify Khalti payment
const verifyKhaltiPayment = async (payment, token, gatewayResponse) => {
  try {
    // In production, you would make an API call to Khalti verification endpoint
    // For now, we'll simulate verification
    if (gatewayResponse && gatewayResponse.state && gatewayResponse.state.name === 'Completed') {
      payment.khaltiDetails = {
        token,
        amount: gatewayResponse.amount,
        mobile: gatewayResponse.mobile,
        productIdentity: gatewayResponse.product_identity,
        productName: gatewayResponse.product_name,
        productUrl: gatewayResponse.product_url
      };
      return true;
    }
    return false;
  } catch (error) {
    console.error('Khalti verification error:', error);
    return false;
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  confirmCODPayment,
  processRefund,
  getPayment,
  getPaymentStats
};
