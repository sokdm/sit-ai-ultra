const { Quiz, QuizAttempt } = require('../models/Quiz');
const User = require('../models/User');
const deepseekService = require('../ai-services/deepseek.service');

// Sample quizzes (in production, use AI to generate or admin to create)
const sampleQuizzes = [
  {
    title: 'Python Basics',
    description: 'Test your Python fundamentals',
    subject: 'Programming',
    difficulty: 'Beginner',
    questions: [
      {
        question: 'What is the correct way to create a function in Python?',
        options: [
          'function myFunc():',
          'def myFunc():',
          'create myFunc():',
          'func myFunc():'
        ],
        correctAnswer: 1,
        explanation: 'In Python, functions are defined using the "def" keyword followed by the function name and parentheses.',
        hint: 'It starts with three letters and rhymes with "chef".',
        difficulty: 'Beginner',
        subject: 'Programming',
        topic: 'Functions',
        points: 10
      },
      {
        question: 'Which of these is NOT a Python data type?',
        options: [
          'int',
          'str',
          'array',
          'float'
        ],
        correctAnswer: 2,
        explanation: 'Python has int, str, float, list, dict, etc. "array" is not a built-in type (though available via numpy).',
        hint: 'Python uses a different name for sequences.',
        difficulty: 'Beginner',
        subject: 'Programming',
        topic: 'Data Types',
        points: 10
      }
    ]
  }
];

exports.getQuizzes = async (req, res) => {
  try {
    const { subject, difficulty } = req.query;
    let query = { isActive: true };
    
    if (subject) query.subject = subject;
    if (difficulty) query.difficulty = difficulty;

    const quizzes = await Quiz.find(query).select('-questions.correctAnswer -questions.explanation');
    
    res.json({
      success: true,
      count: quizzes.length,
      quizzes
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

exports.getQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Don't send correct answers to client
    const quizData = quiz.toObject();
    quizData.questions = quizData.questions.map(q => ({
      ...q,
      correctAnswer: undefined,
      explanation: undefined
    }));

    res.json({
      success: true,
      quiz: quizData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
};

exports.startQuiz = async (req, res) => {
  try {
    const { quizId } = req.body;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Create attempt record
    const attempt = new QuizAttempt({
      user: req.user.id,
      quiz: quizId,
      answers: [],
      score: 0
    });

    await attempt.save();

    res.json({
      success: true,
      attemptId: attempt._id,
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        totalQuestions: quiz.questions.length,
        questions: quiz.questions.map((q, idx) => ({
          index: idx,
          question: q.question,
          options: q.options,
          difficulty: q.difficulty,
          points: q.points
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start quiz' });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    const { attemptId, questionIndex, selectedAnswer, timeSpent } = req.body;
    
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt || attempt.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Invalid attempt' });
    }

    const quiz = await Quiz.findById(attempt.quiz);
    const question = quiz.questions[questionIndex];
    
    const isCorrect = question.correctAnswer === selectedAnswer;
    
    attempt.answers.push({
      questionIndex,
      selectedAnswer,
      isCorrect,
      timeSpent
    });

    if (isCorrect) {
      attempt.score += 1;
      attempt.totalPoints += question.points;
    }

    await attempt.save();

    res.json({
      success: true,
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      points: isCorrect ? question.points : 0,
      totalScore: attempt.score
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit answer' });
  }
};

exports.getHint = async (req, res) => {
  try {
    const { quizId, questionIndex } = req.query;
    const quiz = await Quiz.findById(quizId);
    const question = quiz.questions[questionIndex];

    // Use AI to generate contextual hint if not available
    let hint = question.hint;
    if (!hint) {
      const aiHint = await deepseekService.generateQuizHint(question.question, req.user.quizStats?.currentRank || 'Beginner');
      hint = aiHint.response;
    }

    res.json({
      success: true,
      hint,
      penalty: 2 // Points deducted for using hint
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get hint' });
  }
};

exports.completeQuiz = async (req, res) => {
  try {
    const { attemptId } = req.body;
    const attempt = await QuizAttempt.findById(attemptId).populate('quiz');
    
    if (!attempt || attempt.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Invalid attempt' });
    }

    // Calculate final rank
    const percentage = (attempt.score / attempt.quiz.questions.length) * 100;
    let rank = 'Beginner';
    if (percentage >= 90) rank = 'Expert';
    else if (percentage >= 70) rank = 'Advanced';
    else if (percentage >= 50) rank = 'Intermediate';

    attempt.rank = rank;
    await attempt.save();

    // Update user stats
    const user = await User.findById(req.user.id);
    user.quizStats.totalQuizzes += 1;
    user.quizStats.totalCorrect += attempt.score;
    user.quizStats.totalPoints += attempt.totalPoints;
    user.quizStats.currentRank = rank;
    await user.save();

    // Get leaderboard position
    const betterScores = await QuizAttempt.countDocuments({
      totalPoints: { $gt: attempt.totalPoints }
    });
    
    res.json({
      success: true,
      result: {
        score: attempt.score,
        totalQuestions: attempt.quiz.questions.length,
        percentage,
        rank,
        points: attempt.totalPoints,
        leaderboardPosition: betterScores + 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete quiz' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await User.find()
      .sort({ 'quizStats.totalPoints': -1 })
      .limit(50)
      .select('firstName lastName quizStats.totalPoints quizStats.currentRank referralCode');

    res.json({
      success: true,
      leaderboard: leaderboard.map((user, index) => ({
        rank: index + 1,
        name: `${user.firstName} ${user.lastName[0]}.`,
        points: user.quizStats.totalPoints,
        level: user.quizStats.currentRank,
        isCurrentUser: user._id.toString() === req.user.id
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

// Admin: Create quiz
exports.createQuiz = async (req, res) => {
  try {
    const quiz = new Quiz({
      ...req.body,
      createdBy: req.user.id
    });
    await quiz.save();
    res.json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create quiz' });
  }
};

// Initialize sample quizzes
exports.initializeQuizzes = async () => {
  try {
    const count = await Quiz.countDocuments();
    if (count === 0) {
      await Quiz.insertMany(sampleQuizzes);
      console.log('✅ Sample quizzes initialized');
    }
  } catch (error) {
    console.error('Quiz initialization error:', error);
  }
};
