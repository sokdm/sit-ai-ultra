const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const FRONTEND_DIR = path.join(__dirname, 'frontend');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toLocaleTimeString()} - ${req.url}`);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    let filePath = path.join(FRONTEND_DIR, req.url === '/' ? 'index.html' : req.url);
    
    if (req.url.startsWith('/pages/')) {
        filePath = path.join(FRONTEND_DIR, req.url);
    }
    
    if (req.url.startsWith('/api/')) {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: req.url,
            method: req.method,
            headers: req.headers
        };
        const proxy = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });
        proxy.on('error', () => {
            res.writeHead(502);
            res.end('{"error":"Backend not available"}');
        });
        req.pipe(proxy);
        return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Frontend running at http://localhost:${PORT}`);
});
