// Synthetic map only; source approvals and real campaign files are never changed.
const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const { scanRepository } = require('../src/helpers/wiki/publication.cjs');
const { createReviewServer } = require('./publication-review.cjs');
(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-map-browser-'));
  const write = (name, value) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); };
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="1000" height="700" fill="#dce3cc"/><path d="M0 500 Q300 200 1000 450" fill="none" stroke="#80b8ca" stroke-width="80"/><path d="M100 0 L600 700 M0 200 L1000 200" stroke="#f5ecd9" stroke-width="34"/><g fill="#bfa689" stroke="#8a7760" stroke-width="3"><rect x="160" y="80" width="130" height="70"/><rect x="550" y="270" width="180" height="90"/><rect x="750" y="100" width="100" height="80"/></g><text x="30" y="660" font-size="25" fill="#42534f">DEMONSTRATION MAP — FICTIONAL DATA</text></svg>';
  write('src/site/img/demo.png', await require('sharp')(Buffer.from(svg)).png().toBuffer());
  const mapSource = '---\n{"dg-publish":true,"permalink":"/demo-map/"}\n---\n<div id="campaign-map" data-map-src="/img/demo.png" data-map-width="1000" data-map-height="700" data-initial-zoom-offset="0"></div>\n' + [
    ['Castle', 220, 560, 'castle', '/place/'], ['Harbor & market', 650, 370, 'merchant', '/place/'], ['Hill', 810, 560, 'temple', '/unresolved/']
  ].map(([name, x, y, type, url]) => `<div class="campaign-map-marker" data-name="${name}" data-x="${x}" data-y="${y}" data-type="${type}" data-description="Public synthetic description" data-url="${url}"></div>`).join('\n');
  write('src/site/notes/map.md', mapSource); write('src/site/notes/place.md', '---\n{"dg-publish":true,"permalink":"/place/"}\n---\nPublic synthetic destination.');
  const records = scanRepository(root), map = records.find(item => item.source.endsWith('/map.md'));
  const entries = records.filter(item => item.kind === 'entry').map(item => ({ id: item.key === map.key ? 'demo-map' : 'demo-place', source_key: item.key, sha256: item.sha256, approved: true, reviewed_at: '2026-10-22T10:00:00Z', title: 'Demonstration map', category: 'locations', kind: 'location', permalink: item.url }));
  const assets = records.filter(item => item.kind === 'asset').map(item => ({ id: 'demo-image', source_key: item.key, sha256: item.sha256, approved: true, reviewed_at: '2026-10-22T10:00:00Z', url: item.url, alt: 'Fictional town map' }));
  for (const [name, key, value] of [['public-entries', 'entries', entries], ['public-assets', 'assets', assets], ['public-relations', 'relations', []], ['public-system', 'inputs', []], ['publication-decisions', 'decisions', []]]) write('src/wiki/' + name + '.json', JSON.stringify({ schema_version: 1, [key]: value }));
  const registryBefore = fs.readFileSync(path.join(root, 'src/wiki/public-entries.json'));
  const server = createReviewServer(root, { store: path.join(root, '.review') }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
    const base = `http://127.0.0.1:${server.address().port}`, route = '/map-review/?entry=' + map.key;
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + route); await page.waitForSelector('.map-marker');
    await page.waitForFunction(() => document.querySelector('#map image').getBoundingClientRect().width > 0);
    assert.equal(await page.locator('.map-marker').count(), 3);
    assert.ok((await page.locator('#status').textContent()).includes('1 odnośników'));
    await page.locator('.map-marker').first().click();
    await page.waitForFunction(() => !document.querySelector('#popup').hidden);
    assert.equal(await page.locator('#marker-name').textContent(), 'Castle');
    assert.equal(await page.locator('#marker-link a').getAttribute('href'), '/place/');
    async function assertSelection(targetPage, index) {
      assert.equal(await targetPage.locator('.map-marker[aria-pressed="true"]').count(), 1);
      assert.equal(await targetPage.locator('#markers button[aria-pressed="true"]').count(), 1);
      assert.equal(await targetPage.locator('.map-marker').nth(index).getAttribute('aria-pressed'), 'true');
      assert.equal(await targetPage.locator('#markers button').nth(index).getAttribute('aria-pressed'), 'true');
      assert.equal(await targetPage.locator('.map-marker').nth(index).locator('.map-selection').getAttribute('visibility'), 'visible');
      assert.equal(await targetPage.locator('.map-selection[visibility="visible"]').count(), 1);
    }
    await assertSelection(page, 0);
    // Every tile selects its own point, including points without article links.
    for (let index = 0; index < 3; index++) {
      await page.locator('#markers button').nth(index).click();
      await page.locator('#zoom-in').focus();
      await assertSelection(page, index);
    }
    await page.locator('.map-marker').nth(1).focus();
    await page.keyboard.press('Enter'); await assertSelection(page, 1);
    await page.locator('.map-marker').nth(0).focus();
    await page.keyboard.press('Space'); await assertSelection(page, 0);
    await page.locator('#markers').getByRole('button', { name: 'Hill', exact: true }).click();
    assert.equal(await page.locator('#marker-link a').count(), 0);
    const view = () => page.locator('#map').getAttribute('viewBox');
    const initial = await view(); await page.locator('#zoom-in').click(); assert.notEqual(await view(), initial);
    await page.locator('#reset').click(); assert.equal(await view(), initial);
    await assertSelection(page, 2);
    await page.locator('#map').focus(); await page.keyboard.press('+'); assert.notEqual(await view(), initial);
    await page.keyboard.press('Home'); assert.equal(await view(), initial);
    const box = await page.locator('#map').boundingBox();
    await page.mouse.move(box.x + box.width * .4, box.y + box.height * .7); await page.mouse.down(); await page.mouse.move(box.x + box.width * .5, box.y + box.height * .75, { steps: 5 }); await page.mouse.up();
    assert.notEqual(await view(), initial); await page.locator('#reset').click();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, -100); assert.notEqual(await view(), initial); await page.locator('#reset').click();
    const artifacts = path.resolve('docs/artifacts/legacy-map'); fs.mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, 'demo-desktop.png'), fullPage: true });
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await mobile.newPage(); phone.on('pageerror', error => errors.push(error.message)); await phone.goto(base + route); await phone.waitForSelector('.map-marker');
    assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await phone.locator('#markers').getByRole('button', { name: 'Harbor & market', exact: true }).click(); assert.equal(await phone.locator('#marker-name').textContent(), 'Harbor & market');
    await assertSelection(phone, 1);
    const cdp = await mobile.newCDPSession(phone), rect = await phone.locator('#map').boundingBox();
    await phone.locator('#map').scrollIntoViewIfNeeded();
    const touchBox = await phone.locator('#map').boundingBox(), y = touchBox.y + touchBox.height / 2;
    const touch = (type, a, b) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: a, y, id: 1 }, { x: b, y, id: 2 }] });
    const before = await phone.locator('#map').getAttribute('viewBox');
    await touch('touchStart', 130, 250); await touch('touchMove', 110, 270); await touch('touchMove', 90, 290); await touch('touchEnd');
    assert.notEqual(await phone.locator('#map').getAttribute('viewBox'), before);
    await phone.locator('#reset').click(); await phone.screenshot({ path: path.join(artifacts, 'demo-mobile.png'), fullPage: true });
    assert.equal(fs.existsSync(path.join(root, '.review')), false);
    await phone.locator('#save-policy').click();
    await phone.waitForFunction(() => document.querySelector('#policy-status').textContent.includes('Najpierw potwierdź'));
    assert.equal(fs.existsSync(path.join(root, '.review')), false);
    await phone.locator('#confirm-policy').check(); await phone.locator('#save-policy').click();
    await phone.waitForFunction(() => document.querySelector('#policy-status').textContent.includes('Zapisano decyzję'));
    const history = require('../src/helpers/wiki/review.cjs').createReview(root, { store: path.join(root, '.review') }).events();
    assert.equal(history.length, 1); assert.equal(history[0].metadata.legacy_map.link_policy, 'omit_unresolved');
    assert.deepEqual(errors, []); assert.deepEqual(fs.readFileSync(path.join(root, 'src/wiki/public-entries.json')), registryBefore);
    console.log('PASS: native SVG map, marker/popup/list, canonical link and unresolved omission, pan/wheel/buttons/keyboard/pinch, 1440/390px, source/consents unchanged; synthetic screenshots only.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); fs.rmSync(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
