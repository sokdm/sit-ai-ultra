const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Flutterwave details
  transactionId: { type: String, required: true, unique: true },
  flwRef: { type: String, required: true },
  txRef: { type: String, required: true },
  
  // Amount details
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  plan: { 
    type: String, 
    enum: ['monthly', 'quarterly', 'yearly'],
    required: true 
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'successful', 'failed', 'cancelled'],
    default: 'pending' 
  },
  
  // Customer details
  customerEmail: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, default: null },
  
  // Card/Payment method details
  paymentType: { type: String, default: 'card' },
  cardDetails: {
    last4digits: String,
    brand: String,
    expiry: String
  },
  
  // Metadata
  ipAddress: { type: String },
  device: { type: String },
  
  // Webhook verification
  webhookVerified: { type: Boolean, default: false },
  webhookData: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

// Create indexes
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
