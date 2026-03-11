const crypto = require('crypto');

// Generate random string
exports.generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Format currency
exports.formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Calculate trial end date
exports.calculateTrialEndDate = (days = 1) => {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

// Sanitize user input
exports.sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, '').trim();
};

// Validate email
exports.isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Format date
exports.formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Calculate time ago
exports.timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return 'Just now';
};
