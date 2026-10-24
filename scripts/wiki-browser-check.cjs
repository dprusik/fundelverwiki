// Optional browser checks. Uses Playwright supplied by the local tooling environment.
const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
  const screenshotDir = path.resolve('docs/artifacts/wiki-layout-2');
  fs.mkdirSync(screenshotDir, { recursive: true });
  const errors = [];
  const base = 'http://127.0.0.1:8081';
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => assert.ok(!request.url().includes('searchIndex.json'), 'Must not fetch production index'));
      for (const [name, route] of [['home', '/demo/'], ['characters', '/demo/catalog/characters/?group=faction'], ['faction', '/demo/entities/guild/']]) {
        await page.goto(base + route);
        await page.waitForSelector('body.js');
        if (name === 'characters') await page.waitForFunction(() => document.querySelector('#catalog-status').textContent.includes('unikalne'));
        assert.equal(await page.locator('h1').count(), 1);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: overflow at ${viewport.width}`);
        await page.screenshot({ path: path.join(screenshotDir, `${name}-${viewport.width}.png`), fullPage: true });
      }
      await page.goto(base + '/demo/catalog/characters/');
      await page.waitForFunction(() => document.querySelector('#catalog-status').textContent.includes('unikalne'));
      await page.locator('#group').selectOption('faction');
      assert.equal(await page.locator('[data-group-mode="faction"] [data-character-id="mira"]:visible').count(), 2);
      await page.locator('#faction').selectOption('circle');
      await page.locator('#location').selectOption('harbor');
      await page.waitForFunction(() => document.querySelector('#catalog-status').textContent.includes('Postacie: 1'));
      assert.ok(page.url().includes('faction=circle'));
      await page.reload();
      await page.waitForFunction(() => document.querySelector('#catalog-status').textContent.includes('Postacie: 1'));
      await page.locator('#faction').selectOption('guild');
      await page.locator('#location').selectOption('gardens');
      await page.waitForFunction(() => document.querySelector('#catalog-status').textContent.includes('Postacie: 1'));
      await page.locator('#faction').selectOption('circle');
      await page.locator('#location').selectOption('harbor');
      await page.locator('button[type="reset"]').click();
      await page.waitForFunction(() => document.querySelector('#catalog-status').textContent.includes('Postacie: 3'));
      await page.locator('#location').selectOption('ridge');
      await page.waitForSelector('#catalog-empty:visible');
      await page.locator('button[type="reset"]').click();
      await page.waitForFunction(() => document.querySelector('#catalog-status').textContent.includes('Postacie: 3'));
      if (viewport.width < 1000) {
        await page.locator('#mobile-menu').click();
        assert.equal(await page.locator('#workspace').evaluate(element => element.inert), true);
        await page.locator('#navigation a').last().focus();
        await page.keyboard.press('Tab');
        assert.equal(await page.locator('#navigation a').first().evaluate(element => element === document.activeElement), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#mobile-menu').evaluate(element => element === document.activeElement), true);
        await page.locator('#mobile-menu').click();
        await page.locator('#navigation [data-search]').click();
      } else {
        await page.locator('#panel-toggle').click();
        assert.equal(await page.locator('#menu-links').isVisible(), false);
        await page.locator('.top-search').click();
      }
      await page.locator('#search-term').fill('rysowniczka map');
      await page.waitForSelector('#search-results a');
      assert.equal(await page.locator('#search-results a').first().textContent(), 'Mira Wędrowna');
      await page.locator('#search-term').fill('<img onerror=alert(1)>');
      await page.waitForFunction(() => document.querySelector('#search-status').textContent.includes('Brak wyników'));
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#search-dialog').evaluate(element => element.open), false);
      if (viewport.width < 1000) {
        await page.locator('#mobile-menu').click();
        await page.locator('#navigation a[href="/demo/organizations/"]').click();
        await page.waitForSelector('body.js');
        assert.equal(await page.locator('body').evaluate(element => element.classList.contains('drawer-open')), false);
        await page.locator('#mobile-menu').click();
        await page.setViewportSize({ width: 1100, height: 800 });
        assert.equal(await page.locator('#workspace').evaluate(element => element.inert), false);
      }
      await context.close();
    }
    const small = await browser.newPage({ viewport: { width: 320, height: 720 } });
    await small.goto(base + '/demo/'); await small.waitForSelector('body.js');
    assert.ok(await small.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const missing = await small.goto(base + '/does-not-exist/');
    assert.equal(missing.status(), 404);
    await small.waitForSelector('body.js');
    assert.equal(await small.locator('h1').textContent(), 'Nie znaleziono tej karty');
    assert.equal(await small.locator('.top-search').count(), 1);
    await small.close();
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await noJs.newPage(); await page.goto(base + '/demo/catalog/characters/');
    assert.equal(await page.locator('[data-group-mode="all"] [data-character-id]:visible').count(), 3);
    assert.equal(await page.locator('#menu-links').isVisible(), true);
    await noJs.close();
    assert.deepEqual(errors, []);
    console.log('PASS: desktop/mobile, 6 screenshots, grouping, filters/reload/reset, drawer/Escape/search, 320px, no-JS; no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
