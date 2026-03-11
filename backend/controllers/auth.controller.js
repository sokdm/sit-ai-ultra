const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/email.service');
const config = require('../config/config');

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// @desc    Register new user
// @route   POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, referralCode } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters with uppercase, lowercase, number and special character' 
      });
    }

    // Create user with trial end date
    const trialEndDate = new Date(Date.now() + config.TRIAL_DAYS * 24 * 60 * 60 * 1000);
    
    const userData = {
      firstName,
      lastName,
      email,
      password, // Will be hashed by pre-save hook
      trialEndDate: trialEndDate,
      isTrialActive: true
    };

    // Create user instance
    const user = new User(userData);
    
    // Save user (this triggers the pre-save hook)
    await user.save();

    // Generate referral code after save (needs _id)
    user.referralCode = `SIT${user._id.toString().slice(-6).toUpperCase()}`;
    
    // Handle referral
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        user.referredBy = referrer._id;
        referrer.referralCount += 1;
        await referrer.save();
      }
    }
    
    // Generate OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Save again with referral code and OTP
    await user.save();

    // Send OTP email (don't await to avoid blocking)
    emailService.sendOTP(email, otp, firstName).catch(err => {
      console.error('Email send error:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent.',
      userId: user._id
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during registration: ' + error.message });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Send welcome email (don't await)
    emailService.sendWelcome(user.email, user.firstName).catch(console.error);

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isTrialActive: user.isTrialActive,
        trialEndDate: user.trialEndDate,
        subscriptionStatus: user.subscriptionStatus,
        referralCode: user.referralCode
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
exports.resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await emailService.sendOTP(user.email, otp, user.firstName);

    res.json({ success: true, message: 'OTP resent successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account blocked. Contact support.' });
    }

    // Check trial status
    if (user.isTrialActive && new Date() > user.trialEndDate) {
      user.isTrialActive = false;
    }

    user.lastLogin = Date.now();
    user.loginCount += 1;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isVerified: user.isVerified,
        isTrialActive: user.isTrialActive,
        trialEndDate: user.trialEndDate,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
        canAccessFeatures: user.canAccessFeatures(),
        referralCode: user.referralCode,
        quizStats: user.quizStats
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/pages/auth/reset-password.html?token=${resetToken}`;
    
    try {
      await emailService.sendPasswordReset(user.email, resetUrl, user.firstName);
      res.json({ success: true, message: 'Password reset email sent' });
    } catch (emailError) {
      console.error('Email error:', emailError);
      res.status(500).json({ error: 'Failed to send email. Please try again later.' });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isTrialActive: user.isTrialActive,
        trialEndDate: user.trialEndDate,
        subscriptionStatus: user.subscriptionStatus,
        canAccessFeatures: user.canAccessFeatures(),
        referralCode: user.referralCode,
        quizStats: user.quizStats,
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
