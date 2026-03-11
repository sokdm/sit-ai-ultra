module.exports = {
  // Trial configuration
  TRIAL_DAYS: 1,
  
  // Subscription plans (in USD)
  PLANS: {
    monthly: { price: 5.99, duration: 30, name: 'Monthly Plan' },
    quarterly: { price: 14.99, duration: 90, name: 'Quarterly Plan' },
    yearly: { price: 49.99, duration: 365, name: 'Yearly Plan' }
  },
  
  // AI Configuration
  AI: {
    model: 'deepseek-chat',
    maxTokens: 2000,
    temperature: 0.7,
    contextWindow: 10 // Keep last 10 messages for context
  },
  
  // Quiz Configuration
  QUIZ: {
    levels: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    pointsPerCorrect: 10,
    hintPenalty: 2
  },
  
  // Email templates
  EMAIL_TEMPLATES: {
    welcome: 'welcome',
    otp: 'otp-verification',
    resetPassword: 'reset-password',
    trialEnding: 'trial-ending',
    paymentSuccess: 'payment-success',
    timetableReminder: 'timetable-reminder'
  }
};
