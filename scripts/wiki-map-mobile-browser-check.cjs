// Read-only checks against the approved local map. Screenshots stay private.
const { chromium } = require(process.env.WIKI_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.WIKI_BROWSER_EXECUTABLE ? { executablePath: process.env.WIKI_BROWSER_EXECUTABLE } : {}) });
  try {
    const cases = [{ width: 320, height: 1000 }, { width: 390, height: 844 }, { width: 700, height: 1000 }, { width: 844, height: 390 }, { width: 932, height: 430 }, { width: 1024, height: 600 }, { width: 1440, height: 1000 }];
    for (const viewport of cases) {
      const { width } = viewport, mobile = width !== 1440;
      const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.name));
      assert.equal((await page.goto('http://127.0.0.1:8083/maps/neverwinter/')).status(), 200);
      const list = page.locator('#markers'), buttons = list.locator('button');
      await buttons.first().waitFor();
      if (mobile) {
        await page.waitForFunction(() => Math.abs(document.querySelector('.wiki-map-marker-frame').getBoundingClientRect().height - document.getElementById('map').getBoundingClientRect().height) < 1);
        const map = await page.locator('#map').boundingBox(), frame = await page.locator('.wiki-map-marker-frame').boundingBox();
        if (width <= 700) {
          assert.ok(Math.abs(map.width - frame.width) < 1);
          assert.ok(Math.abs(map.x - frame.x) < 1);
        }
        assert.ok(await list.evaluate(el => el.scrollHeight > el.clientHeight && el.scrollWidth <= el.clientWidth));
        await list.scrollIntoViewIfNeeded();
        const box = await list.boundingBox(), x = box.x + box.width / 2;
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: box.y + box.height * .85, id: 1 }] });
        for (const fraction of [.65, .45, .2]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: box.y + box.height * fraction, id: 1 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForFunction(() => document.getElementById('markers').scrollTop > 0);
        await page.waitForFunction(() => {
          const list = document.getElementById('markers'), now = performance.now();
          if (list._lastScroll !== list.scrollTop) { list._lastScroll = list.scrollTop; list._scrollAt = now; }
          return now - list._scrollAt > 200;
        });
        await buttons.last().focus(); await page.keyboard.press('Enter');
        assert.equal(await buttons.last().getAttribute('aria-pressed'), 'true');
        await list.evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
        await page.locator('.map-marker').last().dispatchEvent('click');
        await page.waitForFunction(() => {
          const list = document.getElementById('markers'), tile = list.querySelector('li:last-child button').getBoundingClientRect(), frame = list.getBoundingClientRect();
          return tile.top >= frame.top - 1 && tile.bottom <= frame.bottom + 1;
        });
        assert.equal(await page.locator('.map-marker[aria-pressed="true"]').count(), 1);
        const panel = await page.locator('.wiki-map-marker-frame').boundingBox();
        assert.ok(Math.abs(panel.height - map.height) < 1, 'Opening a description must not resize the marker frame');
        const popup = await page.locator('#popup').boundingBox();
        assert.ok(popup.y + popup.height <= panel.y, 'Description above list in both orientations');
        if (width === 390) {
          fs.mkdirSync('.publication-review', { recursive: true });
          await page.locator('#map').focus();
          await page.screenshot({ path: '.publication-review/map-vertical-mobile.png', fullPage: true });
          for (const rotated of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
            await page.setViewportSize(rotated);
            await page.waitForFunction(() => Math.abs(document.querySelector('.wiki-map-marker-frame').getBoundingClientRect().height - document.getElementById('map').getBoundingClientRect().height) < 1);
            assert.equal(await list.evaluate(el => getComputedStyle(el).overflowY), 'auto');
            const rotatedPanel = await page.locator('.wiki-map-marker-frame').boundingBox(), rotatedPopup = await page.locator('#popup').boundingBox();
            assert.ok(rotatedPopup.y + rotatedPopup.height <= rotatedPanel.y);
          }
        }
        if (width === 844) {
          await page.screenshot({ path: '.publication-review/map-landscape-mobile.png', fullPage: true });
        }
      } else {
        assert.equal(await list.evaluate(el => getComputedStyle(el).overflowY), 'visible');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []); await context.close();
    }
    console.log('PASS: marker frame matches map height in portrait and landscape (320/390/700/844/932/1024px), rotation both ways, vertical touch/keyboard scroll, selection; desktop unchanged.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
