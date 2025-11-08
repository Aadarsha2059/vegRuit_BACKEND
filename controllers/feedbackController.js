const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Create feedback
const createFeedback = async (req, res) => {
  try {
    const {
      feedbackType,
      subject,
      message,
      rating,
      complaintCategory,
      relatedOrder,
      relatedProduct,
      relatedSeller
    } = req.body;

    // Validate required fields
    if (!feedbackType || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Feedback type, subject, and message are required'
      });
    }

    // Determine user role
    const userRole = req.user.isSeller ? 'seller' : 'buyer';

    // Create feedback
    const feedback = new Feedback({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: userRole,
      feedbackType,
      subject: subject.trim(),
      message: message.trim(),
      rating: rating ? parseInt(rating) : null,
      complaintCategory: complaintCategory || null,
      relatedOrder: relatedOrder || null,
      relatedProduct: relatedProduct || null,
      relatedSeller: relatedSeller || null,
      // Auto-display positive feedback on homepage
      displayOnHomepage: rating && parseInt(rating) >= 4,
      isPublic: true
    });

    await feedback.save();

    // Populate for response
    await feedback.populate('user', 'firstName lastName city');

    res.status(201).json({
      success: true,
      data: { feedback },
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
};

// Get user's feedbacks
const getUserFeedbacks = async (req, res) => {
  try {
    const { page = 1, limit = 10, feedbackType, status } = req.query;

    let filter = { user: req.user._id };
    if (feedbackType) filter.feedbackType = feedbackType;
    if (status) filter.status = status;

    const feedbacks = await Feedback.find(filter)
      .populate('relatedOrder', 'orderNumber')
      .populate('relatedProduct', 'name')
      .populate('relatedSeller', 'firstName lastName farmName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalFeedbacks = await Feedback.countDocuments(filter);

    res.json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalFeedbacks / limit),
          totalFeedbacks
        }
      }
    });
  } catch (error) {
    console.error('Get user feedbacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedbacks'
    });
  }
};

// Get homepage feedbacks (public)
const getHomepageFeedbacks = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const feedbacks = await Feedback.getHomepageFeedbacks(parseInt(limit));

    res.json({
      success: true,
      data: { feedbacks },
      message: 'Homepage feedbacks fetched successfully'
    });
  } catch (error) {
    console.error('Get homepage feedbacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedbacks'
    });
  }
};

// Get single feedback
const getFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Feedback.findById(feedbackId)
      .populate('user', 'firstName lastName email city')
      .populate('relatedOrder', 'orderNumber')
      .populate('relatedProduct', 'name')
      .populate('relatedSeller', 'firstName lastName farmName')
      .populate('adminResponse.respondedBy', 'firstName lastName');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user has access
    if (feedback.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { feedback }
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback'
    });
  }
};

// Update feedback (user can update their own pending feedback)
const updateFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { subject, message, rating } = req.body;

    const feedback = await Feedback.findOne({
      _id: feedbackId,
      user: req.user._id,
      status: 'pending'
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found or cannot be updated'
      });
    }

    // Update fields
    if (subject) feedback.subject = subject.trim();
    if (message) feedback.message = message.trim();
    if (rating) {
      feedback.rating = parseInt(rating);
      feedback.displayOnHomepage = parseInt(rating) >= 4;
    }

    await feedback.save();

    res.json({
      success: true,
      data: { feedback },
      message: 'Feedback updated successfully'
    });
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feedback'
    });
  }
};

// Delete feedback (user can delete their own pending feedback)
const deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Feedback.findOne({
      _id: feedbackId,
      user: req.user._id,
      status: 'pending'
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found or cannot be deleted'
      });
    }

    await feedback.remove();

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete feedback'
    });
  }
};

// Admin: Get all feedbacks
const getAllFeedbacks = async (req, res) => {
  try {
    const { page = 1, limit = 20, feedbackType, status, priority } = req.query;

    let filter = {};
    if (feedbackType) filter.feedbackType = feedbackType;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const feedbacks = await Feedback.find(filter)
      .populate('user', 'firstName lastName email phone role')
      .populate('relatedOrder', 'orderNumber')
      .populate('relatedProduct', 'name')
      .populate('relatedSeller', 'firstName lastName farmName')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalFeedbacks = await Feedback.countDocuments(filter);

    // Get statistics
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        feedbacks,
        stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalFeedbacks / limit),
          totalFeedbacks
        }
      }
    });
  } catch (error) {
    console.error('Get all feedbacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedbacks'
    });
  }
};

// Admin: Respond to feedback
const respondToFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { message, status } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Response message is required'
      });
    }

    const feedback = await Feedback.findById(feedbackId);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    feedback.adminResponse = {
      message: message.trim(),
      respondedBy: req.user._id,
      respondedAt: new Date()
    };

    if (status) {
      feedback.status = status;
    } else {
      feedback.status = 'in_progress';
    }

    await feedback.save();

    await feedback.populate('adminResponse.respondedBy', 'firstName lastName');

    res.json({
      success: true,
      data: { feedback },
      message: 'Response added successfully'
    });
  } catch (error) {
    console.error('Respond to feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add response'
    });
  }
};

// Admin: Update feedback status
const updateFeedbackStatus = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status, priority, displayOnHomepage } = req.body;

    const feedback = await Feedback.findById(feedbackId);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    if (status) feedback.status = status;
    if (priority) feedback.priority = priority;
    if (displayOnHomepage !== undefined) feedback.displayOnHomepage = displayOnHomepage;

    await feedback.save();

    res.json({
      success: true,
      data: { feedback },
      message: 'Feedback updated successfully'
    });
  } catch (error) {
    console.error('Update feedback status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feedback'
    });
  }
};

module.exports = {
  createFeedback,
  getUserFeedbacks,
  getHomepageFeedbacks,
  getFeedback,
  updateFeedback,
  deleteFeedback,
  getAllFeedbacks,
  respondToFeedback,
  updateFeedbackStatus
};
