const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const nunjucks = require('nunjucks');
// Boundary checks use invented entries only; no registry changes.
const templates = new nunjucks.Environment(new nunjucks.FileSystemLoader('src/wiki-ui/templates'));
for (const count of [1, 6, 7, 50]) {
  const html = templates.render('collapsible-catalog.njk', { disclosureId: 'test', disclosureTitle: 'Fixture', disclosureEntries: Array.from({ length: count }, (_, i) => ({ id: `test-${i}`, title: `Fixture ${i}`, url: `/fixture/${i}/`, kindLabel: 'Postać' })) });
  assert.equal(/<details[^>]*\sopen[\s>]/.test(html), count <= 6);
  assert.equal((html.match(/data-approved-id=/g) || []).length, count);
}
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
  let checks = 0;
  try {
    for (const width of [1440, 390, 320, 844]) for (const javaScriptEnabled of [true, false]) {
      const height = width === 844 ? 390 : width === 390 ? 844 : 1000;
      const page = await browser.newPage({ viewport: { width, height }, javaScriptEnabled, hasTouch: width < 1000, isMobile: width < 1000 });
      const errors = []; page.on('pageerror', e => errors.push(e.name));
      for (const route of ['/catalog/characters/', '/organizations/']) {
        assert.equal((await page.goto('http://127.0.0.1:8083' + route)).status(), 200);
        const disclosures = page.locator('main details.catalog-disclosure');
        assert.equal(await disclosures.count(), route.includes('characters') ? 2 : 1);
        for (const disclosure of await disclosures.all()) {
          const cards = disclosure.locator('[data-approved-id]'), count = await cards.count();
          assert.ok(count > 0);
          const initial = count <= 6;
          assert.equal(await disclosure.evaluate(el => el.open), initial);
          const urls = await cards.evaluateAll(nodes => nodes.map(el => el.getAttribute('href')));
          const summary = disclosure.locator('summary');
          await summary.focus(); await page.keyboard.press('Enter');
          assert.equal(await disclosure.evaluate(el => el.open), !initial);
          await page.keyboard.press('Space');
          assert.equal(await disclosure.evaluate(el => el.open), initial);
          if (!initial) await summary.click();
          assert.ok(await cards.first().isVisible());
          const grid = disclosure.locator('.entry-grid');
          assert.equal(await grid.getAttribute('role'), 'region');
          assert.equal(await grid.getAttribute('aria-labelledby'), await summary.locator('h2').getAttribute('id'));
          assert.ok((await grid.boundingBox()).height <= Math.min(height * .6, 600) + 1);
          if (count > 6) {
            assert.ok(await grid.evaluate(el => el.scrollHeight > el.clientHeight));
            await grid.focus();
            const heading = await summary.boundingBox(), pageScroll = await page.evaluate(() => scrollY);
            await page.keyboard.press('End');
            await page.waitForTimeout(300);
            assert.ok(await grid.evaluate(el => el.scrollTop > 0), JSON.stringify({ width, javaScriptEnabled, active: await grid.evaluate(el => el === document.activeElement), geometry: await grid.evaluate(el => ({ top: el.scrollTop, h: el.clientHeight, sh: el.scrollHeight })) }));
            assert.ok(Math.abs((await summary.boundingBox()).y - heading.y) < 1, 'Heading stays outside the scroll area');
            assert.ok(Math.abs(await page.evaluate(() => scrollY) - pageScroll) < 1, 'Keyboard scroll stays inside the list');
            if (javaScriptEnabled && width < 1000) {
              await grid.evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
              await grid.scrollIntoViewIfNeeded();
              const box = await grid.boundingBox(), x = box.x + box.width / 2;
              const cdp = await page.context().newCDPSession(page);
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: box.y + box.height * .8, id: 1 }] });
              for (const fraction of [.6, .4, .2]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: box.y + box.height * fraction, id: 1 }] });
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
              await page.waitForFunction(id => document.getElementById(id).querySelector('.entry-grid').scrollTop > 0, await disclosure.getAttribute('id'));
            }
          }
          assert.deepEqual(await cards.evaluateAll(nodes => nodes.map(el => el.getAttribute('href'))), urls);
          await summary.click(); assert.equal(await cards.first().isVisible(), false);
          assert.ok(await summary.isVisible());
          checks++;
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
      if (width === 390 && javaScriptEnabled) {
        fs.mkdirSync('.publication-review', { recursive: true });
        await page.goto('http://127.0.0.1:8083/catalog/characters/');
        await page.screenshot({ path: '.publication-review/characters-collapsed.png', fullPage: true });
        await page.locator('#all-characters summary').click();
        await page.screenshot({ path: '.publication-review/characters-expanded.png', fullPage: true });
      }
      // Large synthetic catalogs exercise layout limits without publishing fixtures.
      for (const count of [1, 50]) {
        const html = templates.render('collapsible-catalog.njk', { disclosureId: 'stress', disclosureTitle: 'Przykładowe postacie', disclosureEntries: Array.from({ length: count }, (_, i) => ({ id: `test-${i}`, title: `Postać testowa ${i}`, url: `/fixture/${i}/`, kindLabel: 'Postać' })) });
        await page.locator('main').evaluate((main, html) => { main.innerHTML = html; }, html);
        const disclosure = page.locator('#stress');
        if (count > 6) await disclosure.locator('summary').click();
        const grid = disclosure.locator('.entry-grid');
        assert.ok((await grid.boundingBox()).height <= Math.min(height * .6, 600) + 1);
        assert.equal(await grid.evaluate(el => el.scrollHeight > el.clientHeight), count === 50);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
      assert.deepEqual(errors, []); await page.close();
    }
    console.log(`PASS: ${checks} disclosures at 1440/390/320/844px with/without JS; bounded scroll, heading/page stability, keyboard/touch, links/counts, short/50-entry lists and default threshold.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
