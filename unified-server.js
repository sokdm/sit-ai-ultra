const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3000;
const BACKEND_PORT = 5000;
const FRONTEND_DIR = path.join(__dirname, 'frontend');

// Start backend as child process
const backend = spawn('node', ['server.js'], { 
    cwd: path.join(__dirname, 'backend'),
    env: { ...process.env, PORT: BACKEND_PORT }
});

backend.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
});

backend.stderr.on('data', (data) => {
    console.error(`[Backend] ${data.toString().trim()}`);
});

// Wait for backend to start
setTimeout(() => {
    console.log(`[Proxy] Starting on port ${PORT}`);
}, 2000);

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

// Create proxy server
const server = http.createServer((req, res) => {
    console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API routes go to backend
    if (req.url.startsWith('/api/') || req.url.startsWith('/auth/')) {
        const options = {
            hostname: 'localhost',
            port: BACKEND_PORT,
            path: req.url,
            method: req.method,
            headers: req.headers
        };

        const proxy = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxy.on('error', (err) => {
            console.error('[Proxy] Backend error:', err.message);
            res.writeHead(503);
            res.end(JSON.stringify({ error: 'Backend not ready', message: err.message }));
        });

        req.pipe(proxy);
        return;
    }

    // Static files from frontend
    let filePath = path.join(FRONTEND_DIR, req.url === '/' ? 'index.html' : req.url);
    
    if (req.url.startsWith('/pages/')) {
        filePath = path.join(FRONTEND_DIR, req.url);
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Try index.html for SPA routes
                fs.readFile(path.join(FRONTEND_DIR, 'index.html'), (err, content) => {
                    if (err) {
                        res.writeHead(404);
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content);
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('==========================================');
    console.log('🎉 SIT AI Ultra is running!');
    console.log('');
    console.log(`🌐 Unified Server: http://localhost:${PORT}`);
    console.log('');
    console.log('📱 All routes available on single port:');
    console.log('   - Frontend:  http://localhost:3000/');
    console.log('   - Dashboard: http://localhost:3000/pages/dashboard/');
    console.log('   - AI Tutor:  http://localhost:3000/pages/dashboard/ai-tutor.html');
    console.log('   - Quizzes:   http://localhost:3000/pages/dashboard/quiz.html');
    console.log('   - API:       http://localhost:3000/api/...');
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('==========================================');
});

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    backend.kill();
    server.close();
    process.exit(0);
});
