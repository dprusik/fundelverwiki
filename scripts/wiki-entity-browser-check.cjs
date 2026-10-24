const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
  const output = path.resolve('docs/artifacts/wiki-entities');
  fs.mkdirSync(output, { recursive: true });
  const errors = [];
  const base = 'http://127.0.0.1:8081';
  const examples = [
    { id: 'mira', name: 'character', portrait: true, status: 'Żyje' },
    { id: 'oskar', name: 'character-no-portrait', portrait: false, status: 'Nieznany' },
    { id: 'lea', name: 'character-no-status', portrait: true },
    { id: 'harbor', name: 'location', related: 2, illustration: true },
    { id: 'ridge', name: 'location-empty', related: 0, illustration: false }
  ];
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      for (const example of examples) {
        await page.goto(`${base}/demo/entities/${example.id}/`);
        await page.waitForSelector('body.js');
        assert.equal(await page.locator('h1').count(), 1);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${example.id}: overflow`);
        for (const image of await page.locator('main img').all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(element => element.decode());
          assert.ok(await image.evaluate(element => element.naturalWidth > 0));
        }
        if (example.related === undefined) {
          assert.equal(await page.locator('.profile-portrait img').count(), example.portrait ? 1 : 0);
          assert.equal(await page.locator('.character-status strong').count(), example.status ? 1 : 0);
          if (example.status) assert.equal(await page.locator('.character-status strong').textContent(), example.status);
          assert.ok(await page.locator('.profile-body').textContent());
        } else {
          assert.equal(await page.locator('.location-character').count(), example.related);
          assert.equal(await page.locator('.location-illustration img').count(), example.illustration ? 1 : 0);
          assert.equal(await page.getByRole('button', { name: 'Pokaż na mapie' }).isDisabled(), true);
          if (!example.related) assert.ok(await page.locator('.location-characters .empty-state').isVisible());
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, `${example.name}-${viewport.width}.png`), fullPage: true });
      }
      await page.goto(`${base}/demo/entities/harbor/`);
      await page.locator('.location-character').first().click();
      await page.waitForURL('**/demo/entities/mira/');
      assert.equal(await page.locator('.profile-connection-grid a[href="/demo/entities/harbor/"]').count(), 1);
      assert.equal(await page.locator('.profile-connection-grid a[href="/demo/entities/gardens/"]').count(), 1);
      await context.close();
    }
    const narrow = await browser.newPage({ viewport: { width: 320, height: 720 } });
    for (const example of examples) {
      await narrow.goto(`${base}/demo/entities/${example.id}/`);
      assert.ok(await narrow.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `320px: ${example.id}`);
    }
    await narrow.close();
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await noJs.newPage();
    await page.goto(`${base}/demo/entities/harbor/`);
    assert.equal(await page.locator('.location-character').count(), 2);
    await page.locator('.location-character').first().click();
    assert.equal(await page.locator('.profile-portrait img').count(), 1);
    assert.equal(await page.locator('.character-status strong').textContent(), 'Żyje');
    await noJs.close();
    assert.deepEqual(errors, []);
    console.log('PASS: entity pages at 1440/390/320px, 10 screenshots, optional portrait/status/illustration, empty relations, image loading, canonical links, no-JS; no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
