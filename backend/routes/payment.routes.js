const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth');

router.post('/initialize', protect, paymentController.initializePayment);
router.get('/verify', protect, paymentController.verifyPayment);
router.post('/webhook', paymentController.webhook);
router.get('/history', protect, paymentController.getPaymentHistory);
router.get('/subscription-status', protect, paymentController.getSubscriptionStatus);

module.exports = router;
