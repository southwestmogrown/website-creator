#!/usr/bin/env node
/**
 * Live-reload static server for generated output
 * Usage: node scripts/serve.js <directory> [port]
 *
 * Injects a WebSocket-based live-reload snippet into HTML responses.
 * Watches the directory for file changes and pushes reload to all connected clients.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');

const dir = path.resolve(process.argv[2] || './output/current');
const port = parseInt(process.argv[3] || '3000', 10);

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const RELOAD_SCRIPT = `
<script>
(function(){
  var ws = new WebSocket('ws://'+location.host+'/__reload');
  ws.onmessage = function(){ location.reload(); };
  ws.onclose = function(){ setTimeout(function(){ location.reload(); }, 1000); };
})();
</script>`;

const server = http.createServer((req, res) => {
  let filePath = path.join(dir, req.url === '/' ? 'index.html' : req.url);

  // prevent directory traversal
  if (!filePath.startsWith(dir)) {
    res.writeHead(403); res.end(); return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404); res.end('Not found'); return;
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');

  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  try {
    let content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });

    if (mime === 'text/html') {
      content = content.toString().replace('</body>', RELOAD_SCRIPT + '</body>');
      res.end(content);
    } else {
      res.end(content);
    }
  } catch {
    res.writeHead(500); res.end('Server error');
  }
});

const wss = new WebSocketServer({ server, path: '/__reload' });
const clients = new Set();
wss.on('connection', ws => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast() {
  for (const client of clients) {
    if (client.readyState === 1) client.send('reload');
  }
}

chokidar.watch(dir, { ignoreInitial: true }).on('all', broadcast);

server.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
