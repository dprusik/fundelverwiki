const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { createReview } = require('../../src/helpers/wiki/review.cjs');
const { createImporter } = require('../../src/helpers/wiki/import.cjs');
const { readRegistries } = require('../../src/helpers/wiki/registry-store.cjs');
const { validatePublication, preparePublicData } = require('../../src/helpers/wiki/publication.cjs');

const SECRET = 'SYNTHETIC_UNAPPROVED_DM_SECRET_239';
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-import-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, value) => { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), value); };
  write('src/site/notes/example.md', '---\n{"dg-publish":true,"permalink":"/original/"}\n---\nPublic ![Photo](/img/photo.png)');
  write('src/site/img/photo.png', 'SYNTHETIC_IMAGE');
  write('src/site/_data/settings.js', 'module.exports = {};');
  for (const [name, key] of Object.entries(require('../../src/helpers/wiki/registry-store.cjs').collections)) write('src/wiki/' + name, JSON.stringify({ schema_version: 1, [key]: [] }));
  const options = { store: path.join(root, '.review') };
  const review = createReview(root, options), importer = createImporter(root, options);
  function decide(key, decision = 'approved') {
    const item = review.item(key);
    const metadata = item.kind === 'entry' ? { id: 'entry-' + key.slice(-8), title: 'Public example', category: 'characters', kind: 'character' } : item.kind === 'asset' ? { id: 'asset-' + key.slice(-8), alt: 'Public photo' } : {};
    review.decide([{ key, sha256: item.sha256, expected_revision: item.revision, scope: item.scope, decision, confirm_review: true, confirm_supersede: true, metadata }]);
  }
  const proposal = () => path.resolve(root, review.exportProposal().local_file);
  const apply = filename => importer.apply(filename, importer.preview(filename).token);
  const approveAll = () => review.list().forEach(item => decide(item.key));
  const registry = (name, key, value) => write('src/wiki/' + name, JSON.stringify({ schema_version: 1, [key]: value }));
  return { root, write, review, importer, decide, proposal, apply, approveAll, registry };
}

test('panel proposal → explicit diff → active validator, with no automatic grants or writes on preview', t => {
  const f = fixture(t), before = readRegistries(f.root).bytes;
  f.approveAll(); const filename = f.proposal();
  const plan = f.importer.preview(filename);
  assert.equal(plan.changes.length, 3); assert.equal(plan.dependencies.length, 3);
  assert.deepEqual(readRegistries(f.root).bytes, before);
  assert.throws(() => f.importer.apply(filename, 'wrong'), /CONFIRMATION/);
  assert.deepEqual(readRegistries(f.root).bytes, before);
  assert.equal(f.importer.apply(filename, plan.token).applied, 3);
  assert.equal(validatePublication(f.root).entries[0].permalink, '/original/');
  assert.equal(preparePublicData(f.root).capabilities.production_channels, false);
  assert.ok(f.importer.status().records.every(item => item.state === 'approved'));
  assert.equal(f.importer.preview(f.proposal()).changes.length, 0);
});

test('selected export imports existing valid decisions while preserving a blocked local decision', t => {
  const f = fixture(t);
  f.write('src/site/notes/blocked.md', '---\n{"dg-publish":true,"permalink":"/blocked/"}\n---\n[[Unavailable destination]]');
  f.approveAll();
  const blocked = f.review.list().find(item => item.source.endsWith('/blocked.md'));
  const beforeEvents = f.review.events();
  const keys = f.review.list().filter(item => item.key !== blocked.key).map(item => item.key);
  const data = f.review.proposal(keys);
  assert.equal(data.proposals.length, 3);
  assert.ok(!data.proposals.some(item => item.source_key === blocked.key));
  assert.deepEqual(f.review.events(), beforeEvents);
  assert.throws(() => f.importer.preview(f.proposal()), /MERGED_REGISTRIES_INVALID/);
  const selected = path.resolve(f.root, f.review.exportProposal(keys).local_file);
  assert.equal(f.apply(selected).applied, 3);
  assert.deepEqual(f.review.events(), beforeEvents);
  assert.equal(f.importer.status().records.find(item => item.key === blocked.key).state, 'pending');
  assert.equal(f.review.proposal().proposals.find(item => item.source_key === blocked.key).decision, 'approved');
  assert.throws(() => f.review.exportProposal([blocked.key, blocked.key]), /INVALID_EXPORT_SELECTION/);
  assert.throws(() => f.review.exportProposal(['unknown-key']), /INVALID_EXPORT_SELECTION/);
  assert.throws(() => f.review.exportProposal([]), /INVALID_EXPORT_SELECTION/);
});

