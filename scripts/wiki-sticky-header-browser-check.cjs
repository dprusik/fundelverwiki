const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 720 }]) {
      const page = await browser.newPage({ viewport }); const errors = [];
      page.on('pageerror', e => errors.push(e.name));
      await page.goto('http://127.0.0.1:8083/przedmioty/staff-of-war/');
      await page.waitForSelector('body.js');
      await page.locator('.approved-prose img').evaluateAll(async imgs => { for (const img of imgs) { img.loading = 'eager'; await img.decode(); } });
      for (const y of [400, 900]) {
        await page.evaluate(y => scrollTo(0, y), y);
        assert.ok(await page.evaluate(() => scrollY > 200));
        const bar = await page.locator('.topbar').boundingBox(); assert.ok(Math.abs(bar.y) < 1);
        assert.ok(await page.locator('.top-search').evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }));
      }
      const before = await page.evaluate(() => scrollY);
      await page.locator('.top-search').click();
      assert.ok(await page.locator('#search-dialog').evaluate(el => el.open));
      assert.ok(await page.locator('#search-term').evaluate(el => el === document.activeElement));
      await page.keyboard.press('Escape');
      assert.ok(await page.locator('.top-search').evaluate(el => el === document.activeElement));
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - before) < 2, JSON.stringify({ viewport, before, after: await page.evaluate(() => scrollY) }));
      if (viewport.width < 1000) {
        await page.locator('#mobile-menu').click();
        assert.ok(await page.locator('#workspace').evaluate(el => el.inert));
        assert.ok(await page.locator('#panel-toggle').evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }));
        await page.keyboard.press('Escape');
        assert.ok(await page.locator('#mobile-menu').evaluate(el => el === document.activeElement));
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - before) < 2);
      } else {
        await page.locator('#panel-toggle').click();
        assert.ok(Math.abs((await page.locator('.topbar').boundingBox()).y) < 1);
      }
      await page.evaluate(() => document.getElementById('main').scrollIntoView());
      const main = await page.locator('#main').boundingBox(), bar = await page.locator('.topbar').boundingBox();
      assert.ok(main.y >= bar.y + bar.height, 'Anchor must remain below sticky header');
      await page.evaluate(() => scrollTo(0, 500));
      fs.mkdirSync('.publication-review', { recursive: true });
      if ([1440, 390].includes(viewport.width)) await page.screenshot({ path: `.publication-review/sticky-header-${viewport.width}.png` });
      assert.deepEqual(errors, []); await page.close();
    }
    console.log('PASS: sticky header 1440/390/844/320px; search and drawer after scrolling, stacking/focus/scroll restoration, collapsed desktop panel, anchor clearance.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
