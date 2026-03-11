const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { 
    type: String, 
    enum: ['user', 'assistant', 'system'],
    required: true 
  },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  // For voice messages
  isVoice: { type: Boolean, default: false },
  voiceUrl: { type: String, default: null },
  // For images
  hasImage: { type: Boolean, default: false },
  imageUrl: { type: String, default: null },
  // Metadata
  tokensUsed: { type: Number, default: 0 },
  processingTime: { type: Number, default: 0 }
});

const conversationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
  },
  sessionId: { type: String, required: true },
  subject: { type: String, default: 'General' },
  title: { type: String, default: 'New Conversation' },
  messages: [messageSchema],
  context: [{
    role: String,
    content: String
  }],
  isActive: { type: Boolean, default: true },
  lastMessageAt: { type: Date, default: Date.now },
  totalMessages: { type: Number, default: 0 },
  metadata: {
    device: String,
    browser: String,
    ip: String
  }
}, { timestamps: true });

// Create indexes
conversationSchema.index({ user: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
