const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Load env vars
dotenv.config();

// Initialize app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Disable caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const aiRoutes = require('./routes/ai.routes');
const quizRoutes = require('./routes/quiz.routes');
const timetableRoutes = require('./routes/timetable.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const referralRoutes = require('./routes/referral.routes');

// API Routes - MUST come before static files
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/referral', referralRoutes);

// Static files - use absolute path
const frontendPath = path.join(__dirname, '../frontend');
console.log('Serving frontend from:', frontendPath);
app.use(express.static(frontendPath));

// Handle frontend routes - Express v5 syntax
app.get('/pages/*splat', (req, res) => {
    const filePath = path.join(frontendPath, req.path);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('File not found:', filePath);
            res.status(404).send('Page not found');
        }
    });
});

// Fallback for root
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 handler for API routes that don't exist
app.use('/api/*splat', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Catch-all for SPA routes - Express v5 syntax
app.get('/*splat', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Database connection
const { connectDB } = require('./config/database');

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
    try {
        await connectDB();

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}/pages/dashboard/index.html`);
            if (global.mockMode) {
                console.log('⚠️  MOCK MODE: Using in-memory data');
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = { io };
