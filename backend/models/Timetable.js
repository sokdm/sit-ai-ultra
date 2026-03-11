const mongoose = require('mongoose');

const scheduleItemSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  topic: { type: String, default: '' },
  dayOfWeek: { 
    type: String, 
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true 
  },
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true },
  duration: { type: Number, default: 60 }, // minutes
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'],
    default: 'medium' 
  },
  notes: { type: String, default: '' },
  isRecurring: { type: Boolean, default: true },
  reminderSent: { type: Boolean, default: false },
  completed: { type: Boolean, default: false }
});

const timetableSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  schedules: [scheduleItemSchema],
  emailReminders: { type: Boolean, default: true },
  reminderTime: { type: Number, default: 30 }, // minutes before
  timezone: { type: String, default: 'UTC' },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
