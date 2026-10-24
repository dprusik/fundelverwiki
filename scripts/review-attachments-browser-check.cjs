// Isolated synthetic fixtures only. Never records real DM decisions.
const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const { createReviewServer } = require('./publication-review.cjs');
const { createReview } = require('../src/helpers/wiki/review.cjs');
(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-attachments-'));
  const store = path.join(root, '.review');
  const write = (name, value) => { const target = path.join(root, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  for (const name of ['first', 'second']) write(`src/site/notes/${name}.md`, `---\n{"dg-publish":true,"permalink":"/${name}/"}\n---\n![Shared](/img/shared.png) ![SVG](/img/sample.svg) ![Denied](/img/denied.png)`);
  write('src/site/notes/new.md', '---\n{"dg-publish":true,"permalink":"/new/"}\n---\n![SVG](/img/sample.svg)');
  write('src/site/img/shared.png', png); write('src/site/img/denied.png', png);
  write('src/site/img/sample.svg', '<svg><script>window.syntheticAttachmentLeak=true</script></svg>');
  for (const [name, key] of Object.entries(require('../src/helpers/wiki/registry-store.cjs').collections)) write('src/wiki/' + name, JSON.stringify({ schema_version: 1, [key]: [] }));
  const review = createReview(root, { store });
  for (const row of review.list().filter(item => item.kind === 'entry' && !item.source.endsWith('/new.md'))) {
    const item = review.item(row.key);
    review.decide([{ key: item.key, sha256: item.sha256, expected_revision: item.revision, scope: 'content', decision: 'approved', confirm_review: true, metadata: { id: 'stable-' + item.name.replace('.md', ''), title: item.name, category: 'documents', kind: 'article' } }]);
  }
  const denied = review.item(review.list().find(item => item.source.endsWith('/denied.png')).key);
  review.decide([{ key: denied.key, sha256: denied.sha256, expected_revision: denied.revision, scope: 'content', decision: 'denied', confirm_review: true }]);
  const original = review.events().slice();
  const server = createReviewServer(root, { store });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const queue = async () => { await page.locator('#review-linked-assets').click(); await page.waitForSelector('.attachment-review button'); };
    const card = name => page.locator('.attachment-card').filter({ has: page.locator('h4', { hasText: name }) });
    const save = () => page.getByRole('button', { name: 'Zatwierdź wybrane załączniki', exact: true });
    const confirm = () => page.getByLabel('Przejrzałem pokazane materiały', { exact: false });
    const supersede = () => page.getByLabel('Świadomie zastępuję wcześniejsze decyzje', { exact: false });
    await page.getByRole('checkbox', { name: 'Zaznacz src/site/notes/first.md', exact: true }).check();
    await queue();
    assert.equal(await page.locator('#list-decisions').isVisible(), false);
    assert.equal(await page.getByRole('checkbox', { name: 'Zaznacz src/site/notes/first.md', exact: true }).isChecked(), false);
    assert.equal(await page.getByRole('checkbox', { name: 'Zaznacz src/site/notes/first.md', exact: true }).isDisabled(), true);
    assert.ok((await page.locator('#count').textContent()).includes('zaznaczone: 0'));
    await page.evaluate(() => document.querySelector('#approve').click());
    assert.equal(review.events().length, 3); // Old action cannot submit unrelated list selections.
    assert.equal(await page.locator('.attachment-card').count(), 3); // Shared refs deduplicated.
    assert.equal(await card('shared.png').count(), 1);
    assert.equal(await card('denied.png').locator('input[type=checkbox]').isChecked(), false);
    assert.equal(await page.evaluate(() => window.syntheticAttachmentLeak), undefined);
    assert.equal(await card('sample.svg').locator('script').count(), 0);
    await save().click();
    await page.waitForFunction(() => document.querySelector('#attachment-feedback').textContent.includes('Potwierdź przegląd'));
    assert.equal(review.events().length, 3);
    await card('sample.svg').locator('input[type=checkbox]').uncheck();
    await page.getByLabel('Wspólny publiczny opis załączników').fill('Approved synthetic picture');
    await page.getByRole('button', { name: 'Wstaw opis do pustych pól' }).click();
    assert.equal(await card('shared.png').getByLabel('Publiczny opis obrazu (alt)', { exact: true }).inputValue(), 'Approved synthetic picture');
    assert.equal(await card('sample.svg').getByLabel('Publiczny opis obrazu (alt)', { exact: true }).inputValue(), '');
    await page.waitForFunction(() => [...document.querySelectorAll('.attachment-card img')].every(img => img.complete && img.naturalWidth > 0));
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await confirm().check(); await save().click();
    await page.waitForFunction(() => document.querySelector('#attachment-feedback').textContent.includes('Zapisano 1'));
    assert.equal(review.events().length, 4);
    assert.deepEqual(review.events().slice(0, 3), original);
    assert.equal(review.list().find(item => item.source.endsWith('/sample.svg')).state, 'pending');
    await page.getByRole('button', { name: 'Utwórz lokalną propozycję z zapisanych decyzji', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#export-feedback').textContent.includes('Propozycje: 4'));
    assert.equal(review.events().length, 4); // Export is not a second approval.
    // New note plus its selected attachment: one request, two independent events.
    await page.getByRole('button', { name: 'src/site/notes/new.md', exact: true }).click();
    await page.waitForSelector('.attachment-review button');
    await page.getByLabel('Główna sekcja', { exact: true }).selectOption('documents');
    await page.getByLabel('Rodzaj encji', { exact: true }).selectOption('article');
    await card('sample.svg').getByLabel('Publiczny opis obrazu (alt)', { exact: true }).fill('Approved synthetic vector');
    await confirm().check();
    await page.getByRole('button', { name: 'Zatwierdź notatkę i wybrane załączniki', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#attachment-feedback').textContent.includes('Zapisano 2'));
    assert.equal(review.events().length, 6);
    // Changed shared image: only it needs reapproval. A stale preview is rejected.
    write('src/site/img/shared.png', Buffer.concat([png, Buffer.from('version-two')]));
    await queue();
    assert.equal(await page.locator('.attachment-card').count(), 2); // Changed + denied only.
    assert.equal(await card('shared.png').locator('img').count(), 2);
    write('src/site/img/shared.png', Buffer.concat([png, Buffer.from('version-three')]));
    await page.waitForFunction(() => [...document.querySelectorAll('.attachment-card img')].every(img => img.complete && img.naturalWidth > 0));
    await confirm().check(); await supersede().check(); await save().click();
    await page.waitForFunction(() => document.querySelector('#attachment-feedback').textContent.includes('Plik zmienił się'));
    assert.equal(review.events().length, 6);
    await queue();
    await page.waitForFunction(() => [...document.querySelectorAll('.attachment-card img')].every(img => img.complete && img.naturalWidth > 0));
    await confirm().check(); await save().click();
    await page.waitForFunction(() => document.querySelector('#attachment-feedback').textContent.includes('Istnieje wcześniejsza decyzja'));
    assert.equal(review.events().length, 6);
    await supersede().check(); await save().click();
    await page.waitForFunction(() => document.querySelector('#attachment-feedback').textContent.includes('Zapisano 1'));
    assert.equal(review.events().length, 7);
    assert.equal(review.list().find(item => item.source.endsWith('/denied.png')).state, 'denied');
    assert.deepEqual(review.events().slice(0, 3), original);
    assert.deepEqual(errors, []);
    console.log('PASS: note+attachments batch, approved-note queue, deduplication, exclusions, shared alt, unchanged consents, denial, changed image snapshots, stale hashes, explicit supersession, SVG-as-text, 1440/390px; synthetic fixtures only.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); fs.rmSync(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
