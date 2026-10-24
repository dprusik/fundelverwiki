const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { expectedOutputFiles, routeFile, assetFile, validateOutputDirectory } = require('../../src/helpers/wiki/production-output.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-production-output-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function write(root, file, contents = '') {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}
function cleanModel() {
  const model = {
    sections: [{ id: 'characters' }],
    catalog: [{ id: 'approved-one', url: '/known/', title: 'Known', category: 'characters', kind: 'character', aliases: [], body: '', summary: '' }],
    maps: [], assets: [{ url: '/img/approved/picture.png', sha256: crypto.createHash('sha256').update('static').digest('hex') }], relations: [], siteOrigin: 'https://example.test', runtimeHashes: Object.fromEntries(['assets/wiki.css', 'assets/wiki.js', 'assets/search.mjs'].map(file => [file, crypto.createHash('sha256').update('static').digest('hex')]))
  };
  model.search = { schema_version: 1, demonstration: false, entries: [{ id: 'approved-one', url: '/known/', title: 'Known', category: 'characters', aliases: [], body: '', summary: '' }] };
  model.graph = { schema_version: 1, nodes: [{ id: 'approved-one', url: '/known/', title: 'Known', category: 'characters', kind: 'character' }], edges: [] };
  return model;
}
function populateValidOutput(root, model) {
  for (const file of expectedOutputFiles(model)) {
    if (file.endsWith('.html')) write(root, file, '<!doctype html><html><head><meta name="robots" content="noindex,nofollow"></head><body></body></html>');
    else if (file === 'approved-search.json') write(root, file, JSON.stringify(model.search));
    else if (file === 'graph.json') write(root, file, JSON.stringify(model.graph));
    else if (file === 'sitemap.xml') write(root, file, '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ['/', '/approved/', '/organizations/', '/catalog/characters/', '/known/'].sort().map(url => `<url><loc>https://example.test${url}</loc></url>`).join('') + '</urlset>\n');
    else if (file === 'feed.xml') write(root, file, '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Wiki kampanii</title><link>https://example.test</link><description>Jawnie zatwierdzone publikacje kampanii</description></channel></rss>\n');
    else if (file === 'robots.txt') write(root, file, 'User-agent: *\nDisallow: /\n');
    else write(root, file, 'static');
  }
}
function switchFixtureToProduction(root, model) {
  for (const rawFile of fs.readdirSync(root, { recursive: true }).filter(name => name.endsWith('.html'))) {
    const file = rawFile.replaceAll('\\', '/');
    const route = file === 'index.html' ? '/' : file === '404.html' ? '/404.html' : file.endsWith('/index.html') ? `/${file.slice(0, -'index.html'.length)}` : `/${file}`;
    const target = path.join(root, rawFile);
    const html = fs.readFileSync(target, 'utf8').replace('<meta name="robots" content="noindex,nofollow">', `<link rel="canonical" href="${model.siteOrigin}${route}">`);
    fs.writeFileSync(target, html);
  }
  write(root, 'robots.txt', `User-agent: *\nAllow: /\nSitemap: ${model.siteOrigin}/sitemap.xml\n`);
}

test('production routes and approved assets map to safe output paths', () => {
  assert.equal(routeFile('/'), 'index.html');
  assert.equal(routeFile('/known/'), 'known/index.html');
  assert.equal(routeFile('/404.html'), '404.html');
  assert.equal(assetFile('/img/approved/map%20one.png'), 'img/approved/map one.png');
  assert.throws(() => routeFile('/../../private/'), /INVALID_PUBLIC_ROUTE/);
  assert.throws(() => assetFile('/img/%2e%2e/private.png'), /INVALID_PUBLIC_ASSET_URL/);
});

test('output validator accepts only a complete approved projection and rejects extra routes', t => {
  const root = fixture(t), model = cleanModel();
  populateValidOutput(root, model);
  assert.deepEqual(validateOutputDirectory(root, model), { files: expectedOutputFiles(model).size, routes: 5, searchEntries: 1, graphNodes: 1, feedEntries: 0 });
  write(root, 'pending-secret/index.html', 'PENDING_CANARY');
  assert.throws(() => validateOutputDirectory(root, model), /OUTPUT_FILESET_MISMATCH/);
});

test('production output requires canonical URLs and indexable robots policy', t => {
  const root = fixture(t), model = cleanModel();
  populateValidOutput(root, model);
  switchFixtureToProduction(root, model);
  assert.deepEqual(validateOutputDirectory(root, model, { mode: 'production' }), { files: expectedOutputFiles(model).size, routes: 5, searchEntries: 1, graphNodes: 1, feedEntries: 0 });
  write(root, 'known/index.html', '<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="https://example.test/known/"></head><body></body></html>');
  assert.throws(() => validateOutputDirectory(root, model, { mode: 'production' }), /PRODUCTION_ROBOTS_INVALID/);
});

test('production output rejects missing or noncanonical route URLs', t => {
  const root = fixture(t), model = cleanModel();
  populateValidOutput(root, model);
  switchFixtureToProduction(root, model);
  write(root, 'known/index.html', '<!doctype html><html><head><link rel="canonical" href="https://attacker.test/known/"></head><body></body></html>');
  assert.throws(() => validateOutputDirectory(root, model, { mode: 'production' }), /PRODUCTION_CANONICAL_MISMATCH/);
});

test('output validator rejects broken local links even when the file set is otherwise allowed', t => {
  const root = fixture(t), model = cleanModel();
  populateValidOutput(root, model);
  write(root, 'known/index.html', '<!doctype html><html><head><meta name="robots" content="noindex,nofollow"></head><body><a href="/pending/">hidden</a></body></html>');
  assert.throws(() => validateOutputDirectory(root, model), /OUTPUT_BROKEN_LOCAL_REFERENCE/);
});

test('output validator verifies approved asset bytes against the reviewed model hash', t => {
  const root = fixture(t), model = cleanModel();
  populateValidOutput(root, model);
  fs.writeFileSync(path.join(root, 'img/approved/picture.png'), 'tampered');
  assert.throws(() => validateOutputDirectory(root, model), /OUTPUT_APPROVED_ASSET_HASH_MISMATCH/);
});

test('output validator rejects runtime files changed after the build model was captured', t => {
  const root = fixture(t), model = cleanModel();
  populateValidOutput(root, model);
  fs.writeFileSync(path.join(root, 'assets/wiki.js'), 'changed runtime');
  assert.throws(() => validateOutputDirectory(root, model), /OUTPUT_RUNTIME_HASH_MISMATCH/);
});

test('output validator rejects sitemap URLs outside the allowlisted canonical origin', t => {
  const root = fixture(t), model = cleanModel();
  populateValidOutput(root, model);
  write(root, 'sitemap.xml', '<?xml version="1.0"?><urlset>' + ['/', '/approved/', '/organizations/', '/catalog/characters/', '/known/'].map(url => `<url><loc>https://attacker.test${url}</loc></url>`).join('') + '</urlset>');
  assert.throws(() => validateOutputDirectory(root, model), /OUTPUT_EXTERNAL_CANONICAL_URL/);
});

test('output validator checks responsive image and stylesheet references', t => {
  const root = fixture(t), model = cleanModel();
  populateValidOutput(root, model);
  write(root, 'known/index.html', '<!doctype html><html><head><meta name="robots" content="noindex,nofollow"></head><body><img srcset="/img/approved/picture.png 1x, /pending.png 2x"></body></html>');
  assert.throws(() => validateOutputDirectory(root, model), /OUTPUT_BROKEN_LOCAL_REFERENCE/);
  write(root, 'known/index.html', '<!doctype html><html><head><meta name="robots" content="noindex,nofollow"></head><body></body></html>');
  const css = 'body{background:url(https://attacker.test/x.png)}';
  write(root, 'assets/wiki.css', css);
  model.runtimeHashes['assets/wiki.css'] = crypto.createHash('sha256').update(css).digest('hex');
  assert.throws(() => validateOutputDirectory(root, model), /OUTPUT_EXTERNAL_ASSET_REFERENCE/);
});

test('output validator rejects external executable and media resources but allows external HTTPS links', t => {
  const root = fixture(t), model = cleanModel();
  populateValidOutput(root, model);
  write(root, 'known/index.html', '<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><script src="https://attacker.test/x.js"></script></head><body><a href="https://example.org/info">External source</a></body></html>');
  assert.throws(() => validateOutputDirectory(root, model), /OUTPUT_EXTERNAL_ASSET_REFERENCE/);
});

test('output validator rejects form exfiltration and meta refresh', t => {
  const root = fixture(t), model = cleanModel();
  populateValidOutput(root, model);
  write(root, 'known/index.html', '<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=https://attacker.test/"></head><body></body></html>');
  assert.throws(() => validateOutputDirectory(root, model), /OUTPUT_ACTIVE_HTML_FORBIDDEN/);
  write(root, 'known/index.html', '<!doctype html><html><head><meta name="robots" content="noindex,nofollow"></head><body><form action="https://attacker.test/collect"></form></body></html>');
  assert.throws(() => validateOutputDirectory(root, model), /OUTPUT_EXTERNAL_ASSET_REFERENCE/);
});

test('output validator binds RSS bytes to approved DTOs, not only route paths', t => {
  const root = fixture(t), model = cleanModel();
  populateValidOutput(root, model);
  write(root, 'feed.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Wiki kampanii</title><link>https://example.test</link><description>Jawnie zatwierdzone publikacje kampanii</description><item><title>PENDING_CANARY</title></item></channel></rss>\n');
  assert.throws(() => validateOutputDirectory(root, model), /OUTPUT_FEED_MISMATCH/);
});
