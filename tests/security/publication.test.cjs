const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { scanRepository, redactedInventory, validatePublication, preparePublicData, assertProductionBuildAllowed, PublicationError, sha } = require('../../src/helpers/wiki/publication.cjs');
const repo = path.resolve(__dirname, '../..');
const SECRET = 'SYNTHETIC_DM_CANARY_NOT_REAL_741';
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-publication-'));
  // Only a known freshly created test directory is ever removed.
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (relative, value) => { const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
  const registry = (name, key, value) => write(`src/wiki/${name}.json`, JSON.stringify({ schema_version: 1, [key]: value }));
  write('src/site/notes/public.md', '---\n{"dg-publish":true,"permalink":"/unchanged/","title":"' + SECRET + '"}\n---\nA public Markdown body.');
  write('src/site/img/public.png', Buffer.from('SYNTHETIC_IMAGE_BYTES'));
  const records = scanRepository(root);
  const note = records.find(item => item.kind === 'entry'), asset = records.find(item => item.kind === 'asset');
  const entries = [{ id: 'stable-character', source_key: note.key, sha256: note.sha256, approved: true, reviewed_at: '2026-10-22T10:00:00Z', title: 'Approved display title', permalink: '/unchanged/', category: 'characters', kind: 'character', portrait_asset_id: 'public-image' }];
  const assets = [{ id: 'public-image', source_key: asset.key, sha256: asset.sha256, approved: true, reviewed_at: '2026-10-22T10:00:00Z', url: '/img/public.png', alt: 'Approved image' }];
  registry('public-entries', 'entries', entries);
  registry('public-assets', 'assets', assets);
  registry('public-system', 'inputs', []);
  registry('public-relations', 'relations', []);
  registry('publication-decisions', 'decisions', []);
  return { root, write, registry, entries, assets };
}
function blocked(action, code) {
  assert.throws(action, error => {
    assert.ok(error instanceof PublicationError);
    assert.ok(error.issues.some(issue => issue.code === code), JSON.stringify(error.issues));
    assert.ok(!JSON.stringify(error.issues).includes(SECRET));
    return true;
  });
}
test('approved fingerprinted inputs produce only explicit metadata with unchanged URL', t => {
  const f = fixture(t);
  const result = preparePublicData(f.root);
  assert.equal(result.entries[0].id, 'stable-character');
  assert.equal(result.entries[0].url, '/unchanged/');
  assert.equal(result.entries[0].portrait.src, '/img/public.png');
  assert.equal(result.capabilities.fulltext, false);
  assert.ok(!JSON.stringify(result).includes(SECRET));
  for (const forbidden of ['source_key', 'sha256', 'body', 'content', 'metadata', 'approved', 'reviewed_at']) assert.ok(!Object.keys(result.entries[0]).includes(forbidden));
});
test('unknown notes block regardless of dg-publish false/missing/true/string; secrets stay out of logs/data', t => {
  const f = fixture(t);
  for (const flag of [false, undefined, true, 'true']) {
    f.write(`src/site/notes/${SECRET}.md`, `---\n${JSON.stringify(flag === undefined ? {} : { 'dg-publish': flag })}\n---\n${SECRET}`);
    blocked(() => preparePublicData(f.root), 'UNAPPROVED_INPUT');
    const inventory = redactedInventory(scanRepository(f.root));
    assert.ok(!JSON.stringify(inventory).includes(SECRET));
    const cli = spawnSync(process.execPath, [path.join(repo, 'scripts/publication.cjs'), 'data'], { cwd: f.root, encoding: 'utf8' });
    assert.equal(cli.status, 1); assert.ok(!cli.stdout.includes(SECRET) && !cli.stderr.includes(SECRET));
    assert.equal(fs.existsSync(path.join(f.root, '.publication-prepared')), false);
  }
  const cli = spawnSync(process.execPath, [path.join(repo, 'scripts/publication.cjs'), 'inventory'], { cwd: f.root, encoding: 'utf8' });
  assert.equal(cli.status, 0);
  for (const report of ['publication-inventory.json', 'DM_REVIEW.md']) assert.ok(!fs.readFileSync(path.join(f.root, 'docs/review', report), 'utf8').includes(SECRET));
});
test('explicit denial and unreferenced attachments block, not just hidden links', t => {
  const f = fixture(t);
  f.write(`src/site/img/${SECRET}.png`, SECRET);
  const unknown = scanRepository(f.root).find(item => item.source.includes(SECRET));
  f.registry('publication-decisions', 'decisions', [{ key: unknown.key, state: 'denied' }]);
  blocked(() => validatePublication(f.root), 'DENIED_INPUT');
});
test('changed approved content/assets and known-but-not-approved flags block', t => {
  const f = fixture(t);
  f.write('src/site/img/public.png', SECRET);
  blocked(() => validatePublication(f.root), 'SOURCE_CHANGED');
  f.assets[0].sha256 = sha(SECRET); f.registry('public-assets', 'assets', f.assets);
  f.write('src/site/notes/public.md', `---\n{"dg-publish":false,"permalink":"/unchanged/"}\n---\n${SECRET}`);
  f.entries[0].sha256 = sha(fs.readFileSync(path.join(f.root, 'src/site/notes/public.md')));
  f.registry('public-entries', 'entries', f.entries);
  blocked(() => validatePublication(f.root), 'PUBLISH_FLAG_REQUIRED');
});
test('unknown frontmatter, approval properties, status and raw HTML cannot pass through projection', t => {
  const f = fixture(t);
  f.entries[0].dm_notes = SECRET; f.registry('public-entries', 'entries', f.entries);
  blocked(() => validatePublication(f.root), 'INVALID_APPROVAL');
  delete f.entries[0].dm_notes;
  f.entries[0].status = { value: 'dead', approved: false }; f.registry('public-entries', 'entries', f.entries);
  blocked(() => validatePublication(f.root), 'STATUS_REVIEW_REQUIRED');
  delete f.entries[0].status;
  for (const [metadata, body, code] of [
    [{ dm_notes: SECRET }, 'Public text', 'UNREVIEWED_FRONTMATTER'],
    [{}, `<!--${SECRET}-->`, 'ACTIVE_CONTENT_CHANNEL_NOT_SUPPORTED'],
    [{}, `%%${SECRET}%%`, 'ACTIVE_CONTENT_CHANNEL_NOT_SUPPORTED'],
    [{}, '```base\n' + SECRET + '\n```', 'ACTIVE_CONTENT_CHANNEL_NOT_SUPPORTED']
  ]) {
    f.write('src/site/notes/public.md', '---\n' + JSON.stringify({ 'dg-publish': true, permalink: '/unchanged/', ...metadata }) + '\n---\n' + body);
    f.entries[0].sha256 = sha(fs.readFileSync(path.join(f.root, 'src/site/notes/public.md')));
    f.registry('public-entries', 'entries', f.entries);
    blocked(() => preparePublicData(f.root), code);
  }
});
test('private wikilinks and attachment references fail without serializing targets', t => {
  const f = fixture(t);
  for (const body of [`[[${SECRET}|Display label]]`, `![[${SECRET}]]`, `![label](/img/${SECRET}.png)`, '[link](javascript:alert)']) {
    f.write('src/site/notes/public.md', '---\n{"dg-publish":true,"permalink":"/unchanged/"}\n---\n' + body);
    f.entries[0].sha256 = sha(fs.readFileSync(path.join(f.root, 'src/site/notes/public.md')));
    f.registry('public-entries', 'entries', f.entries);
    blocked(() => preparePublicData(f.root), body.includes('[[') ? 'UNAPPROVED_WIKILINK' : 'UNAPPROVED_LINK_OR_ASSET');
  }
});
test('independent relation consent is required even when both ends are public', t => {
  const f = fixture(t);
  f.write('src/site/notes/place.md', '---\n{"dg-publish":true,"permalink":"/place/"}\n---\nA place');
  const record = scanRepository(f.root).find(item => item.source.endsWith('place.md'));
  f.entries.push({ id: 'public-place', source_key: record.key, sha256: record.sha256, approved: true, reviewed_at: '2026-10-22T10:00:00Z', title: 'Place', permalink: '/place/', category: 'locations', kind: 'location' });
  f.registry('public-entries', 'entries', f.entries);
  const edge = { id: 'relation-001', source_id: 'stable-character', target_id: 'public-place', type: 'associated_with_location', approved: false };
  f.registry('public-relations', 'relations', [edge]);
  blocked(() => preparePublicData(f.root), 'UNAPPROVED_OR_INVALID_RELATION');
  edge.approved = true; f.registry('public-relations', 'relations', [edge]);
  assert.equal(preparePublicData(f.root).relations[0].type, 'located_in');
  // A hidden but approved public entry is not discoverable, nor is its relationship.
  f.write('src/site/notes/place.md', '---\n{"dg-publish":true,"permalink":"/place/","hide":true}\n---\nA place');
  f.entries[1].sha256 = sha(fs.readFileSync(path.join(f.root, 'src/site/notes/place.md')));
  f.registry('public-entries', 'entries', f.entries);
  const data = preparePublicData(f.root);
  assert.equal(data.entries.length, 1); assert.equal(data.relations.length, 0);
});
test('canonical URL collisions, arbitrary URL replacement and duplicate source approvals block', t => {
  const f = fixture(t);
  f.entries[0].permalink = '/changed/'; f.registry('public-entries', 'entries', f.entries);
  blocked(() => validatePublication(f.root), 'CANONICAL_URL_MISMATCH');
  f.entries[0].permalink = '/unchanged/'; f.entries.push({ ...f.entries[0], id: 'second-copy' });
  f.registry('public-entries', 'entries', f.entries);
  blocked(() => validatePublication(f.root), 'INVALID_APPROVAL');
  f.entries.pop();
  f.write('src/site/notes/collision.md', '---\n{"dg-publish":true,"permalink":"/unchanged/"}\n---\nSecond source');
  const collision = scanRepository(f.root).find(record => record.source.endsWith('collision.md'));
  f.entries.push({ ...f.entries[0], source_key: collision.key, sha256: collision.sha256, id: 'second-source' });
  f.registry('public-entries', 'entries', f.entries);
  blocked(() => validatePublication(f.root), 'CANONICAL_URL_MISMATCH');
});
test('unreviewed directory data is never executed', t => {
  const f = fixture(t);
  f.write('src/site/notes/notes.11tydata.js', `throw new Error('${SECRET}')`);
  blocked(() => preparePublicData(f.root), 'UNAPPROVED_INPUT');
});
test('executable frontmatter engines fail closed instead of evaluating code', t => {
  const f = fixture(t);
  f.write('src/site/notes/public.md', `---js\n(() => { throw new Error('${SECRET}') })()\n---\nPublic body`);
  const records = scanRepository(f.root);
  assert.equal(records.find(record => record.kind === 'entry').flag, 'parse_error');
  blocked(() => validatePublication(f.root), 'PUBLISH_FLAG_REQUIRED');
});
test('even valid input-only preparation never certifies legacy output channels', t => {
  const f = fixture(t);
  assert.doesNotThrow(() => preparePublicData(f.root));
  blocked(() => assertProductionBuildAllowed(), 'PRODUCTION_CHANNELS_NOT_CERTIFIED');
  const cli = spawnSync(process.execPath, [path.join(repo, 'scripts/publication.cjs'), 'data'], { cwd: f.root, encoding: 'utf8' });
  assert.equal(cli.status, 0);
  const outputs = fs.readdirSync(path.join(f.root, '.publication-prepared'));
  assert.equal(outputs.length, 1);
  assert.ok(!fs.readFileSync(path.join(f.root, '.publication-prepared', outputs[0]), 'utf8').includes(SECRET));
  for (const publicFile of ['dist/index.html', 'dist/searchIndex.json', 'dist/graph.json', 'dist/sitemap.xml', 'dist/feed.xml']) assert.equal(fs.existsSync(path.join(f.root, publicFile)), false);
});
test('legacy Eleventy guard blocks ALL real channels before output and never emits canary', t => {
  const f = fixture(t);
  f.write('src/site/notes/private.md', `---\n{"dg-publish":false}\n---\n${SECRET}`);
  const output = path.join(f.root, 'out');
  const run = spawnSync(process.execPath, [path.join(repo, 'node_modules/@11ty/eleventy/cmd.cjs'), '--config=' + path.join(repo, '.eleventy.js'), '--input=' + path.join(f.root, 'src/site'), '--output=' + output], { cwd: repo, encoding: 'utf8' });
  assert.notEqual(run.status, 0);
  assert.ok(!run.stdout.includes(SECRET) && !run.stderr.includes(SECRET));
  for (const channel of ['index.html', 'searchIndex.json', 'graph.json', 'sitemap.xml', 'feed.xml', 'img']) assert.equal(fs.existsSync(path.join(output, channel)), false, channel);
  assert.equal(fs.existsSync(output), false);
});
test('real installed Eleventy does not treat dg-publish false or missing as a global exclusion', async t => {
  const f = fixture(t);
  f.write('raw/notes/notes.json', JSON.stringify({ tags: 'note' }));
  f.write('raw/notes/false.md', '---\n{"dg-publish":false}\n---\n' + SECRET);
  f.write('raw/notes/missing.md', SECRET);
  f.write('fixture.config.cjs', 'module.exports = () => ({ templateFormats: ["md"], markdownTemplateEngine: false });');
  const output = path.join(f.root, 'baseline');
  const run = spawnSync(process.execPath, [path.join(repo, 'node_modules/@11ty/eleventy/cmd.cjs'), '--config=' + path.join(f.root, 'fixture.config.cjs'), '--input=' + path.join(f.root, 'raw'), '--output=' + output], { cwd: f.root, encoding: 'utf8' });
  assert.equal(run.status, 0, 'Synthetic Eleventy baseline must run');
  assert.ok(fs.readFileSync(path.join(output, 'notes/false/index.html'), 'utf8').includes(SECRET));
  assert.ok(fs.readFileSync(path.join(output, 'notes/missing/index.html'), 'utf8').includes(SECRET));
});
