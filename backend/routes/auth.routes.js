const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/signup', authController.signup);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', protect, authController.getMe);

module.exports = router;
