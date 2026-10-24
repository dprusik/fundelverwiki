const { test } = require('node:test');
const assert = require('node:assert/strict');
const Image = require('@11ty/eleventy-img');
const { parse } = require('node-html-parser');
const { buildImageVariants, optimizeImageHtml } = require('../../src/helpers/wiki/image-variants.cjs');

test('responsive markup preserves original links and cards, and ignores unapproved images', () => {
  const url = '/img/approved.png';
  const variants = { [url]: [{ url: '/img/optimized/small.webp', width: 96, height: 144 }, { url: '/img/optimized/large.webp', width: 960, height: 1440 }] };
  const html = `<html><body><img src="${url}" width="48" height="72"><article class="approved-prose"><p><img src="${url}" alt="Illustration"></p></article><a href="${url}" data-image-viewer><img src="${url}" width="400" height="480"></a><article class="item-rules-cards"><img src="${url}"></article><img src="/img/private.png"></body></html>`;
  const doc = parse(optimizeImageHtml(html, variants, new Set([url])));
  assert.equal(doc.querySelector('body > img').getAttribute('src'), '/img/optimized/small.webp');
  assert.equal(doc.querySelector('body > img').getAttribute('sizes'), '48px');
  const illustration = doc.querySelector('.approved-prose img');
  assert.equal(illustration.getAttribute('loading'), 'lazy');
  assert.equal(illustration.getAttribute('width'), '960');
  assert.equal(illustration.closest('a').getAttribute('href'), url);
  assert.equal(doc.querySelector('[data-image-viewer] img[width="400"]').getAttribute('height'), '480');
  assert.equal(doc.querySelectorAll('a a').length, 0);
  assert.equal(doc.querySelector('.item-rules-cards img').outerHTML, `<img src="${url}">`);
  assert.equal(doc.querySelector('img[src="/img/private.png"]').hasAttribute('srcset'), false);
  assert.ok(!optimizeImageHtml(html, variants, new Set()).includes('srcset='));
});

test('variants use approved bytes only, preserve aspect ratio, exclude cards/maps, and bind URLs to output hashes', async () => {
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const local = { articles: [{ category: 'documents', html: '<img src="/img/known.png"><img src="/img/missing.png">' }, { category: 'items', html: '<img src="/img/card.png">' }], maps: [{ map: { image: { src: '/img/map.png' } } }], files: ['known', 'unused', 'card', 'map'].map(name => ({ url: `/img/${name}.png`, bytes })) };
  const result = await buildImageVariants(local, ['/img/map.png', '/img/card.png']);
  assert.deepEqual(Object.keys(result.sources), ['/img/known.png']);
  assert.equal(result.files.length, 1);
  const variant = result.files[0];
  assert.equal(variant.sha256, require('node:crypto').createHash('sha256').update(variant.bytes).digest('hex'));
  assert.match(variant.url, new RegExp(`/img/optimized/${variant.sha256}-1.webp$`));
  const metadata = Image.statsSync(variant.bytes, { widths: [null], formats: ['webp'] });
  assert.equal(metadata.webp[0].width, 1);
  assert.equal(metadata.webp[0].height, 1);
  assert.ok(bytes.equals(local.files[0].bytes));
  assert.deepEqual(await buildImageVariants({ ...local, files: [] }, ['/img/known.png']), { files: [], sources: {} });
});
