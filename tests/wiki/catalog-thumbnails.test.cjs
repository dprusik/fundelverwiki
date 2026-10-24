const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildCatalogThumbnails } = require('../../src/helpers/wiki/catalog-thumbnails.cjs');

test('location tiles reuse the explicitly approved article illustration variant', async () => {
  const local = {
    articles: [
      { id: 'location', kind: 'location', html: '<p>Location notes</p>', illustration: { src: '/img/place.webp' } },
      { id: 'private-location', kind: 'location', html: '<p>Private notes</p>', illustration: { src: '/img/private.webp' } }
    ],
    files: [{ url: '/img/place.webp', bytes: Buffer.from('approved') }]
  };
  const variants = { '/img/place.webp': [{ url: '/img/optimized/place-320.webp', width: 320 }] };
  const thumbnails = await buildCatalogThumbnails(local, variants);
  assert.deepEqual(thumbnails.byId.location, { src: '/img/optimized/place-320.webp', kind: 'location' });
  assert.equal(thumbnails.byId['private-location'], undefined);
  assert.deepEqual(thumbnails.files, []);
});
