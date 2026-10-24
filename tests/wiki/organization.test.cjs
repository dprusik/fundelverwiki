const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parse } = require('node-html-parser');
const { organizationViews } = require('../../src/wiki-ui/organization-view.cjs');

test('organization cards present explicit approved character mentions once without creating affiliation', () => {
  const local = { catalog: [
    { id: 'faction', kind: 'faction', html: '<p>Public description.</p><p><a href="/hero/">Public Hero</a> <a href="/hero/">Public Hero</a></p><p><a href="/place/">Place</a></p>' },
    { id: 'hero', kind: 'character', url: '/hero/', title: 'Public Hero', summary: 'Reviewed summary', html: '<p><img src="/img/hero.png"></p>', private: 'CANARY' },
    { id: 'place', kind: 'location', url: '/place/', title: 'Place', html: '' }
  ], files: [{ url: '/img/hero.png' }] };
  const before = structuredClone(local);
  const view = organizationViews(local).faction;
  assert.equal(view.characters.length, 1);
  assert.deepEqual(view.characters[0], { id: 'hero', url: '/hero/', title: 'Public Hero', summary: 'Reviewed summary', illustration: { src: '/img/hero.png' } });
  assert.ok(view.html.includes('Public description.') && view.html.includes('/place/'));
  assert.ok(!view.html.includes('/hero/'));
  assert.ok(!JSON.stringify(view).includes('CANARY'));
  assert.deepEqual(local, before);
});

test('missing image and missing metadata do not invent portraits, statuses or roles; narrative stays intact', () => {
  const view = organizationViews({ catalog: [
    { id: 'org', kind: 'organization', html: '<p>A visitor, not a member: <a href="/hero/">A public alias</a>.</p>' },
    { id: 'hero', kind: 'character', url: '/hero/', title: 'Hero', html: '<img src="/img/not-in-assets.png">' }
  ], files: [] }).org;
  assert.equal(view.html, '<p>A visitor, not a member: <a href="/hero/">A public alias</a>.</p>');
  assert.deepEqual(view.characters[0], { id: 'hero', title: 'Hero', url: '/hero/', mentionLabel: 'A public alias' });
});

test('built faction and organization cards distinguish mentions from confirmed demo membership', () => {
  const read = url => parse(fs.readFileSync('.wiki-preview' + url + 'index.html', 'utf8'));
  const guild = read('/demo/entities/guild/');
  const cards = guild.querySelectorAll('[data-organization-character]');
  assert.deepEqual(cards.map(card => card.getAttribute('data-organization-character')), ['mira', 'oskar']);
  assert.equal(cards[0].querySelectorAll('.organization-character-image').length, 1);
  assert.equal(cards[1].querySelectorAll('.organization-character-fallback').length, 1);
  assert.ok(cards[0].querySelector('.organization-character-summary').textContent.includes('Kartografka'));
  assert.ok(cards[0].querySelector('.organization-character-status').textContent.includes('Żyje'));
  assert.equal(cards[0].querySelectorAll('.organization-character-locations a').length, 2);
  const registry = JSON.parse(fs.readFileSync('src/wiki/public-entries.json', 'utf8'));
  const faction = registry.entries.find(entry => entry.kind === 'faction');
  const actual = read(faction.permalink);
  assert.ok(actual.querySelector('.breadcrumbs').textContent.includes(faction.title));
  assert.equal(actual.querySelectorAll('[data-organization-character]').length, 2);
  assert.ok(actual.querySelector('#organization-mentions-heading').textContent.includes('wymienione'));
  assert.equal(actual.querySelectorAll('.organization-character-status').length, 0);
});
