const deepseekService = require('../ai-services/deepseek.service');
const Conversation = require('../models/Conversation');

exports.chat = async (req, res) => {
  try {
    const { message, sessionId, isVoice } = req.body;
    const user = req.user;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate AI response
    const result = await deepseekService.generateResponse(
      message,
      user._id,
      sessionId || `session-${Date.now()}`,
      user.firstName,
      isVoice
    );

    if (!result.success) {
      return res.status(503).json({ error: result.error });
    }

    res.json({
      success: true,
      response: result.response,
      sessionId: result.sessionId,
      tokensUsed: result.tokensUsed,
      processingTime: result.processingTime
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ user: req.user.id })
      .sort({ lastMessageAt: -1 })
      .limit(20)
      .select('sessionId subject title lastMessageAt totalMessages');

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const conversation = await Conversation.findOne({
      user: req.user.id,
      sessionId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
};

exports.generateImage = async (req, res) => {
  try {
    const { description, subject } = req.body;
    
    const imagePrompt = await deepseekService.generateImagePrompt(description, subject);
    
    res.json({
      success: true,
      prompt: imagePrompt,
      note: 'Use this prompt with an image generation API like DALL-E, Midjourney, or Stable Diffusion'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate image prompt' });
  }
};

exports.analyzeImage = async (req, res) => {
  try {
    const { imageBase64, question } = req.body;
    
    const analysis = await deepseekService.analyzeImage(imageBase64, question, req.user.id);
    
    res.json({
      success: true,
      analysis: analysis.response
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze image' });
  }
};
