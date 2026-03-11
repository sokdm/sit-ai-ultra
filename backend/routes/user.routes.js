const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/users/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phone, country, timezone } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, phone, country, timezone },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// @desc    Upload avatar
// @route   POST /api/users/avatar
router.post('/avatar', protect, async (req, res) => {
  try {
    // Placeholder for avatar upload - would use multer in production
    res.json({
      success: true,
      message: 'Avatar upload endpoint - implement multer for file handling'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// @desc    Get user stats
// @route   GET /api/users/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      stats: {
        quizStats: user.quizStats,
        referralCount: user.referralCount,
        subscriptionStatus: user.subscriptionStatus,
        daysActive: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
