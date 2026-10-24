const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
  const output = path.resolve('docs/artifacts/dark-archive');
  const actual = JSON.parse(fs.readFileSync('src/wiki/public-entries.json')).entries.find(entry => entry.kind === 'faction').permalink;
  const pages = [['faction-actual', actual, 2], ['faction-demo', '/demo/entities/guild/', 2], ['faction-single-demo', '/demo/entities/circle/', 1]];
  const errors = []; let checks = 0;
  try {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.name));
      for (const [name, route, count] of pages) {
        assert.equal((await page.goto('http://127.0.0.1:8083' + route)).status(), 200);
        await page.waitForSelector('body.js');
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.locator('[data-organization-character]').count(), count);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: ${width}px overflow`);
        for (const image of await page.locator('.organization-character img').all()) {
          await image.evaluate(async node => { node.loading = 'eager'; await node.decode(); });
          assert.ok(await image.evaluate(node => node.naturalWidth > 0 && getComputedStyle(node).objectFit === 'contain'));
        }
        if (name === 'faction-actual') {
          assert.equal(await page.locator('.organization-character-status').count(), 0);
          assert.equal(await page.locator('#organization-mentions-heading').textContent(), 'Postacie wymienione we wpisie');
        }
        if (width !== 320 && name !== 'faction-single-demo') await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
        checks++;
      }
      await page.goto('http://127.0.0.1:8083/demo/entities/guild/');
      await page.locator('[data-organization-character="mira"] h3 a').click();
      await page.waitForURL('**/demo/entities/mira/');
      await context.close();
    }
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8083' + actual);
    assert.equal(await page.locator('[data-organization-character]').count(), 2);
    const link = page.locator('.organization-character h3 a').first(); const href = await link.getAttribute('href');
    await link.click(); assert.ok(page.url().endsWith(href));
    await context.close();
    assert.deepEqual(errors, []);
    console.log(`ORGANIZATION_PASS: ${checks} page/viewport checks, portraits/fallback/status, mentions vs membership, links, no-JS`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.name, error instanceof assert.AssertionError ? error.message : 'Organization check failed'); process.exitCode = 1; });
