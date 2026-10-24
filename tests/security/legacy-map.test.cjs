const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { extractLegacyMap, projectLegacyMap } = require('../../src/helpers/wiki/legacy-map.cjs');
const { scanRepository, validatePublication, preparePublicData, prepareLocalMapPreviewData } = require('../../src/helpers/wiki/publication.cjs');
const { createReview } = require('../../src/helpers/wiki/review.cjs');
const { createReviewServer } = require('../../scripts/publication-review.cjs');
const SECRET = 'SYNTHETIC_MAP_SECRET_457';
const source = (target = '/place/') => `## Public map\n<div id="campaign-map" data-map-src="/img/map.png" data-map-width="1000" data-map-height="700" data-initial-zoom-offset="0"></div>\n<div class="campaign-map-marker" data-name="Public point" data-x="\u00a0200" data-y="400" data-type="castle" data-description="Public description" data-url="${target}"></div>\n<div style="display: none;">\n![Map](/img/map.png)\n</div>`;
function fixture(t, target = '/place/') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-map-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, data) => { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), data); };
  write('src/site/notes/map.md', '---\n{"dg-publish":true,"permalink":"/map/"}\n---\n' + source(target));
  write('src/site/notes/place.md', '---\n{"dg-publish":true,"permalink":"/place/"}\n---\nPublic place'); write('src/site/img/map.png', 'SYNTHETIC_MAP_IMAGE');
  const records = scanRepository(root), map = records.find(r => r.source.endsWith('/map.md')), place = records.find(r => r.source.endsWith('/place.md')), image = records.find(r => r.kind === 'asset');
  const entries = [map, place].map((r, i) => ({ id: i ? 'stable-place' : 'stable-map', source_key: r.key, sha256: r.sha256, approved: true, reviewed_at: '2026-10-22T10:00:00Z', title: 'Public title', category: 'locations', kind: 'location', permalink: r.url }));
  const assets = [{ id: 'stable-image', source_key: image.key, sha256: image.sha256, approved: true, reviewed_at: '2026-10-22T10:00:00Z', alt: 'Public map image', url: image.url }];
  const registry = (name, key, list) => write('src/wiki/' + name + '.json', JSON.stringify({ schema_version: 1, [key]: list }));
  registry('public-entries', 'entries', entries); registry('public-assets', 'assets', assets); registry('public-relations', 'relations', []); registry('public-system', 'inputs', []); registry('publication-decisions', 'decisions', []);
  return { root, write, registry, records, map, entries, assets };
}
test('legacy extraction preserves world dimensions, NBSP coordinates, order and stable marker IDs', t => {
  const f = fixture(t), parsed = extractLegacyMap(f.map.parsed.content);
  assert.equal(parsed.width, 1000); assert.equal(parsed.height, 700); assert.equal(parsed.markers[0].x, 200); assert.equal(parsed.markers[0].y, 400);
  assert.ok(!parsed.markdown.includes('<div')); assert.ok(parsed.markdown.includes('## Public map'));
  const first = projectLegacyMap(parsed, f.map, f.entries[0], f.records, f.entries, f.assets).map;
  const edited = structuredClone(parsed); edited.markers[0].name = 'Renamed public point';
  assert.equal(projectLegacyMap(edited, f.map, f.entries[0], f.records, f.entries, f.assets).map.markers[0].id, first.markers[0].id);
  assert.equal(first.markers[0].url, '/place/'); assert.equal(first.markers[0].target_id, 'stable-place');
});
test('publication adapter supports only recognized map HTML and projects approved data without raw source', t => {
  const f = fixture(t), data = preparePublicData(f.root);
  assert.equal(data.maps[0].markers.length, 1); assert.equal(data.entries[0].url, '/map/'); assert.equal(data.capabilities.production_channels, false);
  for (const forbidden of ['data-description', '<div', 'style=', 'data-map-src', 'source_key', 'sha256']) assert.ok(!JSON.stringify(data.maps).includes(forbidden));
  assert.equal(validatePublication(f.root).maps.length, 1);
});
test('unknown tags, styles, attributes and hidden data fail closed instead of leaking canaries', () => {
  for (const content of [source() + '<script>' + SECRET + '</script>', source().replace('data-x=', 'data-visibility="dm" data-x='), source().replace('data-x=', 'onclick="' + SECRET + '" data-x='), source().replace('id="campaign-map"', 'id="campaign-map" style="background:url(https://untrusted.invalid)"'), source().replace('![Map]', SECRET + '\n![Map]'), source().replace('data-x=', 'data-x="1" data-x='), source() + '<!--' + SECRET + '-->']) {
    assert.throws(() => extractLegacyMap(content), error => { assert.ok(!error.message.includes(SECRET)); return true; });
  }
});
test('invalid coordinates, off-map markers, colors, unsafe URLs and mixed map ownership are rejected', () => {
  for (const value of ['Infinity', 'NaN', '', '-1', '1001']) assert.throws(() => extractLegacyMap(source().replace('data-x="\u00a0200"', `data-x="${value}"`)));
  for (const value of ['javascript:alert(1)', '//untrusted.invalid/', '/%2e%2e/private', '/%2Fprivate']) assert.throws(() => extractLegacyMap(source(value)));
  assert.throws(() => extractLegacyMap(source().replace('data-type="castle"', 'data-type="castle" data-color="red;display:none"')));
  assert.throws(() => extractLegacyMap(source() + source()));
});
test('source/image approval and current hashes are required; no snapshot is created on read', t => {
  const f = fixture(t), parsed = extractLegacyMap(f.map.parsed.content);
  assert.throws(() => projectLegacyMap(parsed, f.map, { ...f.entries[0], approved: false }, f.records, f.entries, f.assets), /SOURCE_UNAPPROVED/);
  assert.throws(() => projectLegacyMap(parsed, f.map, f.entries[0], f.records, f.entries, [{ ...f.assets[0], sha256: 'stale' }]), /IMAGE_UNAPPROVED/);
  const review = createReview(f.root, { store: path.join(f.root, '.review') });
  require('../../src/helpers/wiki/legacy-map-review.cjs').reviewedMap(f.root, review, f.map.key);
  assert.equal(fs.existsSync(path.join(f.root, '.review')), false);
});
test('unapproved links block strict projection, and only explicit omission policy permits unlinked points', t => {
  const f = fixture(t, '/' + SECRET + '/'); const parsed = extractLegacyMap(f.map.parsed.content);
  assert.throws(() => projectLegacyMap(parsed, f.map, f.entries[0], f.records, f.entries, f.assets), /LINK_TARGET_UNAPPROVED/);
  const local = projectLegacyMap(parsed, f.map, f.entries[0], f.records, f.entries, f.assets, true);
  assert.equal(local.unresolved.length, 1); assert.ok(!JSON.stringify(local).includes(SECRET));
  f.entries[0].legacy_map = { approved: true, link_policy: 'omit_unresolved' }; f.registry('public-entries', 'entries', f.entries);
  const data = preparePublicData(f.root); assert.equal(data.maps[0].markers[0].name, 'Public point'); assert.equal(data.maps[0].markers[0].url, undefined); assert.ok(!JSON.stringify(data).includes(SECRET));
  f.entries[0].legacy_map.approved = false; f.registry('public-entries', 'entries', f.entries);
  assert.throws(() => validatePublication(f.root), error => error.issues.some(issue => issue.code === 'MAP_LINK_POLICY_REVIEW_REQUIRED'));
});
test('local prototype adapter projects only the approved map and image while unrelated inputs stay pending', t => {
  const f = fixture(t, '/' + SECRET + '/');
  f.entries[0].legacy_map = { approved: true, link_policy: 'omit_unresolved' };
  f.registry('public-entries', 'entries', f.entries);
  f.write(`src/site/notes/${SECRET}.md`, `---\n{"dg-publish":true,"permalink":"/${SECRET}/"}\n---\n${SECRET}`);
  const [preview] = prepareLocalMapPreviewData(f.root);
  assert.equal(preview.entry.id, 'stable-map');
  assert.equal(preview.entry.url, '/map/');
  assert.equal(preview.map.markers.length, 1);
  assert.equal(preview.unresolved_links, 1);
  assert.equal(preview.map.markers[0].url, undefined);
  assert.equal(preview.map.image.src, '/img/map.png');
  assert.ok(!JSON.stringify(preview).includes(SECRET));
  assert.throws(() => preparePublicData(f.root), error => error.issues.some(issue => issue.code === 'UNAPPROVED_INPUT'));
});

