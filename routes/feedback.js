const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { auth, requireUserType } = require('../middlewares/auth');

// Public routes
router.get('/homepage', feedbackController.getHomepageFeedbacks);

// Protected routes (authenticated users)
router.post('/', auth, feedbackController.createFeedback);
router.get('/my-feedbacks', auth, feedbackController.getUserFeedbacks);
router.get('/:feedbackId', auth, feedbackController.getFeedback);
router.put('/:feedbackId', auth, feedbackController.updateFeedback);
router.delete('/:feedbackId', auth, feedbackController.deleteFeedback);

// Admin routes
router.get('/admin/all', auth, requireUserType('admin'), feedbackController.getAllFeedbacks);
router.post('/:feedbackId/respond', auth, requireUserType('admin'), feedbackController.respondToFeedback);
router.patch('/:feedbackId/status', auth, requireUserType('admin'), feedbackController.updateFeedbackStatus);

module.exports = router;
