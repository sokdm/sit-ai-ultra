#!/bin/bash
echo "🛑 Stopping SIT AI Ultra..."
pkill -f "unified-server.js" 2>/dev/null
pkill node 2>/dev/null
rm -f unified-server.js
echo "✅ Stopped"