test('local map adapter refuses stale image bytes and unresolved markers without an approved omission policy', t => {
  const f = fixture(t, '/place/');
  f.entries[0].legacy_map = { approved: true, link_policy: 'omit_unresolved' };
  f.registry('public-entries', 'entries', f.entries);
  const imagePath = path.join(f.root, 'src/site/img/map.png');
  fs.writeFileSync(imagePath, 'CHANGED_AFTER_REVIEW');
  assert.throws(() => prepareLocalMapPreviewData(f.root), error => error.issues.some(issue => issue.code === 'SOURCE_CHANGED'));
  const fresh = fixture(t, '/place/');
  assert.throws(() => prepareLocalMapPreviewData(fresh.root), error => error.issues.some(issue => issue.code === 'MAP_LINK_TARGET_UNAPPROVED'));
});
test('review endpoints require local access and source/image consent, and return no unresolved URL', async t => {
  const f = fixture(t, '/' + SECRET + '/'), store = path.join(f.root, '.review');
  const server = createReviewServer(f.root, { store }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base + '/api/map/' + f.map.key); assert.equal(response.status, 200);
  const body = await response.text(); assert.ok(!body.includes(SECRET)); assert.ok(!body.includes('src/site')); assert.ok(body.includes('review_only'));
  assert.equal((await fetch(base + '/api/map/' + f.map.key, { headers: { Origin: 'https://untrusted.invalid' } })).status, 403);
  f.write('src/site/img/map.png', 'CHANGED_IMAGE');
  const blocked = await fetch(base + '/api/map-image/' + f.map.key); assert.equal(blocked.status, 409); assert.ok(!(await blocked.text()).includes('CHANGED_IMAGE'));
});

