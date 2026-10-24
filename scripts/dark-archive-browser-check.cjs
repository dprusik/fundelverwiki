const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = 'http://127.0.0.1:8083';
const output = path.resolve('docs/artifacts/dark-archive');
const lum = value => {
  const channels = value.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
};
const contrast = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
  const errors = [], checks = [];
  const entries = JSON.parse(fs.readFileSync('src/wiki/public-entries.json')).entries;
  const longArticle = entries.find(entry => entry.category === 'documents').permalink;
  const pages = [
    ['home', '/'], ['characters', '/catalog/characters/'],
    ['npc-demo', '/demo/entities/mira/'], ['location-demo', '/demo/entities/harbor/'],
    ['filters-demo', '/demo/catalog/characters/'], ['organization-demo', '/demo/entities/guild/'],
    ['long-article', longArticle], ['map', '/maps/neverwinter/']
  ];
  try {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 } });
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.name));
      for (const [name, route] of pages) {
        assert.equal((await page.goto(base + route)).status(), 200);
        await page.waitForSelector('body.js');
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark-archive');
        assert.equal(await page.locator('.campaign-banner').count(), 1, 'Configured banner component');
        if (width <= 600) assert.equal(await page.locator('.campaign-banner').isVisible(), false);
        assert.equal(await page.locator('h1').count(), 1);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: ${width}px overflow`);
        const surfaces = await page.locator('body,.rail,.topbar,.entry-card,.category-card,.filters,.prose,.wiki-map-details').evaluateAll(nodes => nodes.map(node => ({ tag: node.className, bg: getComputedStyle(node).backgroundColor })).filter(item => item.bg !== 'rgba(0, 0, 0, 0)'));
        for (const surface of surfaces) assert.ok(lum(surface.bg) < .09, `${name}: light surface ${surface.tag}`);
        for (const image of await page.locator('main img').all()) {
          await image.evaluate(async node => { node.loading = 'eager'; await node.decode(); });
          const size = await image.boundingBox(); if (size) assert.ok(size.width <= width, `${name}: image overflow`);
          assert.equal(await image.evaluate(node => getComputedStyle(node).filter), 'none');
        }
        if (name === 'long-article') {
          const prose = await page.locator('.prose').evaluate(node => ({ width: node.getBoundingClientRect().width, size: parseFloat(getComputedStyle(node).fontSize), line: parseFloat(getComputedStyle(node).lineHeight), color: getComputedStyle(node).color, bg: getComputedStyle(node).backgroundColor }));
          assert.ok(prose.width <= 740 && prose.size >= 16 && prose.line / prose.size >= 1.5);
          assert.ok(contrast(prose.color, prose.bg) >= 4.5);
        }
        if (width !== 320 && ['home', 'characters', 'npc-demo', 'location-demo', 'long-article'].includes(name)) await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
        checks.push({ page: name, width, darkSurfaces: surfaces.length });
      }
      await page.goto(base + '/'); await page.waitForSelector('body.js');
      if (width === 1440) {
        assert.ok(await page.locator('.campaign-banner--hero').isVisible());
        const control = await page.locator('.home-search').boundingBox();
        const title = await page.locator('h1').boundingBox();
        const banner = await page.locator('.campaign-banner--hero').boundingBox();
        assert.ok(banner.x >= control.x + control.width && banner.x >= title.x, 'Banner remains beside main control');
        await page.locator('.campaign-banner').evaluate(node => node.remove());
        await page.locator('html').evaluate(node => node.dataset.banner = 'absent');
        assert.deepEqual(await page.locator('.home-search').boundingBox(), control, 'No layout dependency on banner');
        await page.screenshot({ path: path.join(output, 'home-no-banner-1440.png'), fullPage: true });
      }
      await page.locator('.top-search').focus();
      const focused = await page.locator('.top-search').evaluate(node => ({ style: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth), color: getComputedStyle(node).outlineColor, bg: getComputedStyle(document.querySelector('.topbar')).backgroundColor }));
      assert.ok(focused.style !== 'none' && focused.width >= 2 && contrast(focused.color, focused.bg) >= 3);
      if (width < 1000) {
        await page.locator('#mobile-menu').click();
        assert.ok(await page.locator('#workspace').evaluate(node => node.inert));
        assert.ok(lum(await page.locator('.rail').evaluate(node => getComputedStyle(node).backgroundColor)) < .09);
        if (width === 390) await page.screenshot({ path: path.join(output, 'drawer-390.png') });
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'mobile-menu');
      }
      await page.keyboard.press('Control+k');
      await page.locator('#search-term').fill(entries[0].title);
      await page.waitForSelector('#search-results a');
      const dialog = await page.locator('#search-dialog').evaluate(node => ({ bg: getComputedStyle(node).backgroundColor, text: getComputedStyle(node).color }));
      assert.ok(lum(dialog.bg) < .09 && contrast(dialog.text, dialog.bg) >= 4.5);
      if (width !== 320) await page.screenshot({ path: path.join(output, `search-${width}.png`) });
      await page.keyboard.press('Escape');
      await page.locator('html').evaluate(node => node.dataset.texture = 'none');
      assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).backgroundImage), 'none');
      assert.equal(await page.locator('.hero').evaluate(node => getComputedStyle(node).backgroundImage), 'none');
      await context.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify({ checks, banner: true, withoutBannerFallback: true, noTextures: true, searchAndDrawer: true, jsErrors: errors }, null, 2));
    console.log(`DARK_ARCHIVE_PASS: ${checks.length} page/viewport checks, dark surfaces, contrast/focus, drawer/search, banner/fallback/no-texture, images, long text`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.name, error instanceof assert.AssertionError ? error.message : 'Dark Archive browser check failed'); process.exitCode = 1; });
