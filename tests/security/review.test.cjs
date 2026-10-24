const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createReview, lineDiff } = require('../../src/helpers/wiki/review.cjs');
const { createReviewServer } = require('../../scripts/publication-review.cjs');
const { compareOnline } = require('../../src/helpers/wiki/online-comparison.cjs');
const { scanRepository, sha } = require('../../src/helpers/wiki/publication.cjs');
const SECRET = 'FICTIONAL_LOCAL_ONLY_DM_CANARY_82';
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-review-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), text); };
  write('src/site/notes/example.md', '---\n{"dg-publish":true,"permalink":"/example/"}\n---\nPublic prose. ![Photo](/img/picture.png)\n' + SECRET);
  write('src/site/img/picture.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
  write('src/site/_data/example.js', `throw Error('${SECRET}');`);
  for (const [name, key] of [['public-entries', 'entries'], ['public-assets', 'assets'], ['public-system', 'inputs'], ['public-relations', 'relations'], ['publication-decisions', 'decisions']]) write(`src/wiki/${name}.json`, JSON.stringify({ schema_version: 1, [key]: [] }));
  const review = createReview(root, { store: path.join(root, '.publication-review') });
  function request(item, decision = 'approved') {
    return { key: item.key, sha256: item.sha256, expected_revision: item.revision, scope: item.scope, decision, confirm_review: true, confirm_supersede: true,
      metadata: item.kind === 'entry' ? { id: 'stable-example', title: 'Example', category: 'characters', kind: 'character' } : item.kind === 'asset' ? { id: 'stable-photo', alt: 'Photo' } : {} };
  }
  return { root, write, review, request };
}
test('local list shows readable paths and dependencies, but records nothing automatically', t => {
  const f = fixture(t);
  const rows = f.review.list(); assert.equal(rows.length, 3);
  assert.ok(rows.every(item => item.state === 'pending'));
  const note = f.review.item(rows.find(item => item.kind === 'entry').key);
  assert.ok(note.text.includes(SECRET)); // Local preview deliberately exposes it ONLY to the DM.
  assert.equal(note.dependencies[0].source, 'src/site/img/picture.png');
  assert.equal(note.scope, 'content');
  assert.equal(rows.find(item => item.kind === 'system').scope, 'technical');
  assert.equal(fs.existsSync(path.join(f.root, '.publication-review')), false);
});

