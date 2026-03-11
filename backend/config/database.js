const mongoose = require('mongoose');

// Mock storage for testing
const mockUsers = new Map();

const connectDB = async () => {
  console.log('🔄 Connecting to MongoDB...');
  
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.log('⚠️  No MongoDB URI found in .env');
      console.log('🔄 Running in MOCK mode');
      global.mockMode = true;
      return;
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    global.mockMode = false;
    
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

  } catch (error) {
    console.error(`❌ MongoDB Failed: ${error.message}`);
    console.log('🔄 Running in MOCK mode for testing');
    global.mockMode = true;
  }
};

module.exports = { connectDB, mockUsers };
