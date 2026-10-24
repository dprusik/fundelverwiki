const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve('.publication-build/production');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  try {
    let route = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (route.endsWith('/')) route += 'index.html';
    const file = path.resolve(root, '.' + route);
    assert.ok(file.startsWith(root + path.sep));
    const bytes = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)], 'Content-Length': bytes.length, 'Cache-Control': 'no-store' });
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
  const entries = JSON.parse(fs.readFileSync('src/wiki/public-entries.json')).entries;
  const character = entries.find(entry => entry.title === 'Bekrit');
  const journal = entries.find(entry => entry.permalink.includes('dziennik-terogona'));
  const measurements = [];
  try {
    for (const width of [1440, 390, 320]) {
      for (const entry of [character, journal]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const requests = [], errors = [];
        page.on('request', req => requests.push(req.url()));
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + entry.permalink);
        await page.waitForSelector('body.js');
        const trigger = page.locator(entry === character ? '.profile-portrait [data-image-viewer]' : '.approved-prose [data-image-viewer]').first();
        const image = trigger.locator('img');
        const original = await trigger.getAttribute('href');
        assert.ok(!requests.includes(base + original), 'Original must not load for the thumbnail');
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(img => img.decode());
        const source = await image.evaluate(img => img.currentSrc);
        assert.ok(source.includes('/img/optimized/'));
        assert.ok(!requests.includes(base + original));
        const originalBytes = fs.statSync(path.join(root, decodeURIComponent(original))).size;
        const previewBytes = fs.statSync(path.join(root, decodeURIComponent(new URL(source).pathname))).size;
        assert.ok(previewBytes < originalBytes * 0.3, 'Preview should transfer substantially fewer bytes');
        assert.ok(await page.locator('.brand img').evaluate(img => img.currentSrc.includes('/img/optimized/')));
        await trigger.click();
        await page.locator('#image-dialog[open]').waitFor();
        await page.locator('#image-dialog-image').evaluate(img => img.decode());
        assert.equal(await page.locator('#image-dialog-image').getAttribute('src'), original);
        assert.equal(await page.locator('#image-dialog-original').getAttribute('href'), original);
        assert.ok(requests.includes(base + original));
        await page.keyboard.press('Escape');
        assert.ok(await trigger.evaluate(el => el === document.activeElement));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        assert.deepEqual(errors, []);
        fs.mkdirSync('.publication-review/image-performance', { recursive: true });
        await page.screenshot({ path: `.publication-review/image-performance/${entry === character ? 'portrait' : 'journal'}-${width}.png` });
        measurements.push({ entry: entry.title, viewport: width, originalBytes, previewBytes });
        await page.close();
      }
    }
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.goto(base + character.permalink);
    const link = page.locator('.profile-portrait a');
    const source = await link.getAttribute('href');
    await link.click();
    assert.equal(new URL(page.url()).pathname, source);
    console.log(JSON.stringify({ status: 'PASS', views: measurements, originalWithoutJavaScript: true }, null, 2));
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
