const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { organizeApprovedCatalog } = require('../src/wiki-ui/catalog.cjs');
const { applyCatalogVisibility } = require('../src/wiki-ui/catalog-visibility.cjs');
const { organizeLocationNavigation } = require('../src/wiki-ui/location-navigation.cjs');
const { prepareLocalArticles } = require('../src/helpers/wiki/local-articles.cjs');
const { buildAtlasViews } = require('../src/wiki-ui/atlas.cjs');
const { entityImageView } = require('../src/wiki-ui/character-portrait.cjs');
const { parse } = require('node-html-parser');

// Read only active public metadata; never visit pending source paths.
(async () => {
  const entries = JSON.parse(fs.readFileSync('src/wiki/public-entries.json', 'utf8')).entries;
  const catalog = applyCatalogVisibility(organizeApprovedCatalog(entries.map(entry => ({ ...entry, url: entry.permalink }))));
  const local = prepareLocalArticles(process.cwd());
  const navigation = organizeLocationNavigation(catalog.entries, local.catalog, require('../src/wiki-ui/location-navigation.json'));
  const atlas = buildAtlasViews(local.maps, require('../src/wiki-ui/atlas-navigation.json'), local.catalog.map(entry => entry.url));
  const output = path.resolve('.publication-review/article-visual-check');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
  const errors = [];
  let checks = 0;
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 720 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.name));
      const routes = [
        { url: '/', count: null },
        { url: '/approved/', count: catalog.total },
        { url: '/organizations/', count: catalog.organizations.length },
        ...catalog.sections.map(section => ({ url: `/catalog/${section.id}/`, count: section.id === 'maps' ? 0 : section.id === 'locations' ? navigation.ungrouped.length : section.id === 'items' ? section.catalogCount : section.count, locationGroups: section.id === 'locations' ? navigation.groups : null, atlasMaps: section.id === 'maps' ? atlas : null }))
      ];
      for (const route of routes) {
        assert.equal((await page.goto('http://127.0.0.1:8081' + route.url)).status(), 200);
        await page.waitForSelector('body.js');
        assert.equal(await page.locator('h1').count(), 1);
        assert.ok(await page.locator('[data-search]').count() > 0);
        assert.equal(await page.locator('#search-dialog').getAttribute('data-search-scope'), 'approved');
        if (route.count !== null) assert.equal(await page.locator('main [data-approved-id]').count(), route.count);
        if (route.url === '/catalog/items/') {
          const thumbnails = page.locator('.entry-card-thumb--item');
          assert.equal(await thumbnails.count(), route.count, 'Every visible item card should have an artwork-only thumbnail');
          for (const image of await thumbnails.all()) { await image.evaluate(element => element.decode()); assert.ok(await image.evaluate(element => element.naturalWidth === 720 && element.naturalHeight === 360)); }
        }
        if (route.url === '/catalog/characters/') {
          const thumbnails = page.locator('.entry-card-thumb--character');
          assert.ok(await thumbnails.count() > 0, 'Character catalog should include available portraits');
          for (const image of await thumbnails.all()) { await image.evaluate(element => element.decode()); assert.ok(await image.evaluate(element => element.naturalWidth > 0)); }
          const portraitBox = await page.locator('.entry-card-character-portrait').first().boundingBox();
          assert.equal(portraitBox.width, 96);
          assert.equal(portraitBox.height, 116);
          assert.equal(await thumbnails.first().evaluate(element => getComputedStyle(element).objectFit), 'cover');
          assert.equal(await thumbnails.first().evaluate(element => getComputedStyle(element).objectPosition), '50% 25%');
        }
        if (route.url === '/catalog/locations/') {
          for (const image of await page.locator('.entry-card-thumb--location').all()) { await image.evaluate(element => element.decode()); assert.ok(await image.evaluate(element => element.naturalWidth > 0)); }
        }
        if (route.url === '/') {
          assert.equal((await page.locator('.rail-note').textContent()).trim(), 'To kiedy level up?');
          assert.match(await page.locator('.rail-note').evaluate(element => getComputedStyle(element, '::after').backgroundImage), /rosedim\.webp/);
          assert.equal((await context.request.get('http://127.0.0.1:8081/assets/rosedim.webp')).status(), 200);
        }
        if (route.atlasMaps) assert.deepEqual(await page.locator('main [data-map-view-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), route.atlasMaps.map(view => view.atlasUrl));
        if (route.locationGroups) {
          assert.deepEqual(await page.locator('main [data-location-group]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), route.locationGroups.map(group => group.url));
          assert.equal(route.count + route.locationGroups.reduce((n, group) => n + group.count, 0), catalog.sections.find(section => section.id === 'locations').count);
        }
        assert.equal(await page.locator('main a[href^="/demo/entities/"]').count(), 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.keyboard.press('Control+k');
        assert.equal(await page.locator('#search-dialog').evaluate(element => element.open), true);
        await page.keyboard.press('Escape');
        if (viewport.width < 1000) {
          await page.locator('#mobile-menu').click();
          assert.equal(await page.locator('#workspace').evaluate(element => element.inert), true);
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('#workspace').evaluate(element => element.inert), false);
        }
        if (route.url === '/' || route.url === '/catalog/characters/') await page.screenshot({ path: path.join(output, `${route.url === '/' ? 'organized-home' : 'organized-characters'}-${viewport.width}.png`), fullPage: true });
        checks++;
      }
      for (const [index, entry] of entries.entries()) {
        const response = await page.goto('http://127.0.0.1:8081' + entry.permalink);
        assert.equal(response.status(), 200, 'Approved route must resolve');
        await page.waitForSelector('body.js');
        assert.ok((await page.locator('main').textContent()).includes(entry.title));
        if (entry.kind === 'location' && !entry.legacy_map) {
          const original = local.articles.find(article => article.id === entry.id);
          const view = entityImageView(original, local.files);
          const media = page.locator('.location-illustration');
          if (view.illustration) {
            assert.equal(await media.locator('[data-image-viewer]').getAttribute('href'), view.illustration.src);
            assert.equal(await media.locator('.entity-image-placeholder').count(), 0);
            const image = media.locator('img');
            await image.evaluate(element => element.decode());
            const dimensions = await image.evaluate(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, ratio: element.naturalWidth / element.naturalHeight }));
            assert.ok(Math.abs(dimensions.width / dimensions.height - dimensions.ratio) < 0.01, 'Location illustration must preserve its natural aspect ratio');
            const frame = await media.locator('.entity-media-visual').boundingBox();
            assert.ok(Math.abs(frame.height - dimensions.height - 2) < 2, 'Location frame must fit the illustration without empty bands');
            assert.equal(await page.locator('.approved-prose img').count(), parse(view.html).querySelectorAll('img').length, 'Header illustration must not be duplicated in article prose');
          } else assert.equal(await media.locator('.entity-image-placeholder').count(), 1);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Article ${index} must fit viewport ${viewport.width}`);
        for (const image of await page.locator('main img').all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(element => element.decode());
          assert.ok(await image.evaluate(element => element.naturalWidth > 0));
        }
        if (!entry.legacy_map) {
          const links = await page.locator('main a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
          for (const href of links) {
            if (href.startsWith('#')) continue;
            assert.ok(href.startsWith('/') && !href.startsWith('//'), 'Local allowlisted links only');
            assert.equal((await context.request.get('http://127.0.0.1:8081' + href)).status(), 200, 'Rendered link must resolve');
          }
        }
        if (index === 1 || index === 2) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: path.join(output, `article-${index}-${viewport.width}.png`), fullPage: false });
        }
        checks++;
      }
      await context.close();
    }
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const article = entries.find(entry => !entry.legacy_map);
    assert.ok(article, 'At least one approved article required');
    await page.goto('http://127.0.0.1:8081' + article.permalink);
    assert.ok((await page.locator('main').textContent()).includes(article.title));
    await page.goto('http://127.0.0.1:8081/approved/');
    assert.equal(await page.locator('main [data-approved-id]').count(), catalog.total);
    await context.close();
    assert.deepEqual(errors, []);
    console.log(`APPROVED_ARTICLES_BROWSER_PASS: ${checks} page/viewport checks, no-JS, images and local links`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.code || error.name, error instanceof assert.AssertionError ? error.message : 'Approved article browser check failed'); process.exitCode = 1; });
