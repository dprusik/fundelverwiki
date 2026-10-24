const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createReview, ReviewError } = require('../src/helpers/wiki/review.cjs');
const { reviewedMap, reviewedMapImage } = require('../src/helpers/wiki/legacy-map-review.cjs');
const { LegacyMapError } = require('../src/helpers/wiki/legacy-map.cjs');

function createReviewServer(root, options = {}) {
  const review = createReview(root, options);
  const csrf = crypto.randomBytes(32).toString('hex');
  const previews = new Map();
  const staticRoot = path.join(__dirname, '../tools/publication-review');
  const headers = {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  };
  const server = http.createServer(async (req, res) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const json = (status, data) => { res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin) || (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site']))) return json(403, { error: 'LOCAL_ONLY' });
      const url = new URL(req.url, origin);
      if (req.method === 'GET') {
        if (url.pathname.startsWith('/api/map-image/')) {
          const blob = reviewedMapImage(root, review, url.pathname.slice('/api/map-image/'.length));
          res.writeHead(200, { ...headers, 'Content-Type': blob.type }); return res.end(blob.bytes);
        }
        if (url.pathname.startsWith('/api/map/')) {
          const key = url.pathname.slice('/api/map/'.length);
          const { result, entry } = reviewedMap(root, review, key);
          const item = review.item(key);
          if (item.sha256 !== entry.sha256) throw new ReviewError('SOURCE_CHANGED_REFRESH');
          const token = crypto.randomBytes(24).toString('hex');
          previews.set(token, { key, sha256: item.sha256, revision: item.revision, map: true });
          return json(200, { review_only: true, title: entry.title, unresolved_links: result.unresolved.length, link_policy: entry.legacy_map?.link_policy || 'require_approved', policy_review: { key, sha256: item.sha256, expected_revision: item.revision, review_token: token }, map: { ...result.map, image: { ...result.map.image, src: '/api/map-image/' + key } } });
        }
        if (url.pathname === '/api/session') return json(200, { csrf, local_store: review.storePath });
        if (url.pathname === '/api/items') return json(200, review.list());
        if (url.pathname === '/api/online') {
          const current = path.join(review.storePath, 'online');
          // Preserve access to the initial read-only public comparison; never move/delete it.
          const directory = fs.existsSync(current) ? current : path.join(root, '.publication-review/online');
          if (!fs.existsSync(directory)) return json(200, { available: false });
          const files = fs.readdirSync(directory).filter(name => /^[a-f0-9-]+\.json$/.test(name)).map(name => ({ name, time: fs.statSync(path.join(directory, name)).mtimeMs })).sort((a, b) => a.time - b.time);
          return json(200, files.length ? { available: true, ...JSON.parse(fs.readFileSync(path.join(directory, files.at(-1).name), 'utf8')) } : { available: false });
        }
        if (url.pathname.startsWith('/api/item/')) {
          const item = review.item(url.pathname.slice('/api/item/'.length));
          const token = crypto.randomBytes(24).toString('hex');
          previews.set(token, { key: item.key, sha256: item.sha256, revision: item.revision });
          return json(200, { ...item, review_token: token });
        }
        if (url.pathname.startsWith('/api/blob/')) {
          const blob = review.blob(url.pathname.slice('/api/blob/'.length), url.searchParams.get('baseline'));
          const images = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
          res.writeHead(200, { ...headers, 'Content-Type': images[blob.extension] || 'application/octet-stream', ...(!images[blob.extension] ? { 'Content-Disposition': 'attachment; filename="local-review.bin"' } : {}) });
          return res.end(blob.bytes);
        }
        const files = { '/': ['index.html', 'text/html'], '/review.js': ['review.js', 'text/javascript'], '/review.css': ['review.css', 'text/css'], '/map-review/': ['map.html', 'text/html'], '/map.js': ['map.js', 'text/javascript'], '/map.css': ['map.css', 'text/css'] };
        if (files[url.pathname]) {
          const [file, type] = files[url.pathname];
          res.writeHead(200, { ...headers, 'Content-Type': type + '; charset=utf-8' }); return res.end(fs.readFileSync(path.join(staticRoot, file)));
        }
        return json(404, { error: 'NOT_FOUND' });
      }
      if (req.method !== 'POST' || req.headers.origin !== origin || req.headers['x-review-token'] !== csrf || req.headers['content-type'] !== 'application/json') return json(403, { error: 'EXPLICIT_LOCAL_REQUEST_REQUIRED' });
      let text = '';
      for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > 128000) throw new ReviewError('REQUEST_TOO_LARGE'); }
      const body = JSON.parse(text);
      if (url.pathname === '/api/map-policy') {
        const preview = previews.get(body.review_token);
        if (!preview?.map || preview.key !== body.key || preview.sha256 !== body.sha256 || preview.revision !== body.expected_revision) throw new ReviewError('OPEN_MAP_BEFORE_POLICY_DECISION');
        if (body.confirm !== true || body.link_policy !== 'omit_unresolved') throw new ReviewError('EXPLICIT_MAP_POLICY_REQUIRED');
        const item = review.item(body.key);
        if (item.state !== 'approved' || item.sha256 !== body.sha256 || item.revision !== body.expected_revision) throw new ReviewError('SOURCE_OR_DECISION_CHANGED_REFRESH');
        reviewedMap(root, review, body.key); // Recheck the map and approved background.
        const result = review.decide([{ key: item.key, sha256: item.sha256, expected_revision: item.revision, scope: 'content', decision: 'approved', confirm_review: true, confirm_supersede: true, metadata: { ...item.metadata, legacy_map: { approved: true, link_policy: 'omit_unresolved' } } }]);
        previews.delete(body.review_token);
        // A failed export must not mask an already saved decision.
        let proposal;
        try { proposal = review.exportProposal(); } catch { return json(200, { saved: result.saved, export_error: 'PROPOSAL_EXPORT_FAILED' }); }
        return json(200, { saved: result.saved, proposal });
      }
      if (url.pathname === '/api/decide') {
        if (!Array.isArray(body.items) || !body.items.length) throw new ReviewError('INVALID_BATCH');
        for (const item of body.items) {
          const preview = previews.get(item.review_token);
          if (!preview || preview.key !== item.key || preview.sha256 !== item.sha256 || preview.revision !== item.expected_revision) throw new ReviewError('OPEN_PREVIEW_BEFORE_DECISION');
        }
        const result = review.decide(body.items);
        body.items.forEach(item => previews.delete(item.review_token));
        return json(200, result);
      }
      if (url.pathname === '/api/export') {
        if (body.confirm !== true) throw new ReviewError('EXPLICIT_EXPORT_REQUIRED');
        return json(200, review.exportProposal());
      }
      return json(404, { error: 'NOT_FOUND' });
    } catch (error) {
      // OS errors can contain private paths/body; expose only actionable fixed codes.
      const storageError = ['EACCES', 'EPERM', 'EROFS'].includes(error.code) ? 'REVIEW_STORE_WRITE_DENIED' : error.code === 'ENOSPC' ? 'REVIEW_STORE_FULL' : null;
      json(error instanceof ReviewError || error instanceof LegacyMapError ? 409 : storageError ? 503 : 400, { error: error instanceof ReviewError || error instanceof LegacyMapError ? error.code : storageError || 'LOCAL_REVIEW_ERROR' });
    }
  });
  return server;
}
if (require.main === module) {
  const server = createReviewServer(process.cwd());
  server.listen(8082, '127.0.0.1', () => console.log('Przegląd DM: http://127.0.0.1:8082 — wyłącznie lokalnie; decyzje nigdy nie są automatyczne.'));
  server.on('error', () => { console.error('LOCAL_REVIEW_PORT_UNAVAILABLE (8082)'); process.exitCode = 1; });
}
module.exports = { createReviewServer };