test('reapproval patches core fields while preserving ID, URL, status, aliases, image and relations', t => {
  const f = fixture(t); f.approveAll(); f.apply(f.proposal());
  const data = readRegistries(f.root).data;
  const entry = data['public-entries.json'].entries[0];
  entry.summary = 'Approved role'; entry.aliases = ['Public alias']; entry.status = { value: 'alive', approved: true };
  entry.portrait_asset_id = data['public-assets.json'].assets[0].id;
  f.registry('public-entries.json', 'entries', [entry]);
  // A valid self-document edge is unnecessary: use an additional canonical location.
  f.write('src/site/notes/place.md', '---\n{"dg-publish":true,"permalink":"/place/"}\n---\nPublic place');
  const place = f.review.list().find(item => item.source.endsWith('/place.md'));
  const item = f.review.item(place.key);
  f.review.decide([{ key: item.key, sha256: item.sha256, expected_revision: item.revision, scope: item.scope, decision: 'approved', confirm_review: true, metadata: { id: 'public-place', title: 'Place', category: 'locations', kind: 'location' } }]);
  f.apply(f.proposal());
  const edges = [{ id: 'approved-edge', source_id: entry.id, target_id: 'public-place', type: 'associated_with_location', approved: true, description: 'Known connection' }];
  f.registry('public-relations.json', 'relations', edges);
  f.write('src/site/notes/example.md', '---\n{"dg-publish":true,"permalink":"/original/"}\n---\nUpdated public prose.');
  f.decide(entry.source_key); const p = f.proposal();
  assert.notEqual(f.importer.preview(p).changes[0].before.sha256, f.importer.preview(p).changes[0].after.sha256);
  f.apply(p);
  const approved = validatePublication(f.root);
  assert.deepEqual(approved.entries.find(e => e.id === entry.id), { ...entry, sha256: approved.entries.find(e => e.id === entry.id).sha256, reviewed_at: approved.entries.find(e => e.id === entry.id).reviewed_at });
  assert.deepEqual(approved.relations, edges);
});

test('denial archives metadata, blocks validation, and later approval restores optional fields', t => {
  const f = fixture(t); f.approveAll(); f.apply(f.proposal());
  const entry = readRegistries(f.root).data['public-entries.json'].entries[0];
  entry.status = { value: 'missing', approved: true }; entry.summary = 'Reviewed role';
  f.registry('public-entries.json', 'entries', [entry]);
  f.decide(entry.source_key, 'denied'); f.apply(f.proposal());
  assert.equal(readRegistries(f.root).data['public-entries.json'].entries.length, 0);
  assert.equal(f.importer.status().records.find(r => r.key === entry.source_key).state, 'denied');
  assert.throws(() => validatePublication(f.root), e => e.issues.some(i => i.code === 'DENIED_INPUT'));
  f.decide(entry.source_key); f.apply(f.proposal());
  assert.deepEqual(validatePublication(f.root).entries[0].status, entry.status);
  assert.equal(validatePublication(f.root).entries[0].summary, entry.summary);
});

test('changed attachment needs its own approval, without revoking unchanged parent', t => {
  const f = fixture(t); f.approveAll(); f.apply(f.proposal());
  const before = readRegistries(f.root).data['public-entries.json'].entries[0];
  f.write('src/site/img/photo.png', 'CHANGED_SYNTHETIC_IMAGE');
  const state = f.importer.status();
  assert.equal(state.records.find(r => r.kind === 'entry').state, 'approved');
  assert.equal(state.records.find(r => r.kind === 'asset').state, 'changed');
  assert.equal(state.records.find(r => r.kind === 'entry').dependency_attention.length, 1);
  assert.throws(() => f.importer.preview(f.proposal()), /MERGED_REGISTRIES_INVALID/);
  f.decide(state.records.find(r => r.kind === 'asset').key);
  f.apply(f.proposal());
  assert.deepEqual(validatePublication(f.root).entries[0], before);
});

test('denying a required asset is rejected; explicit denial of parent and asset is accepted', t => {
  const f = fixture(t); f.approveAll(); f.apply(f.proposal());
  const rows = f.review.list(); f.decide(rows.find(r => r.kind === 'asset').key, 'denied');
  assert.throws(() => f.importer.preview(f.proposal()), /MERGED_REGISTRIES_INVALID/);
  f.decide(rows.find(r => r.kind === 'entry').key, 'denied');
  f.apply(f.proposal());
  assert.equal(f.importer.status().records.filter(r => r.state === 'denied').length, 2);
});

