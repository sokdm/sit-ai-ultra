const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized to access this route' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if it's an admin token (has isAdmin flag)
      if (decoded.isAdmin) {
        req.user = { 
          id: 'admin', 
          isAdmin: true,
          _id: 'admin',
          canAccessFeatures: () => true
        };
        return next();
      }

      // Regular user token
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Check feature access for regular users
      if (!req.user.canAccessFeatures() && !req.path.includes('/auth/')) {
        return res.status(403).json({
          error: 'Subscription required',
          code: 'SUBSCRIPTION_REQUIRED',
          trialEnded: !req.user.isTrialActive,
          subscriptionStatus: req.user.subscriptionStatus
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({ error: 'Not authorized' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.adminOnly = async (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Check subscription middleware
exports.requireSubscription = async (req, res, next) => {
  if (req.user.canAccessFeatures()) {
    next();
  } else {
    res.status(403).json({
      error: 'Active subscription required',
      redirectTo: '/pricing.html',
      trialEnded: !req.user.isTrialActive
    });
  }
};
