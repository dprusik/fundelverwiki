const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { scanRepository } = require('../../src/helpers/wiki/publication.cjs');
const { prepareLocalArticles, renderApprovedMarkdown, resetPreviewOutput } = require('../../src/helpers/wiki/local-articles.cjs');
const { projectApprovedSearch, renderedText } = require('../../src/helpers/wiki/approved-search.cjs');
const SECRET = 'PENDING_DENIED_CANARY_542';
function fixture(t, body = 'Public article') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-articles-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, data) => { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), data); };
  const note = (url, content) => '---\n{"dg-publish":true,"permalink":"' + url + '"}\n---\n' + content;
  write('src/site/notes/public.md', note('/public/', body));
  write('src/site/notes/pending.md', note('/pending/', SECRET));
  write('src/site/notes/denied.md', note('/denied/', SECRET));
  write('src/site/img/picture.png', Buffer.from([137,80,78,71,13,10,26,10]));
  const records = scanRepository(root), publicRecord = records.find(record => record.source.endsWith('/public.md')), image = records.find(record => record.kind === 'asset');
  const common = { approved: true, reviewed_at: '2026-10-22T10:00:00Z' };
  const entries = [{ ...common, id: 'public-entry', source_key: publicRecord.key, sha256: publicRecord.sha256, title: 'Public title', category: 'documents', kind: 'article', permalink: '/public/' }];
  const assets = [{ ...common, id: 'public-image', source_key: image.key, sha256: image.sha256, url: '/img/picture.png', alt: 'Public image' }];
  const registry = (name, key, value) => write('src/wiki/' + name + '.json', JSON.stringify({ schema_version: 1, [key]: value }));
  registry('public-entries', 'entries', entries); registry('public-assets', 'assets', assets); registry('public-system', 'inputs', []); registry('public-relations', 'relations', []);
  registry('publication-decisions', 'decisions', records.filter(record => /\/(pending|denied)\.md$/.test(record.source)).map(record => ({ key: record.key, state: record.source.endsWith('/denied.md') ? 'denied' : 'pending' })));
  return { root, write, registry, entries, assets, records, note };
}
test('entity profiles project only explicitly approved image references, summaries and status', t => {
  for (const kind of ['character', 'location']) {
    const f = fixture(t);
    f.entries[0].kind = kind;
    f.entries[0].category = kind === 'character' ? 'characters' : 'locations';
    f.entries[0].summary = 'Publicly reviewed short description.';
    const field = kind === 'character' ? 'portrait_asset_id' : 'illustration_asset_id';
    const output = kind === 'character' ? 'portrait' : 'illustration';
    f.entries[0][field] = 'public-image';
    if (kind === 'character') f.entries[0].status = { value: 'alive', approved: true };
    f.registry('public-entries', 'entries', f.entries);
    const projected = prepareLocalArticles(f.root).articles[0];
    assert.deepEqual(projected[output], { id: 'public-image', src: '/img/picture.png', alt: 'Public image' });
    assert.equal(projected.summary, f.entries[0].summary);
    assert.equal(projected.publicStatus, kind === 'character' ? 'Żyje' : undefined);
    assert.ok(!JSON.stringify(projected).includes(SECRET));
    assert.deepEqual(Object.keys(projected[output]).sort(), ['alt', 'id', 'src']);
    f.registry('public-assets', 'assets', []);
    assert.throws(() => prepareLocalArticles(f.root), error => error.issues.some(issue => issue.code === 'UNAPPROVED_IMAGE_REFERENCE'));
  }
});

