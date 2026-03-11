const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // Index of correct option
  explanation: { type: String, required: true },
  hint: { type: String, default: null },
  difficulty: { 
    type: String, 
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    required: true 
  },
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  points: { type: Number, default: 10 }
});

const quizAttemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  answers: [{
    questionIndex: Number,
    selectedAnswer: Number,
    isCorrect: Boolean,
    timeSpent: Number // seconds
  }],
  score: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  completedAt: { type: Date, default: Date.now },
  usedHints: { type: Number, default: 0 },
  rank: { type: String, default: 'Beginner' }
});

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  subject: { type: String, required: true },
  difficulty: { 
    type: String, 
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    required: true 
  },
  questions: [questionSchema],
  timeLimit: { type: Number, default: 600 }, // seconds
  totalPoints: { type: Number, default: 100 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);
const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

module.exports = { Quiz, QuizAttempt };
