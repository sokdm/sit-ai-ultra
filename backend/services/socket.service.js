const deepseekService = require('../ai-services/deepseek.service');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

module.exports = (io) => {
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Authenticate socket
    socket.on('authenticate', async (token) => {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user) {
          socket.userId = user._id;
          socket.userName = user.firstName;
          connectedUsers.set(socket.id, { userId: user._id, socket });
          
          // Join personal room
          socket.join(`user_${user._id}`);
          
          socket.emit('authenticated', { 
            success: true, 
            user: { name: user.firstName, id: user._id } 
          });
          
          console.log(`Socket ${socket.id} authenticated as ${user.firstName}`);
        }
      } catch (error) {
        socket.emit('authenticated', { success: false, error: 'Invalid token' });
      }
    });

    // Handle chat messages
    socket.on('chat_message', async (data) => {
      try {
        const { message, sessionId, isVoice } = data;
        
        if (!socket.userId) {
          return socket.emit('error', { message: 'Not authenticated' });
        }

        // Emit typing indicator
        socket.emit('ai_typing', { status: true });

        // Get AI response
        const result = await deepseekService.generateResponse(
          message,
          socket.userId,
          sessionId || `live-${Date.now()}`,
          socket.userName,
          isVoice
        );

        // Stop typing indicator
        socket.emit('ai_typing', { status: false });

        if (result.success) {
          socket.emit('ai_response', {
            response: result.response,
            sessionId: result.sessionId,
            timestamp: new Date(),
            isVoice: isVoice
          });

          // Broadcast to user's other devices
          socket.to(`user_${socket.userId}`).emit('sync_message', {
            message,
            response: result.response,
            sessionId: result.sessionId
          });
        } else {
          socket.emit('error', { message: result.error });
        }

      } catch (error) {
        console.error('Socket chat error:', error);
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    // Voice message handling
    socket.on('voice_message', async (data) => {
      try {
        const { audioData, sessionId } = data;
        
        // Convert voice to text (placeholder - integrate speech-to-text)
        // For now, treat as text message
        socket.emit('voice_received', { status: 'processing' });
        
        // Process through AI
        socket.emit('chat_message', { 
          message: '[Voice message]', 
          sessionId,
          isVoice: true 
        });
        
      } catch (error) {
        socket.emit('error', { message: 'Voice processing failed' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      connectedUsers.delete(socket.id);
    });
  });

  // Helper to emit to specific user
  global.emitToUser = (userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data);
  };
};
