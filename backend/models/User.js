const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: null },
  phone: { type: String, default: null },
  country: { type: String, default: null },
  timezone: { type: String, default: 'UTC' },
  isVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpire: { type: Date, default: null },
  trialStartDate: { type: Date, default: Date.now },
  trialEndDate: { type: Date, default: null },
  isTrialActive: { type: Boolean, default: true },
  subscriptionStatus: { 
    type: String, 
    enum: ['none', 'active', 'expired', 'cancelled'],
    default: 'none'
  },
  subscriptionPlan: { 
    type: String, 
    enum: ['none', 'monthly', 'quarterly', 'yearly'],
    default: 'none'
  },
  subscriptionStartDate: { type: Date, default: null },
  subscriptionEndDate: { type: Date, default: null },
  walletBalance: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  referralCount: { type: Number, default: 0 },
  referralRewardsEarned: { type: Number, default: 0 },
  quizStats: {
    totalQuizzes: { type: Number, default: 0 },
    totalCorrect: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    currentRank: { type: String, default: 'Beginner' },
    streakDays: { type: Number, default: 0 }
  },
  aiSessions: [{
    sessionId: String,
    subject: String,
    startedAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
  }],
  timetableEnabled: { type: Boolean, default: true },
  lastLogin: { type: Date, default: Date.now },
  loginCount: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false }
}, { timestamps: true });

// Hash password before saving - using async/await pattern
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user can access features
userSchema.methods.canAccessFeatures = function() {
  if (this.isAdmin) return true;
  if (this.subscriptionStatus === 'active') return true;
  if (this.isTrialActive && this.trialEndDate && new Date() < this.trialEndDate) return true;
  return false;
};

module.exports = mongoose.model('User', userSchema);
