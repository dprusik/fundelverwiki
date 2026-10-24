const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.WIKI_PREVIEW_URL || 'http://127.0.0.1:8081';
const publication = process.argv.includes('--publication');
const fixture = { schema_version: 1, demonstration: false, entries: [
  { id: 'one', title: 'Łódź', aliases: ['Przeprawa'], body: 'Wstęp. '.repeat(60) + 'Bursztynowy sekret mostu.', summary: 'Inny opis', url: '/test/lodz/' },
  { id: 'two', title: '<img src=x onerror=alert(1)>', body: 'Łódź w opisie', url: '/test/html/' },
  { id: 'unicode', title: 'Żółty Szlak', body: '', url: '/Wiki/Żółty-Szlak/' },
  ...['//evil.test/', 'https://evil.test/', 'javascript:alert(1)', 'relative/path/', '/DEMO/entities/mira/', '/assets/test/', '/entities/test/', '/catalog/test/', '/test/%61/', '/test/../', '/test/./', '/test/?x=1', '/test/\\evil/'].map((url, i) => ({ id: `bad${i}`, title: 'Łódź', body: '', url }))
] };
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
  const errors = [];
  let checks = 0;
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 720 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.name));
      const requested = [];
      page.on('request', request => requested.push(new URL(request.url()).pathname));
      let failures = 1;
      let delayed;
      await page.route('**/approved-search.json', async route => {
        if (delayed) await delayed;
        if (failures-- > 0) return route.fulfill({ status: 503, body: '{}' });
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) });
      });
      await page.goto(base + '/');
      await page.waitForSelector('body.js');
      assert.equal(await page.locator('#search-dialog').getAttribute('data-search-scope'), 'approved');
      if (viewport.width < 1000) {
        await page.locator('#mobile-menu').click();
        await page.locator('#navigation [data-search]').click();
        assert.equal(await page.locator('#workspace').evaluate(node => node.inert), false);
      } else await page.keyboard.press('Control+k');
      await page.locator('#search-term').fill('lodz');
      await page.locator('#search-status button').waitFor();
      await page.locator('#search-status button').click();
      await page.waitForFunction(() => document.querySelectorAll('#search-results a').length === 2);
      assert.equal(await page.locator('#search-results a').first().textContent(), 'Łódź');
      assert.equal(await page.locator('#search-results img').count(), 0);
      await page.locator('#search-term').fill('zolty');
      await page.waitForFunction(() => document.querySelector('#search-results a')?.textContent === 'Żółty Szlak');
      assert.equal(await page.locator('#search-results a').getAttribute('href'), '/Wiki/Żółty-Szlak/');
      assert.ok((await page.locator('#search-hint').textContent()).includes('kartach obrazkowych'));
      await page.locator('#search-term').fill('przeprawa');
      await page.waitForFunction(() => document.querySelectorAll('#search-results a').length === 1 && document.querySelector('#search-results a').textContent === 'Łódź');
      assert.equal(await page.locator('#search-results a').textContent(), 'Łódź');
      await page.locator('#search-term').fill('bursztynowy');
      await page.waitForFunction(() => document.querySelector('#search-results p')?.textContent.includes('Bursztynowy'));
      assert.ok((await page.locator('#search-results p').textContent()).startsWith('…'));
      if (viewport.width === 1440 || viewport.width === 390) {
        const directory = path.resolve('.publication-review/search-visual-check');
        fs.mkdirSync(directory, { recursive: true });
        await page.screenshot({ path: path.join(directory, `search-results-${viewport.width}.png`), fullPage: true });
      }
      await page.locator('#search-term').fill('<img');
      await page.waitForFunction(() => document.querySelector('#search-results a')?.textContent.startsWith('<img'));
      assert.equal(await page.locator('#search-results img').count(), 0);
      await page.locator('#search-term').fill('nieobecne-haslo');
      await page.waitForFunction(() => document.querySelector('#search-status').textContent.includes('Brak wyników'));
      await page.locator('#search-term').fill('');
      await page.waitForFunction(() => document.querySelector('#search-status').textContent.includes('Wpisz hasło'));
      assert.equal(await page.locator('#search-results li').count(), 0);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#search-dialog').evaluate(node => node.open), false);
      await page.locator('#home-query').fill('przeprawa');
      await page.locator('.home-search button').click();
      await page.waitForSelector('#search-results a');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement.id === 'home-query');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'home-query');
      assert.ok(!requested.includes('/demo-search.json') && !requested.includes('/searchIndex.json'));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      // A pending request must not repaint a dismissed dialog or a newer empty query.
      await page.reload();
      let release;
      delayed = new Promise(resolve => { release = resolve; });
      await page.keyboard.press('Control+k');
      await page.locator('#search-term').fill('lodz');
      await page.waitForRequest('**/approved-search.json');
      await page.keyboard.press('Escape');
      await page.keyboard.press('Control+k');
      release();
      await page.waitForFunction(() => document.querySelector('#search-status').textContent.includes('Wpisz hasło'));
      await page.waitForTimeout(300);
      assert.equal(await page.locator('#search-results li').count(), 0);
      await context.close();
      checks++;
    }
    // Publication checks the real approved index and missing-page behavior.
    // The separate prototype mode retains its approved/demo isolation scenario.
    const context = await browser.newContext();
    const page = await context.newPage();
    const index = JSON.parse(fs.readFileSync(path.join(publication ? '.publication-build/production' : '.wiki-preview', 'approved-search.json'), 'utf8'));
    assert.ok(index.entries.length > 0);
    const requests = [];
    page.on('request', request => requests.push(new URL(request.url()).pathname));
    await page.goto(base + '/');
    await page.keyboard.press('Control+k');
    await page.locator('#search-term').fill(index.entries[0].title);
    await page.waitForSelector('#search-results a');
    assert.ok((await page.locator('#search-results a').allTextContents()).includes(index.entries[0].title));
    assert.ok(!requests.includes('/demo-search.json'));
    requests.length = 0;
    if (publication) {
      for (const missing of ['/__wiki_missing_page__/', '/__wiki_missing_page__.html']) {
        const response = await page.goto(base + missing);
        assert.equal(response.status(), 404, 'Missing pages must return HTTP 404');
        assert.equal(await page.locator('h1').textContent(), 'Nie znaleziono strony');
        assert.equal((await context.request.head(base + missing)).status(), 404);
      }
      await page.keyboard.press('Control+k');
      await page.locator('#search-term').fill(index.entries[0].title);
      await page.waitForSelector('#search-results a');
      assert.ok((await page.locator('#search-results a').allTextContents()).includes(index.entries[0].title));
      assert.ok(requests.includes('/approved-search.json') && !requests.includes('/demo-search.json'));
      await page.keyboard.press('Escape');
      await page.getByRole('link', { name: 'Wróć na stronę główną' }).click();
      assert.equal(new URL(page.url()).pathname, '/');
    } else {
      await page.goto(base + '/demo/');
      await page.keyboard.press('Control+k');
      await page.locator('#search-term').fill('rysowniczka map');
      await page.waitForSelector('#search-results a');
      assert.equal(await page.locator('#search-results a').first().textContent(), 'Mira Wędrowna');
      assert.ok(requests.includes('/demo-search.json') && !requests.includes('/approved-search.json'));
    }
    await context.close();
    assert.deepEqual(errors, []);
    console.log(`SEARCH_BROWSER_PASS: ${checks} viewports, title/alias/body/snippet, retry, URL/XSS isolation, delayed close/reopen, ${publication ? 'approved index and HTTP 404 GET/HEAD' : 'real approved/demo scopes'}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.name, error instanceof assert.AssertionError ? error.message : 'Search browser check failed'); if (process.env.WIKI_BROWSER_DEBUG) console.error(error); process.exitCode = 1; });