test('empty export fails explicitly and creates no misleading proposal file', t => {
  const f = fixture(t);
  assert.throws(() => f.review.exportProposal(), /NO_CURRENT_DECISIONS_TO_EXPORT/);
  assert.equal(fs.existsSync(path.join(f.root, '.publication-review')), false);
});
test('reviews are scoped, append-only, and active registry decisions are never overwritten', t => {
  const f = fixture(t); const key = f.review.list().find(item => item.kind === 'entry').key;
  const before = fs.readFileSync(path.join(f.root, 'src/wiki/public-entries.json'));
  const first = f.review.item(key);
  assert.throws(() => f.review.decide([{ ...f.request(first), scope: 'technical' }]), /EXPLICIT_SCOPED/);
  f.review.decide([f.request(first)]);
  const second = f.review.item(key);
  assert.throws(() => f.review.decide([{ ...f.request(second, 'denied'), confirm_supersede: false }]), /SUPERSESSION/);
  f.review.decide([f.request(second, 'denied')]);
  assert.equal(f.review.events().length, 2);
  assert.equal(f.review.events()[0].decision, 'approved');
  assert.equal(f.review.events()[1].supersedes, f.review.events()[0].id);
  assert.equal(f.review.item(key).state, 'denied');
  assert.deepEqual(fs.readFileSync(path.join(f.root, 'src/wiki/public-entries.json')), before);
  const result = f.review.exportProposal(); assert.equal(result.exported, 1);
  assert.equal(fs.existsSync(path.join(f.root, result.local_file)), true);
});
test('changed dependencies need their own review without revoking an unchanged note', t => {
  const f = fixture(t); const rows = f.review.list();
  const noteKey = rows.find(item => item.kind === 'entry').key, imageKey = rows.find(item => item.kind === 'asset').key;
  f.review.decide([f.request(f.review.item(noteKey)), f.request(f.review.item(imageKey))]);
  f.write('src/site/img/picture.png', 'CHANGED_SYNTHETIC_IMAGE');
  assert.equal(f.review.item(noteKey).state, 'approved');
  assert.equal(f.review.item(imageKey).state, 'changed');
  assert.deepEqual(f.review.item(noteKey).dependency_changes.changed, [imageKey]);
  assert.ok(f.review.item(noteKey).dependency_attention.includes(imageKey));
  const previous = f.review.events().find(event => event.key === imageKey).snapshot;
  assert.notDeepEqual(f.review.blob(imageKey).bytes, f.review.blob(imageKey, previous).bytes);
  assert.throws(() => f.review.blob(imageKey, 'a'.repeat(64)), /UNKNOWN_SNAPSHOT/);
});
test('batch validation writes no decisions when any selected item has not been reviewed correctly', t => {
  const f = fixture(t), rows = f.review.list();
  const first = f.review.item(rows.find(item => item.kind === 'entry').key);
  const second = f.review.item(rows.find(item => item.kind === 'system').key);
  assert.throws(() => f.review.decide([f.request(first), { ...f.request(second), confirm_review: false }]), /EXPLICIT_SCOPED/);
  assert.equal(f.review.events().length, 0);
});
test('external denial stays intact and explicit supersession archives the previous external decision', t => {
  const f = fixture(t), row = f.review.list().find(item => item.kind === 'entry');
  const registry = path.join(f.root, 'src/wiki/publication-decisions.json');
  fs.writeFileSync(registry, JSON.stringify({ schema_version: 1, decisions: [{ key: row.key, state: 'denied' }] }));
  const bytes = fs.readFileSync(registry);
  const item = f.review.item(row.key); assert.equal(item.state, 'denied');
  assert.throws(() => f.review.decide([{ ...f.request(item), confirm_supersede: false }]), /SUPERSESSION/);
  f.review.decide([f.request(item)]);
  assert.deepEqual(fs.readFileSync(registry), bytes);
  assert.equal(f.review.events()[0].previous_external_decision.decision, 'denied');
});
test('diff and optimistic concurrency require rereview of changed bytes and decisions', t => {
  const f = fixture(t); const key = f.review.list().find(item => item.kind === 'entry').key;
  const first = f.review.item(key); f.review.decide([f.request(first)]);
  assert.throws(() => f.review.decide([f.request(first)]), /DECISION_CHANGED/);
  const beforeChange = f.review.item(key);
  f.write('src/site/notes/example.md', '---\n{"dg-publish":true,"permalink":"/example/"}\n---\nNew text');
  assert.throws(() => f.review.decide([f.request(beforeChange)]), /SOURCE_CHANGED/);
  const current = f.review.item(key);
  assert.equal(current.state, 'changed');
  assert.ok(current.diff.lines.some(line => line.op === 'remove' && line.text.includes(SECRET)));
  assert.ok(current.diff.lines.some(line => line.op === 'add' && line.text === 'New text'));
  f.review.decide([f.request(current)]);
  assert.equal(f.review.events().length, 2);
  assert.equal(f.review.item(key).state, 'approved');
  assert.equal(lineDiff('a\nb', 'a\nc').lines.filter(line => line.op === 'same').length, 1);
});
test('local HTTP review rejects cross-origin, rebinding, missing CSRF and unopened batch items', async t => {
  const f = fixture(t); const server = createReviewServer(f.root, { store: path.join(f.root, '.publication-review') });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const session = await fetch(base + '/api/session').then(r => r.json());
  assert.equal((await fetch(base + '/api/items', { headers: { Origin: 'https://untrusted.invalid' } })).status, 403);
  const rebound = await new Promise(resolve => require('node:http').get(base + '/', { headers: { Host: 'rebind.invalid' } }, response => { response.resume(); resolve(response.statusCode); }));
  assert.equal(rebound, 403);
  const rows = await fetch(base + '/api/items').then(r => r.json());
  const key = rows.find(item => item.kind === 'entry').key;
  const item = await fetch(base + '/api/item/' + key).then(r => r.json());
  const post = (payload, token = session.csrf) => fetch(base + '/api/decide', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', 'X-Review-Token': token }, body: JSON.stringify(payload) });
  assert.equal((await post({ items: [f.request(item)] }, 'wrong')).status, 403);
  assert.equal((await post({ items: [f.request(item)] })).status, 409);
  assert.equal((await post({ items: [{ ...f.request(item), review_token: item.review_token }] })).status, 200);
  assert.equal(f.review.events().length, 1);
  const html = await fetch(base + '/').then(r => r.text());
  assert.ok(!html.includes(SECRET));
});
test('online comparison never probes private local-only paths or infers publication consent', async t => {
  const f = fixture(t); f.write('src/site/notes/' + SECRET + '.md', `---\n{"dg-publish":true,"permalink":"/${SECRET}/"}\n---\nPrivate`);
  const calls = [];
  const remote = async route => {
    calls.push(route);
    const text = route === '/' ? '<main>Home</main><a href="/example/">Example</a>' : route === '/sitemap.xml' ? '<urlset><url><loc>https://fundelverwiki.vercel.app/example/</loc></url></urlset>' : route === '/searchIndex.json' ? '[{"url":"/example/"}]' : route === '/graph.json' ? '{}' : route === '/example/' ? '<main>Public</main><img src="/img/picture.png">' : '';
    return { status: route === '/feed.xml' ? 404 : 200, text, type: 'text/html', bytes: route === '/img/picture.png' ? fs.readFileSync(path.join(f.root, 'src/site/img/picture.png')) : Buffer.from(text) };
  };
  const result = await compareOnline(scanRepository(f.root), remote, () => '<main>Public</main>');
  assert.ok(!calls.some(route => route.includes(SECRET)));
  assert.ok(!JSON.stringify(result.redacted).includes(SECRET));
  assert.equal(result.redacted.approval_inferred, false);
  assert.equal(result.redacted.summary.confirmed_html_200, 1);
  assert.equal(result.redacted.summary.not_advertised_locally_known, 1);
  assert.equal(result.redacted.summary.observed_assets_same_bytes, 1);
});

test('storage permission errors are actionable and do not disclose private OS paths', async t => {
  const f = fixture(t), store = path.join(f.root, '.publication-review');
  const server = createReviewServer(f.root, { store });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const session = await fetch(base + '/api/session').then(r => r.json());
  const row = f.review.list().find(item => item.kind === 'system');
  const item = await fetch(base + '/api/item/' + row.key).then(r => r.json());
  const write = fs.writeFileSync;
  fs.writeFileSync = (filename, ...args) => {
    if (String(filename).startsWith(store + path.sep)) { const error = Error('Permission denied: ' + SECRET); error.code = 'EPERM'; throw error; }
    return write(filename, ...args);
  };
  let response;
  try {
    response = await fetch(base + '/api/decide', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', 'X-Review-Token': session.csrf }, body: JSON.stringify({ items: [{ ...f.request(item), review_token: item.review_token }] }) });
  } finally { fs.writeFileSync = write; }
  assert.equal(response.status, 503);
  const result = await response.text();
  assert.ok(result.includes('REVIEW_STORE_WRITE_DENIED')); assert.ok(!result.includes(SECRET));
  assert.equal(f.review.events().length, 0);
});
