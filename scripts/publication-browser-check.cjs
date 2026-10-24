const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { prepareLocalArticles } = require('../src/helpers/wiki/local-articles.cjs');

// Serve the generated publication artifact, using the configured 404 fallback.
// This tests the artifact locally; remote Vercel status is verified separately.
const root = path.resolve('.publication-build/production');
const config = JSON.parse(fs.readFileSync('vercel.json'));
const fallback = config.routes.at(-1);
assert.equal(fallback.src, '/(.*)');
assert.equal(fallback.status, 404);
assert.equal(fallback.dest, '/404');
assert.ok(fs.statSync(path.join(root, '404.html')).isFile(), 'Run publication:build first');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let status = 200, file;
  try {
    let route = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (route.endsWith('/')) route += 'index.html';
    file = path.resolve(root, '.' + route);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.lstatSync(file).isFile()) throw Error('NOT_FOUND');
  } catch { status = fallback.status; file = path.join(root, fallback.dest + '.html'); }
  const body = fs.readFileSync(file);
  res.writeHead(status, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : body);
});

function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(Error(`BROWSER_CHECK_FAILED:${args.join(' ')}:${code}`)));
  });
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    const env = { ...process.env, WIKI_INTEGRATION_PORT: String(port), WIKI_PREVIEW_URL: `http://127.0.0.1:${port}` };
    await run(['scripts/integration-browser-check.cjs', 'wiki-approved-browser-check.cjs'], env);
    await run(['scripts/wiki-search-browser-check.cjs', '--publication'], env);
    await run(['scripts/integration-browser-check.cjs', 'wiki-map-locations-browser-check.cjs'], env);
    await run(['scripts/integration-browser-check.cjs', 'wiki-map-mobile-browser-check.cjs'], env);
    await run(['scripts/wiki-image-performance-browser-check.cjs'], env);
    const local = prepareLocalArticles(process.cwd());
    console.log(JSON.stringify({ status: 'PUBLICATION_BROWSER_PASS', articles: local.catalog.length,
      originalAssets: local.files.length, markers: local.maps.reduce((n, item) => n + item.map.markers.length, 0) }));
  } finally { server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
