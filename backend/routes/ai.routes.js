const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth');

router.post('/chat', protect, aiController.chat);
router.get('/conversations', protect, aiController.getConversations);
router.get('/conversation/:sessionId', protect, aiController.getConversation);
router.post('/generate-image', protect, aiController.generateImage);
router.post('/analyze-image', protect, aiController.analyzeImage);

module.exports = router;