test('only active approvals reach public projection; pending and denied canaries never escape', t => {
  const f = fixture(t), data = prepareLocalArticles(f.root);
  assert.equal(data.articles.length, 1); assert.equal(data.files.length, 1);
  assert.ok(!JSON.stringify(data).includes(SECRET));
  for (const key of ['source_key', 'sha256', 'parsed', 'dg-publish']) assert.ok(!JSON.stringify(data).includes(key));
});
test('changed approved source or image bytes block projection', t => {
  for (const target of ['src/site/notes/public.md', 'src/site/img/picture.png']) {
    const f = fixture(t); f.write(target, 'CHANGED');
    assert.throws(() => prepareLocalArticles(f.root), error => error.issues.some(issue => issue.code === 'SOURCE_CHANGED'));
  }
});
test('token validation covers reference links/images, autolinks and wiki forms', t => {
  const f = fixture(t);
  const render = markdown => renderApprovedMarkdown(markdown, f.entries, f.assets, f.records);
  assert.match(render('[public][p]\n\n[p]: /public/'), /href="\/public\/"/);
  assert.match(render('![public][p]\n\n[p]: /img/picture.png'), /src="\/img\/picture.png"/);
  assert.match(render('[[public|Label]] ![[picture.png|300]]'), /Label<\/a> <img/);
  assert.match(render('`[[unknown]]`'), /<code>/);
  assert.match(render('# Content heading\n\n###### Deep heading'), /<h2>Content heading<\/h2>[\s\S]*<h6>Deep heading<\/h6>/);
  assert.throws(() => renderApprovedMarkdown('[hidden](/public/)', [], f.assets, f.records));
  for (const markdown of ['[secret][missing]', '[secret][p]\n\n[p]: /pending/', '![secret][p]\n\n[p]: /private.png', '<https://untrusted.invalid/>', '[run](javascript:alert(1))', '![run](data:image/png;base64,AA)', '![[public]]', '[[pending]]', '[[public#secret]]', '<script>alert(1)</script>', '{{ secret }}', '{% include "private" %}']) assert.throws(() => render(markdown));
});
test('hidden targets, unsupported assets and reserved routes fail closed', t => {
  const f = fixture(t, '[self](/public/)');
  f.write('src/site/notes/public.md', '---\n{"dg-publish":true,"permalink":"/public/","hide":true}\n---\nHidden');
  // Re-review changed synthetic bytes, keeping the synthetic frontmatter hidden.
  const current = scanRepository(f.root).find(record => record.source.endsWith('/public.md')); f.entries[0].sha256 = current.sha256; f.registry('public-entries', 'entries', f.entries);
  assert.equal(prepareLocalArticles(f.root).articles.length, 0);
  const normal = fixture(t); assert.throws(() => prepareLocalArticles(normal.root, ['/public/']));
  assert.throws(() => prepareLocalArticles(normal.root, ['/PUBLIC/']), error => error.issues.some(issue => issue.code === 'PREVIEW_ROUTE_COLLISION'));
  normal.write('src/site/img/picture.png', '<svg></svg>'); normal.assets[0].sha256 = scanRepository(normal.root).find(record => record.kind === 'asset').sha256; normal.registry('public-assets', 'assets', normal.assets);
  assert.throws(() => prepareLocalArticles(normal.root));
});
test('withdrawal and failed next validation cannot leave previous owned output', t => {
  const f = fixture(t); const output = resetPreviewOutput(f.root);
  f.write('.wiki-preview/public/index.html', 'OLD_APPROVED_CONTENT'); f.write('.wiki-preview/img/picture.png', 'OLD_IMAGE');
  f.registry('public-entries', 'entries', []); f.registry('public-assets', 'assets', []);
  resetPreviewOutput(f.root); assert.ok(!fs.existsSync(output)); assert.equal(prepareLocalArticles(f.root).articles.length, 0);
  f.write('.wiki-preview/public/index.html', 'OLD_APPROVED_CONTENT'); f.registry('public-entries', 'entries', [{ ...f.entries[0], sha256: 'stale' }]);
  resetPreviewOutput(f.root); assert.throws(() => prepareLocalArticles(f.root)); assert.ok(!fs.existsSync(output));
});

test('approved notes cannot overwrite the separate demo namespace', t => {
  const f = fixture(t);
  const url = '/DeMo/claimed/';
  f.write('src/site/notes/public.md', f.note(url, 'Public article'));
  const record = scanRepository(f.root).find(record => record.source.endsWith('/public.md'));
  f.entries[0].permalink = url; f.entries[0].sha256 = record.sha256;
  f.registry('public-entries', 'entries', f.entries);
  assert.throws(() => prepareLocalArticles(f.root), error => error.issues.some(issue => issue.code === 'PREVIEW_ROUTE_COLLISION'));
});

