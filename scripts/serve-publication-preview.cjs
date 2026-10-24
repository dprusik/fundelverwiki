const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const staging = path.resolve('.publication-build');
if (!fs.existsSync(staging) || fs.lstatSync(staging).isSymbolicLink() || !fs.statSync(staging).isDirectory()) throw Error('PUBLICATION_PREVIEW_NOT_FOUND');
const builds = fs.readdirSync(staging, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name.startsWith('preview-'))
  .map(entry => ({ name: entry.name, modified: fs.statSync(path.join(staging, entry.name)).mtimeMs }))
  .sort((a, b) => b.modified - a.modified);
if (!builds.length) throw Error('PUBLICATION_PREVIEW_NOT_FOUND');
const root = path.resolve(staging, builds[0].name);
if (!root.startsWith(staging + path.sep) || fs.lstatSync(root).isSymbolicLink() || !fs.existsSync(path.join(root, 'index.html')) || !fs.existsSync(path.join(root, 'robots.txt'))) throw Error('PUBLICATION_PREVIEW_INVALID');
const port = Number(process.env.PUBLICATION_PREVIEW_PORT || 8086);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('PUBLICATION_PREVIEW_INVALID_PORT');
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp'
};
const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  try {
    const parsed = new URL(request.url, 'http://127.0.0.1');
    let relative = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.lstatSync(target).isFile()) throw Error('NOT_FOUND');
    const body = fs.readFileSync(target);
    response.writeHead(200, {
      'Content-Type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
    response.end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Local non-deployable publication preview: http://127.0.0.1:${port}/ (${builds[0].name})`));