test('stale source, stale confirmation, old registry baseline and superseded events reject all writes', t => {
  const f = fixture(t); f.approveAll(); const filename = f.proposal(), initial = readRegistries(f.root).bytes;
  const token = f.importer.preview(filename).token;
  const asset = f.review.list().find(r => r.kind === 'asset');
  f.decide(asset.key, 'denied');
  assert.throws(() => f.importer.apply(filename, token), /STALE_OR_UNKNOWN_DECISION/);
  const latest = f.proposal();
  f.write('src/site/img/photo.png', 'SOURCE_CHANGED');
  assert.throws(() => f.importer.preview(latest), /STALE_SOURCE_HASH/);
  assert.deepEqual(readRegistries(f.root).bytes, initial);
  f.write('src/wiki/public-assets.json', initial['public-assets.json'] + '\n');
  assert.throws(() => f.importer.preview(latest), /REGISTRIES_CHANGED/);
});

test('tampered metadata, duplicated decisions, foreign and legacy proposals are rejected', t => {
  const f = fixture(t); f.approveAll(); const filename = f.proposal();
  const original = JSON.parse(fs.readFileSync(filename));
  const check = (mutate, expected) => { const copy = structuredClone(original); mutate(copy); fs.writeFileSync(filename, JSON.stringify(copy)); assert.throws(() => f.importer.preview(filename), expected); };
  check(p => p.proposals[0].metadata.title = 'Unreviewed title', /EVENT_MISMATCH/);
  check(p => p.proposals.push(p.proposals[0]), /CONFLICTING_PROPOSAL/);
  check(p => p.repository_id = 'foreign', /REEXPORT/);
  check(p => p.schema_version = 1, /REEXPORT/);
});

test('active decision modified after review cannot be overwritten by reexport', t => {
  const f = fixture(t); f.approveAll();
  const row = f.review.list().find(r => r.kind === 'entry');
  f.registry('publication-decisions.json', 'decisions', [{ key: row.key, state: 'denied' }]);
  assert.throws(() => f.importer.preview(f.proposal()), /ACTIVE_DECISION_CONFLICT/);
});

test('unresolved links and ID/permalink changes cannot import', t => {
  const f = fixture(t);
  f.write('src/site/notes/example.md', '---\n{"dg-publish":true,"permalink":"/original/"}\n---\n[[Unapproved target]]');
  f.approveAll(); assert.throws(() => f.importer.preview(f.proposal()), /MERGED_REGISTRIES_INVALID/);
  f.write('src/site/notes/example.md', '---\n{"dg-publish":true,"permalink":"/original/"}\n---\nPublic');
  f.decide(f.review.list().find(r => r.kind === 'entry').key); f.apply(f.proposal());
  const entry = readRegistries(f.root).data['public-entries.json'].entries[0];
  f.write('src/site/notes/example.md', '---\n{"dg-publish":true,"permalink":"/changed/"}\n---\nPublic');
  assert.throws(() => f.decide(entry.source_key), /CANONICAL_URL/);
});

test('partial disk failure leaves fail-closed markers and supports confirmed rollback', t => {
  const f = fixture(t); f.approveAll(); const filename = f.proposal(), before = readRegistries(f.root).bytes;
  const plan = f.importer.preview(filename), rename = fs.renameSync;
  let writes = 0;
  fs.renameSync = (...args) => { if (++writes === 2) throw Error('SYNTHETIC_DISK_FAILURE'); return rename(...args); };
  try { assert.throws(() => f.importer.apply(filename, plan.token), /DISK_FAILURE/); } finally { fs.renameSync = rename; }
  assert.equal(f.importer.status().registry_import_incomplete, true);
  assert.throws(() => validatePublication(f.root), e => e.issues.some(i => i.code === 'REGISTRY_IMPORT_INCOMPLETE'));
  assert.throws(() => f.importer.preview(filename), /RECOVERY_REQUIRED/);
  const recovery = f.importer.recoveryPreview();
  assert.throws(() => f.importer.recover('wrong'), /CONFIRMATION/);
  f.importer.recover(recovery.token);
  assert.deepEqual(readRegistries(f.root).bytes, before);
  assert.equal(f.importer.status().registry_import_incomplete, false);
  f.apply(filename); assert.equal(validatePublication(f.root).entries.length, 1);
});

test('unknown fictional secrets stay out of status and CLI errors; unknown dependencies block import', t => {
  const f = fixture(t); f.approveAll();
  f.write('src/site/notes/' + SECRET + '.md', '---\n{"dg-publish":false}\n---\n' + SECRET);
  const p = f.proposal(); f.apply(p);
  assert.ok(!JSON.stringify(f.importer.status()).includes(SECRET));
  assert.throws(() => preparePublicData(f.root));
  const script = path.resolve(__dirname, '../../scripts/publication-import.cjs');
  const result = spawnSync(process.execPath, [script, 'status'], { cwd: f.root, encoding: 'utf8' });
  assert.equal(result.status, 0); assert.ok(!result.stdout.includes(SECRET)); assert.ok(!result.stderr.includes(SECRET));
});