test('approved search contains rendered text and reviewed aliases only, never note frontmatter or pending/denied content', t => {
  const f = fixture(t, 'Pierwszy **akapit**.\n\nDrugi &amp; Łódź.\n\n![Public label](/img/picture.png)');
  f.write('src/site/notes/public.md', '---\n{"dg-publish":true,"permalink":"/public/","title":"FRONTMATTER_CANARY"}\n---\nPierwszy **akapit**.\n\nDrugi &amp; Łódź.\n\n![Public label](/img/picture.png)');
  f.entries[0].sha256 = scanRepository(f.root).find(record => record.source.endsWith('/public.md')).sha256;
  f.entries[0].aliases = ['Przejrzany alias'];
  f.registry('public-entries', 'entries', f.entries);
  const index = projectApprovedSearch(prepareLocalArticles(f.root));
  assert.equal(index.entries.length, 1);
  assert.equal(index.demonstration, false);
  assert.deepEqual(index.entries[0].aliases, ['Przejrzany alias']);
  assert.equal(index.entries[0].body, 'Pierwszy akapit. Drugi & Łódź.');
  assert.equal(index.entries[0].title, 'Public title');
  for (const secret of [SECRET, 'FRONTMATTER_CANARY', '/img/picture.png', 'source_key', 'sha256', 'dg-publish', '<strong>']) assert.ok(!JSON.stringify(index).includes(secret));
});

test('search text excludes attributes, comments and hidden/active markup, preserving visible text and code', () => {
  const html = '<p>A <a href="/ATTRIBUTE_CANARY/" title="ATTRIBUTE_CANARY">link</a>.</p><!-- COMMENT_CANARY --><img src="ATTRIBUTE_CANARY" alt="ATTRIBUTE_CANARY"><script>SCRIPT_CANARY</script><style>STYLE_CANARY</style><template>TEMPLATE_CANARY</template><p hidden>HIDDEN_CANARY</p><span aria-hidden="true">HIDDEN_CANARY</span><p><code>Visible code</code></p>';
  assert.equal(renderedText(html), 'A link. Visible code');
  assert.equal(renderedText('<pre><code class="language-ATTRIBUTE_CANARY">Approved &lt;literal&gt;</code></pre>'), 'Approved <literal>');
});

test('search map content uses projected marker text and never raw targets or map attributes', () => {
  const entry = { id: 'map', url: '/map/', title: 'Map', category: 'maps', aliases: [], html: '<p>Visible prose</p>' };
  const local = { catalog: [entry], maps: [{ entry, map: { image: { src: 'IMAGE_CANARY' }, markers: [{ name: 'Public point', description: 'Public description', target: 'TARGET_CANARY', target_id: 'ID_CANARY', url: '/URL_CANARY/', x: 333 }] } }] };
  const index = projectApprovedSearch(local);
  assert.equal(index.entries[0].body, 'Visible prose Public point Public description');
  for (const secret of ['IMAGE_CANARY', 'TARGET_CANARY', 'ID_CANARY', 'URL_CANARY', '333']) assert.ok(!JSON.stringify(index).includes(secret));
});

test('withdrawal/hide removes search records and stale/commented notes cannot produce a replacement index', t => {
  const f = fixture(t, 'WITHDRAWAL_CANARY');
  assert.ok(JSON.stringify(projectApprovedSearch(prepareLocalArticles(f.root))).includes('WITHDRAWAL_CANARY'));
  f.registry('public-entries', 'entries', []);
  assert.equal(projectApprovedSearch(prepareLocalArticles(f.root)).entries.length, 0);
  f.write('src/site/notes/public.md', '---\n{"dg-publish":true,"permalink":"/public/","hide":true}\n---\nHIDDEN_CANARY');
  f.entries[0].sha256 = scanRepository(f.root).find(record => record.source.endsWith('/public.md')).sha256;
  f.registry('public-entries', 'entries', f.entries);
  assert.equal(projectApprovedSearch(prepareLocalArticles(f.root)).entries.length, 0);
  f.write('.wiki-preview/approved-search.json', 'OLD_CANARY');
  f.write('src/site/notes/public.md', f.note('/public/', 'CHANGED_CANARY'));
  resetPreviewOutput(f.root);
  assert.throws(() => projectApprovedSearch(prepareLocalArticles(f.root)));
  assert.ok(!fs.existsSync(path.join(f.root, '.wiki-preview/approved-search.json')));
  const commented = fixture(t, 'Public %% COMMENT_CANARY %%');
  assert.throws(() => projectApprovedSearch(prepareLocalArticles(commented.root)));
});
