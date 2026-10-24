// Isolated visual-preview server. Does not build or touch publication tooling.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve('.wiki-preview');
const port = Number(process.env.WIKI_THEME_PORT || 8083);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid preview port');
http.createServer((request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const target = path.resolve(root, '.' + pathname);
    const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' };
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
      response.writeHead(404, { ...headers, 'Content-Type': mime['.html'] });
      response.end(fs.readFileSync(path.join(root, '404.html'))); return;
    }
    response.writeHead(200, { ...headers, 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' });
    response.end(fs.readFileSync(target));
  } catch { response.writeHead(400); response.end('Bad request'); }
}).listen(port, '127.0.0.1', () => console.log(`Dark Archive: http://127.0.0.1:${port}/`));
