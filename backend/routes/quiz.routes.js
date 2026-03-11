const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');
const { protect } = require('../middleware/auth');

router.get('/', protect, quizController.getQuizzes);
router.get('/leaderboard', protect, quizController.getLeaderboard);
router.get('/:id', protect, quizController.getQuiz);
router.post('/start', protect, quizController.startQuiz);
router.post('/answer', protect, quizController.submitAnswer);
router.get('/hint', protect, quizController.getHint);
router.post('/complete', protect, quizController.completeQuiz);
router.post('/create', protect, quizController.createQuiz);

module.exports = router;
