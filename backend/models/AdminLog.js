const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true }, // user, payment, quiz, etc.
  entityId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminLog', adminLogSchema);
