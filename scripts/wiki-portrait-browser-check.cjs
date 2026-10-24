const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const entries = JSON.parse(fs.readFileSync('src/wiki/public-entries.json')).entries.filter(entry => entry.kind === 'character');
  const browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
  let checks = 0;
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 720 }]) {
      const page = await browser.newPage({ viewport }); const errors = [];
      page.on('pageerror', e => errors.push(e.name));
      for (const [index, entry] of entries.entries()) {
        await page.goto('http://127.0.0.1:8083' + entry.permalink); await page.waitForSelector('body.js');
        const trigger = page.locator('.profile-portrait [data-image-viewer]');
        assert.equal(await trigger.count(), 1);
        assert.equal(await page.locator('.entity-image-placeholder').count(), 0);
        const source = await trigger.getAttribute('href');
        assert.equal(await trigger.locator('img').getAttribute('src'), source);
        assert.equal(await page.locator('.approved-prose img').count(), 0);
        await trigger.scrollIntoViewIfNeeded();
        const before = await page.evaluate(() => scrollY);
        await trigger.click(); await page.locator('#image-dialog[open]').waitFor();
        const full = page.locator('#image-dialog-image');
        await full.evaluate(img => img.decode());
        assert.equal(await full.getAttribute('src'), source);
        assert.equal(await full.evaluate(img => getComputedStyle(img).objectFit), 'contain');
        assert.equal(await full.evaluate(img => getComputedStyle(img).transform), 'none');
        const size = await full.evaluate(img => ({ width: img.getBoundingClientRect().width, height: img.getBoundingClientRect().height, ratio: img.naturalWidth / img.naturalHeight }));
        assert.ok(Math.abs(size.width / size.height - size.ratio) < .02);
        const modal = await page.locator('#image-dialog').boundingBox();
        assert.ok(modal.width <= viewport.width && modal.height <= viewport.height);
        assert.equal(await page.locator('#image-dialog-original').getAttribute('href'), source);
        if (entry.title === 'Bekrit' && [1440, 390].includes(viewport.width)) {
          fs.mkdirSync('.publication-review', { recursive: true });
          await page.screenshot({ path: `.publication-review/bekrit-full-art-${viewport.width}.png` });
        }
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.getElementById('image-dialog').open);
        assert.ok(await trigger.evaluate(el => el === document.activeElement));
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - before) < 2);
        if (index === 0) {
          await trigger.focus(); await page.keyboard.press('Enter');
          assert.ok(await page.locator('#image-dialog').evaluate(el => el.open));
          await page.keyboard.press('Tab');
          assert.ok(await page.locator('#image-dialog').evaluate(el => el.contains(document.activeElement)));
          await page.locator('#image-dialog-close').click();
          await trigger.click(); await page.mouse.click(1, 1);
          await page.waitForFunction(() => !document.getElementById('image-dialog').open);
          await trigger.click(); await page.keyboard.press('Control+k');
          assert.equal(await page.locator('dialog[open]').count(), 1);
          assert.ok(await page.locator('#search-dialog').evaluate(el => el.open));
          assert.ok(await page.locator('#search-term').evaluate(el => el === document.activeElement));
          await page.keyboard.press('Escape');
        }
        if (entry.title === 'Bekrit' && [1440, 390].includes(viewport.width)) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: `.publication-review/bekrit-portrait-${viewport.width}.png`, fullPage: true });
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        checks++;
      }
      assert.deepEqual(errors, []); await page.close();
    }
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await page.goto('http://127.0.0.1:8083' + entries[0].permalink);
    const source = await page.locator('.profile-portrait a').getAttribute('href');
    await page.locator('.profile-portrait a').click();
    await page.waitForURL('**' + source);
    assert.equal(new URL(page.url()).pathname, source);
    await page.close();
    console.log(`PASS: ${checks} approved character portraits and full-art modals, unchanged image URLs/aspect ratios, Escape/button/backdrop/keyboard/focus, modal→search, no-JS original link.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
