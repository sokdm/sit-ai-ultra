#!/bin/bash
echo "🚀 Starting SIT AI Ultra Server..."
echo "📱 Make sure you have:"
echo "   1. MongoDB Atlas URI configured in .env"
echo "   2. Gmail App Password set"
echo "   3. DeepSeek API key added"
echo "   4. Flutterwave keys configured"
echo ""
echo "Server will start on http://0.0.0.0:3000"
echo "Press Ctrl+C to stop"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start with nodemon for development, node for production
if command -v npx &> /dev/null; then
    npx nodemon server.js
else
    node server.js
fi