test('confirmation is bound to all current sources, and already imported forms cannot overwrite later metadata', t => {
  const f = fixture(t); f.approveAll(); const p = f.proposal();
  const before = readRegistries(f.root).bytes, token = f.importer.preview(p).token;
  f.write('src/site/img/extra.png', 'SYNTHETIC_NEW_UNAPPROVED_ASSET');
  assert.throws(() => f.importer.apply(p, token), /CONFIRMATION/);
  assert.deepEqual(readRegistries(f.root).bytes, before);
  f.apply(p);
  const entries = readRegistries(f.root).data['public-entries.json'].entries;
  entries[0].title = 'Later explicitly maintained title';
  f.registry('public-entries.json', 'entries', entries);
  assert.equal(f.importer.preview(f.proposal()).changes.length, 0);
  f.apply(f.proposal());
  assert.equal(readRegistries(f.root).data['public-entries.json'].entries[0].title, entries[0].title);
});

test('duplicate active decisions cannot be silently repaired by a proposal', t => {
  const f = fixture(t), row = f.review.list().find(r => r.kind === 'entry');
  f.registry('publication-decisions.json', 'decisions', [{ key: row.key, state: 'denied' }, { key: row.key, state: 'pending' }]);
  f.approveAll(); assert.throws(() => f.importer.preview(f.proposal()), /CONFLICTING_ACTIVE/);
});

test('recovery refuses a running importer and preserves outside edits after a failed transaction', t => {
  const f = fixture(t);
  f.write('src/wiki/.publication-import.lock', JSON.stringify({ id: require('node:crypto').randomUUID(), pid: process.pid }));
  assert.throws(() => f.importer.recoveryPreview(), /PROCESS_STILL_RUNNING/);
  fs.unlinkSync(path.join(f.root, 'src/wiki/.publication-import.lock'));
  f.approveAll(); const p = f.proposal(), plan = f.importer.preview(p), rename = fs.renameSync;
  fs.renameSync = () => { throw Error('SYNTHETIC_FAILURE'); };
  try { assert.throws(() => f.importer.apply(p, plan.token), /SYNTHETIC_FAILURE/); } finally { fs.renameSync = rename; }
  f.write('src/wiki/public-assets.json', JSON.stringify({ schema_version: 1, assets: [] }) + '\n\n');
  assert.throws(() => f.importer.recoveryPreview(), /RECOVERY_EXTERNAL_CHANGE/);
});

test('documented CLI preview and apply round-trip uses only an isolated synthetic DM store', t => {
  const f = fixture(t);
  const env = { ...process.env, LOCALAPPDATA: path.join(f.root, 'state'), HOME: path.join(f.root, 'home'), USERPROFILE: path.join(f.root, 'home') };
  const modulePath = path.resolve(__dirname, '../../src/helpers/wiki/review.cjs');
  const bootstrap = `const r=require(process.argv[1]).createReview(process.cwd()); for(const row of r.list()){const i=r.item(row.key);r.decide([{key:i.key,sha256:i.sha256,expected_revision:i.revision,scope:i.scope,decision:'approved',confirm_review:true,metadata:i.kind==='entry'?{id:'cli-character',title:'Public CLI example',category:'characters',kind:'character'}:i.kind==='asset'?{id:'cli-image',alt:'Public image'}:{}}]);} console.log(JSON.stringify(r.exportProposal()));`;
  const result = spawnSync(process.execPath, ['-e', bootstrap, modulePath], { cwd: f.root, env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const proposal = path.resolve(f.root, JSON.parse(result.stdout).local_file);
  assert.ok(proposal.startsWith(f.root + path.sep));
  const script = path.resolve(__dirname, '../../scripts/publication-import.cjs');
  const run = args => spawnSync(process.execPath, [script, ...args], { cwd: f.root, env, encoding: 'utf8' });
  const preview = run(['preview', proposal]); assert.equal(preview.status, 0, preview.stderr);
  assert.ok(preview.stdout.includes('src/site/notes/example.md'));
  assert.equal(readRegistries(f.root).data['public-entries.json'].entries.length, 0);
  const token = preview.stdout.match(/CONFIRM: ([a-f0-9]{64})/)[1];
  const apply = run(['apply', proposal, '--confirm', token]); assert.equal(apply.status, 0, apply.stderr);
  assert.equal(validatePublication(f.root).entries[0].id, 'cli-character');
});
