import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, sep, extname } from 'node:path';
import * as sass from 'sass';
import localArticles from '../src/helpers/wiki/local-articles.cjs';

// This directory is owned solely by the isolated local preview. Withdrawal removes old outputs.
const root = localArticles.resetPreviewOutput(process.cwd());
mkdirSync(resolve(root, 'assets'), { recursive: true });
writeFileSync(resolve(root, 'assets/wiki.css'), sass.compile('src/wiki-ui/wiki.scss', { style: 'expanded' }).css);
const result = spawnSync(process.execPath, ['node_modules/@11ty/eleventy/cmd.cjs', '--config=wiki-preview.config.cjs'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
if (!process.argv.includes('--serve')) process.exit(0);

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
createServer((request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const target = resolve(root, '.' + pathname);
    if (!target.startsWith(root + sep) || !existsSync(target)) {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(readFileSync(resolve(root, '404.html'))); return;
    }
    response.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
    response.end(readFileSync(target));
  } catch { response.writeHead(400); response.end('Bad request'); }
}).listen(8081, '127.0.0.1', () => console.log('Wiki DEMO: http://127.0.0.1:8081 — Ctrl+C to stop. Re-run after edits.'));