test('map link policy needs explicit scoped confirmation and a current preview; history and source stay intact', async t => {
  const f = fixture(t, '/' + SECRET + '/'), store = path.join(f.root, '.review'), review = createReview(f.root, { store });
  const original = fs.readFileSync(path.join(f.root, f.map.source));
  const registryBefore = fs.readFileSync(path.join(f.root, 'src/wiki/public-entries.json'));
  const server = createReviewServer(f.root, { store }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const session = await fetch(base + '/api/session').then(response => response.json());
  const data = await fetch(base + '/api/map/' + f.map.key).then(response => response.json());
  const post = body => fetch(base + '/api/map-policy', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', 'X-Review-Token': session.csrf }, body: JSON.stringify(body) });
  assert.equal((await post({ ...data.policy_review, link_policy: 'omit_unresolved' })).status, 409);
  assert.equal(review.events().length, 0);
  const response = await post({ ...data.policy_review, confirm: true, link_policy: 'omit_unresolved' });
  assert.equal(response.status, 200); const saved = await response.json(); assert.equal(saved.saved, 1); assert.equal(saved.proposal.exported, 1);
  assert.equal(review.events()[0].metadata.legacy_map.link_policy, 'omit_unresolved');
  const importer = require('../../src/helpers/wiki/import.cjs').createImporter(f.root, { store });
  const proposal = path.resolve(f.root, saved.proposal.local_file); const plan = importer.preview(proposal); assert.equal(plan.changes.length, 1);
  importer.apply(proposal, plan.token); assert.equal(preparePublicData(f.root).maps[0].markers[0].url, undefined);
  assert.equal((await post({ ...data.policy_review, confirm: true, link_policy: 'omit_unresolved' })).status, 409);
  assert.deepEqual(fs.readFileSync(path.join(f.root, f.map.source)), original);
  assert.equal(f.entries[0].legacy_map, undefined); assert.ok(!registryBefore.includes('omit_unresolved'));
});
