const User = require('../models/User');
const Payment = require('../models/Payment');
const { Quiz } = require('../models/Quiz');
const AdminLog = require('../models/AdminLog');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = require('jsonwebtoken').sign(
      { id: 'admin', isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        email: process.env.ADMIN_EMAIL,
        name: 'Wisdom (CEO)'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Admin login failed' });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Statistics
    const stats = {
      totalUsers: await User.countDocuments(),
      newUsersToday: await User.countDocuments({ createdAt: { $gte: today } }),
      newUsersThisMonth: await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      
      activeSubscriptions: await User.countDocuments({ subscriptionStatus: 'active' }),
      trialUsers: await User.countDocuments({ isTrialActive: true }),
      expiredTrials: await User.countDocuments({ 
        isTrialActive: false, 
        subscriptionStatus: 'none' 
      }),

      totalRevenue: await Payment.aggregate([
        { $match: { status: 'successful' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      todayRevenue: await Payment.aggregate([
        { $match: { status: 'successful', createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      pendingPayments: await Payment.countDocuments({ status: 'pending' }),
      failedPayments: await Payment.countDocuments({ status: 'failed' }),

      totalQuizzes: await Quiz.countDocuments(),
      totalQuizAttempts: await require('../models/Quiz').QuizAttempt.countDocuments()
    };

    // Recent activity
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('firstName lastName email createdAt subscriptionStatus');

    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'firstName lastName email');

    res.json({
      success: true,
      stats: {
        ...stats,
        totalRevenue: stats.totalRevenue[0]?.total || 0,
        todayRevenue: stats.todayRevenue[0]?.total || 0
      },
      recentUsers,
      recentPayments
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.subscriptionStatus = status;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.manageUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, data } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    switch (action) {
      case 'block':
        user.isBlocked = true;
        break;
      case 'unblock':
        user.isBlocked = false;
        break;
      case 'extend_trial':
        user.trialEndDate = new Date(Date.now() + data.days * 24 * 60 * 60 * 1000);
        user.isTrialActive = true;
        break;
      case 'grant_subscription':
        user.subscriptionStatus = 'active';
        user.subscriptionPlan = data.plan || 'monthly';
        user.subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'cancel_subscription':
        user.subscriptionStatus = 'cancelled';
        break;
    }

    await user.save();

    // Log action
    await AdminLog.create({
      admin: req.user.id || 'system',
      action,
      entity: 'user',
      entityId: userId,
      details: data
    });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to manage user' });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'firstName lastName email');

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

exports.getWebhookLogs = async (req, res) => {
  try {
    // This would require a WebhookLog model in production
    res.json({
      success: true,
      message: 'Webhook logs endpoint - implement WebhookLog model for production'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch webhook logs' });
  }
};
