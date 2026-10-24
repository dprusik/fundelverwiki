// Visits only links from the approved embedded map projection.
const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
  let checks = 0;
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 720 }]) {
      const page = await browser.newPage({ viewport }); const errors = [];
      page.on('pageerror', e => errors.push(e.name));
      assert.equal((await page.goto('http://127.0.0.1:8083/maps/neverwinter/')).status(), 200);
      assert.equal(await page.locator('.approved-prose').count(), 0, 'Atlas does not repeat the article');
      assert.equal(await page.locator('[data-map-article]').getAttribute('href'), '/dnd/wiki/neverwinter/');
      assert.equal(await page.locator('.breadcrumbs a[href="/catalog/maps/"]').count(), 1);
      const data = JSON.parse(await page.locator('#map-data').textContent());
      assert.equal(data.unresolved_links, 0);
      assert.equal(data.map.markers.length, 11);
      await page.waitForFunction(() => document.getElementById('status').textContent.startsWith('Zatwierdzona mapa'));
      assert.ok(!(await page.locator('#status').textContent()).includes('build pozostaje zablokowany'));
      const destinations = new Set();
      for (const marker of data.map.markers) {
        assert.ok(marker.url.startsWith('/dnd/wiki/lokacje/neverwinter/'));
        destinations.add(marker.url);
        await page.locator(`#markers button[data-marker-id="${marker.id}"]`).click();
        const link = page.locator('#marker-link a');
        assert.equal(await link.getAttribute('href'), marker.url);
        await link.click(); await page.waitForURL('**' + marker.url);
        assert.equal(await page.locator('h1').textContent(), marker.name);
        assert.equal(await page.locator('.breadcrumbs a[href="/dnd/wiki/neverwinter/"]').count(), 1);
        const article = await page.locator('.approved-prose').textContent();
        assert.ok(article.includes(marker.description.trim()));
        assert.ok(article.includes('Położenie: Neverwinter'));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (checks === 0 || checks === 11) {
          fs.mkdirSync('.publication-review', { recursive: true });
          await page.screenshot({ path: `.publication-review/neverwinter-location-${viewport.width}.png`, fullPage: true });
        }
        assert.equal(await page.locator('.approved-prose a[href="/dnd/wiki/neverwinter/"]').count(), 1);
        await page.locator('[data-atlas-link][href="/maps/neverwinter/"]').click();
        await page.waitForURL('**/maps/neverwinter/');
        checks++;
      }
      assert.equal(destinations.size, 11);
      await page.goto('http://127.0.0.1:8083/catalog/locations/');
      for (const marker of data.map.markers) assert.equal(await page.locator(`main a[href="${marker.url}"]`).count(), 0, 'Child locations are inside their place article');
      assert.equal(await page.locator('main [data-location-group]').count(), 1);
      await page.locator('main [data-location-group]').click();
      await page.waitForURL('**/dnd/wiki/neverwinter/');
      assert.equal(await page.locator('#map-data,#map').count(), 0, 'City article does not embed the interactive viewer');
      const directory = page.locator('main .catalog-disclosure');
      assert.equal(await directory.count(), 1);
      assert.equal(await directory.locator('[data-approved-id]').count(), 11);
      assert.equal(await directory.evaluate(el => el.open), false);
      await directory.locator('summary').click();
      for (const marker of data.map.markers) assert.equal(await directory.locator(`a[href="${marker.url}"]`).count(), 1);
      const grid = directory.locator('.entry-grid');
      assert.ok((await grid.boundingBox()).height <= Math.min(viewport.height * .6, 600) + 1);
      assert.ok(await grid.evaluate(el => el.scrollHeight > el.clientHeight));
      await grid.focus(); await page.keyboard.press('End'); await page.waitForTimeout(300);
      assert.ok(await grid.evaluate(el => el.scrollTop > 0));
      assert.equal(await page.locator('.breadcrumbs a[href="/catalog/locations/"]').count(), 1);
      await page.locator('[data-atlas-link]').click();
      await page.waitForURL('**/maps/neverwinter/');
      await page.locator('[data-map-article]').click();
      await page.waitForURL('**/dnd/wiki/neverwinter/');
      if ([1440, 390].includes(viewport.width)) {
        await page.locator('.catalog-disclosure summary').click();
        await page.screenshot({ path: `.publication-review/neverwinter-article-separated-${viewport.width}.png`, fullPage: true });
      }
      await page.goto('http://127.0.0.1:8083/catalog/maps/');
      assert.equal(await page.locator('[data-map-view-id]').count(), 1);
      await page.locator('[data-map-view-id]').click(); await page.waitForURL('**/maps/neverwinter/');
      await page.locator('.map-marker').first().waitFor();
      if ([1440, 390].includes(viewport.width)) await page.screenshot({ path: `.publication-review/neverwinter-atlas-separated-${viewport.width}.png`, fullPage: true });
      assert.deepEqual(errors, []); await page.close();
    }
    const page = await browser.newPage({ javaScriptEnabled: false });
    const index = JSON.parse(fs.readFileSync('.wiki-preview/approved-search.json'));
    const location = index.entries.find(e => e.url.startsWith('/dnd/wiki/lokacje/neverwinter/'));
    await page.goto('http://127.0.0.1:8083/catalog/locations/');
    await page.locator('main [data-location-group]').click();
    await page.waitForURL('**/dnd/wiki/neverwinter/');
    await page.locator('.catalog-disclosure summary').click();
    await page.locator(`.catalog-disclosure a[href="${location.url}"]`).click();
    await page.waitForURL('**' + location.url);
    assert.equal(await page.locator('h1').textContent(), location.title);
    assert.equal(await page.locator('.approved-prose a[href="/dnd/wiki/neverwinter/"]').count(), 1);
    await page.locator('[data-atlas-link]').click();
    await page.waitForURL('**/maps/neverwinter/');
    assert.ok((await page.locator('main noscript').textContent()).includes('Włącz JavaScript'));
    await page.locator('[data-map-article]').click(); await page.waitForURL('**/dnd/wiki/neverwinter/');
    assert.equal(await page.locator('#map-data').count(), 0);
    await page.close();
    console.log(`PASS: ${checks} atlas→location→atlas round trips; distinct place article and map viewer, both catalogs, article↔atlas links, canonical breadcrumbs, no-JS fallback at desktop/portrait/landscape/320px.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
