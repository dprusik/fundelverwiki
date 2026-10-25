const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parse } = require('node-html-parser');
const { organizeApprovedCatalog } = require('../../src/wiki-ui/catalog.cjs');
const { applyCatalogVisibility } = require('../../src/wiki-ui/catalog-visibility.cjs');
const { prepareLocalArticles } = require('../../src/helpers/wiki/local-articles.cjs');
const { projectApprovedSearch } = require('../../src/helpers/wiki/approved-search.cjs');
const { organizeLocationNavigation, locationDirectoryView } = require('../../src/wiki-ui/location-navigation.cjs');
const locationConfig = require('../../src/wiki-ui/location-navigation.json');
const { atlasRouteReservations, buildAtlasViews, atlasLinksForArticle } = require('../../src/wiki-ui/atlas.cjs');
const atlasConfig = require('../../src/wiki-ui/atlas-navigation.json');
const { characterPortraitView, entityImageView } = require('../../src/wiki-ui/character-portrait.cjs');
const entry = (id, category, kind, title) => ({ id, category, kind, title, url: `/canonical/${id}/` });

test('catalog separates organizations from characters and keeps each approved entry in one group', () => {
  const input = [entry('faction', 'characters', 'faction', 'Żagle'), entry('hero', 'characters', 'character', 'Adam'), entry('map', 'maps', 'location', 'Mapa'), entry('diary', 'documents', 'article', 'Dziennik')];
  const before = structuredClone(input), data = organizeApprovedCatalog(input);
  assert.deepEqual(input, before);
  assert.equal(data.total, 4);
  assert.deepEqual(data.organizations.map(e => e.id), ['faction']);
  const characters = data.sections.find(section => section.id === 'characters');
  assert.equal(characters.count, 2);
  assert.deepEqual(characters.entries.map(e => e.id), ['hero']);
  const grouped = data.groups.flatMap(group => group.entries.map(entry => entry.id));
  assert.equal(new Set(grouped).size, input.length);
  assert.equal(grouped.length, input.length);
  assert.equal(data.entries.find(e => e.id === 'map').sectionUrl, '/catalog/maps/');
  assert.equal(data.entries.find(e => e.id === 'diary').sectionUrl, '/catalog/documents/');
  assert.ok(data.entries.every(e => input.find(source => source.id === e.id).url === e.url));
});

test('catalog uses public fields only and preserves empty sections without inventing metadata', () => {
  const data = organizeApprovedCatalog([{ ...entry('hero', 'characters', 'character', 'Łucja'), source_key: 'PRIVATE_CANARY', html: 'PRIVATE_CANARY', status: 'PRIVATE_CANARY' }]);
  assert.ok(!JSON.stringify(data).includes('PRIVATE_CANARY'));
  assert.equal(data.sections.length, 6);
  assert.equal(data.sections.find(section => section.id === 'chronicle').count, 0);
  assert.equal(data.entries[0].summary, undefined);
  assert.throws(() => organizeApprovedCatalog([entry('bad', 'unknown', 'character', 'X')]));
});

test('built primary catalogs contain approved records and demo is confined to separate routes', () => {
  const local = prepareLocalArticles(process.cwd());
  const data = applyCatalogVisibility(organizeApprovedCatalog(local.catalog));
  const navigation = organizeLocationNavigation(data.entries, local.catalog, locationConfig);
  const atlas = buildAtlasViews(local.maps, atlasConfig, local.catalog.map(entry => entry.url));
  const read = url => parse(fs.readFileSync('.wiki-preview' + url + 'index.html', 'utf8'));
  const overview = read('/approved/');
  const ids = overview.querySelectorAll('main [data-approved-id]').map(node => node.getAttribute('data-approved-id'));
  assert.deepEqual(ids.slice().sort(), data.entries.map(entry => entry.id).sort());
  for (const section of data.sections) {
    const page = read(`/catalog/${section.id}/`);
    const shown = page.querySelectorAll('main [data-approved-id]').map(node => node.getAttribute('data-approved-id'));
    const expected = section.id === 'maps' ? [] : section.id === 'locations' ? navigation.ungrouped : section.id === 'items' ? section.catalogEntries : [...section.entries, ...section.organizations];
    assert.deepEqual(shown.slice().sort(), expected.map(entry => entry.id).sort());
    if (section.id === 'locations') {
      assert.deepEqual(page.querySelectorAll('[data-location-group]').map(node => node.getAttribute('href')), navigation.groups.map(group => group.url));
      assert.equal(navigation.groups.reduce((n, group) => n + group.count, 0) + navigation.ungrouped.length, section.entries.length);
    }
    if (section.id === 'maps') assert.deepEqual(page.querySelectorAll('[data-map-view-id]').map(node => node.getAttribute('href')), atlas.map(view => view.atlasUrl));
    assert.ok(page.querySelectorAll('[data-search]').length > 0);
    assert.equal(page.querySelector('#search-dialog').getAttribute('data-search-scope'), 'approved');
    assert.ok(!page.querySelector('main').toString().includes('/demo/entities/'));
  }
  const organizations = read('/organizations/').querySelectorAll('main [data-approved-id]').map(node => node.getAttribute('data-approved-id'));
  assert.deepEqual(organizations.sort(), data.organizations.map(entry => entry.id).sort());
  assert.equal(read('/').querySelector('#search-dialog').getAttribute('data-search-scope'), 'approved');
  assert.ok(read('/demo/').querySelectorAll('[data-search]').length > 0);
  assert.equal(read('/demo/').querySelector('#search-dialog').getAttribute('data-search-scope'), 'demo');
  for (const article of data.entries) {
    const page = read(article.url);
    const directory = navigation.groups.find(group => group.id === article.id);
    assert.ok(page.querySelectorAll('.breadcrumbs a').some(link => link.getAttribute('href') === (directory ? '/catalog/locations/' : article.sectionUrl)));
    const parent = navigation.groups.find(group => group.entries.some(member => member.id === article.id));
    if (parent) assert.ok(page.querySelectorAll('.breadcrumbs a').some(link => link.getAttribute('href') === parent.url));
  }
});

test('place directories follow explicitly selected approved article links and keep maps independent', () => {
  const input = [entry('city', 'locations', 'location', 'Miasto'), entry('inn', 'locations', 'location', 'Gospoda'), entry('map-a', 'maps', 'location', 'Mapa A'), entry('map-b', 'maps', 'location', 'Mapa B')];
  const catalog = organizeApprovedCatalog(input).entries;
  const config = { schema_version: 1, groups: [{ parent_id: 'city', member_ids: ['inn', 'PRIVATE_UNAPPROVED_ID'] }] };
  const articles = [{ id: 'city', html: '<a href="/canonical/inn/">Gospoda</a><a href="/canonical/map-a/">Mapa A</a><a href="/canonical/map-b/">Mapa B</a>' }];
  const result = organizeLocationNavigation(catalog, articles, config);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].url, '/canonical/city/');
  assert.deepEqual(result.groups[0].entries.map(e => e.id), ['inn']);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_UNAPPROVED_ID'));
  assert.deepEqual(organizeLocationNavigation(catalog.filter(e => e.id !== 'city'), articles, config).groups, []);
  assert.equal(organizeLocationNavigation(catalog.filter(e => e.id !== 'inn'), articles, config).groups[0].count, 0);
  const removed = organizeLocationNavigation(catalog, [{ id: 'city', html: '<p>Opis bez dawnych powiązań.</p>' }], config);
  assert.equal(removed.groups[0].count, 0);
  assert.deepEqual(removed.ungrouped.map(e => e.id), ['inn']);
  assert.equal(organizeLocationNavigation(catalog, [], config).groups.length, 0);
  assert.throws(() => organizeLocationNavigation(catalog, articles, { schema_version: 1, groups: [config.groups[0], config.groups[0]] }), /INVALID_LOCATION_NAVIGATION/);
});

test('location directory cards replace only complete canonical lists and retain surrounding narrative', () => {
  const group = { title: 'Miasto', entries: [entry('inn', 'locations', 'location', 'Gospoda'), entry('tower', 'locations', 'location', 'Wieża')] };
  const html = '<p>Opis miasta.</p><h3>Lokacje w Miasto</h3>\n<ul><li><a href="/canonical/inn/">Gospoda</a></li><li><a href="/canonical/tower/">Wieża</a></li></ul><p>Dalsza historia.</p>';
  const view = locationDirectoryView(html, group);
  assert.equal(view.beforeHtml, '<p>Opis miasta.</p>');
  assert.equal(view.afterHtml, '<p>Dalsza historia.</p>');
  assert.deepEqual(view.entries, group.entries);
  for (const changed of [html.replace('>Gospoda<', '>Dawna gospoda<'), html.replace('<li><a', '<li>Opis <a'), html.replace('/canonical/tower/', '/unapproved/'), html.replace('<ul>', '<blockquote><ul>').replace('</ul>', '</ul></blockquote>')]) assert.equal(locationDirectoryView(changed, group), null);
  assert.equal(locationDirectoryView(html, undefined), null);
});

test('character portraits reuse only approved article images and retain narrative and later images', () => {
  const original = { id: 'person', title: 'Osoba', kind: 'character', html: '<p><img src="/img/portrait.png" alt="Art"></p><p>Opis postaci.</p><p><img src="/img/second.png"></p>' };
  const files = [{ url: '/img/portrait.png' }, { url: '/img/second.png' }];
  const view = characterPortraitView(original, files);
  assert.equal(view.portrait.src, '/img/portrait.png');
  assert.ok(view.portrait.fromArticle);
  assert.equal(view.html, '<p>Opis postaci.</p><p><img src="/img/second.png"></p>');
  assert.ok(original.html.includes('/img/portrait.png'));
  assert.equal(characterPortraitView(original, []).portrait, undefined);
  assert.equal(characterPortraitView({ ...original, kind: 'location' }, files).portrait, undefined);
  const narrative = characterPortraitView({ ...original, html: '<p>Wspomnienie <img src="/img/portrait.png"> zachowane.</p>' }, files);
  assert.ok(narrative.html.includes('Wspomnienie') && narrative.html.includes('zachowane.'));
  const explicit = { ...original, portrait: { src: '/img/second.png', alt: 'Zatwierdzony portret' } };
  assert.deepEqual(characterPortraitView(explicit, files).portrait, explicit.portrait);
});

test('location headers reuse approved illustrations without duplicating standalone images or altering source prose', () => {
  const original = { id: 'place', title: 'Karczma', kind: 'location', html: '<p>Położenie: port.</p><p><img src="/img/ship.webp" alt="Widok karczmy"></p><p>Opis [[miejsca]].</p><p><img src="/img/detail.png"></p>' };
  const before = structuredClone(original);
  const files = [{ url: '/img/ship.webp' }, { url: '/img/detail.png' }];
  const view = entityImageView(original, files);
  assert.deepEqual(view.illustration, { src: '/img/ship.webp', alt: 'Widok karczmy' });
  assert.equal(view.html, '<p>Położenie: port.</p><p>Opis [[miejsca]].</p><p><img src="/img/detail.png"></p>');
  assert.deepEqual(original, before);
  assert.equal(entityImageView(original, []), original);
  const empty = { ...original, html: '<p>Bez ilustracji.</p>' };
  assert.equal(entityImageView(empty, files), empty);
  const explicit = { ...original, illustration: { src: '/img/detail.png', alt: 'Wybrana ilustracja' } };
  assert.deepEqual(entityImageView(explicit, files).illustration, explicit.illustration);
  assert.ok(entityImageView(explicit, files).html.includes('/img/ship.webp'));
  const blocked = { ...original, illustration: { src: '/img/private.png', alt: 'Private' } };
  assert.equal(entityImageView(blocked, files), blocked);
  const narrative = { ...original, html: '<p>Wspomnienie <img src="/img/ship.webp"> zachowane.</p>' };
  assert.equal(entityImageView(narrative, files).html, narrative.html);
  const document = { ...original, kind: 'article' };
  assert.equal(entityImageView(document, files), document);
  const character = { ...original, kind: 'character' };
  assert.deepEqual(entityImageView(character, files), characterPortraitView(character, files));
});

test('atlas views keep canonical articles and only serialize the approved viewer projection', () => {
  const source = { entry: { id: 'owner-a', title: 'Miasto', url: '/city/', html: '<h2>Interaktywna mapa Miasto</h2><p>Publiczny opis.</p>', source_key: 'PRIVATE_SOURCE' }, map: { id: 'legacy-map-' + 'a'.repeat(20), owner_id: 'owner-a', markers: [] }, unresolved_links: 0, link_policy: 'omit_unresolved' };
  const config = { schema_version: 1, maps: [{ owner_id: 'owner-a', slug: 'city' }] };
  const before = structuredClone(source), [view] = buildAtlasViews([source], config, ['/city/']);
  assert.deepEqual(source, before);
  assert.equal(view.entry.url, '/city/'); assert.equal(view.atlasUrl, '/maps/city/');
  assert.equal(view.articleHtml, '<p>Publiczny opis.</p>');
  assert.ok(!JSON.stringify(view.viewerData).includes('PRIVATE_SOURCE'));
  assert.ok(!JSON.stringify(view.viewerData).includes('Publiczny opis'));
  assert.deepEqual(buildAtlasViews([], config, []), []);
  assert.throws(() => buildAtlasViews([source], config, ['/MAPS/CITY/']), /INVALID_ATLAS_NAVIGATION/);
  assert.throws(() => buildAtlasViews([source, source], config, []), /INVALID_ATLAS_NAVIGATION/);
  for (const slug of ['../private', 'bad/path', 'https://example.com', '%2e%2e']) assert.throws(() => atlasRouteReservations({ schema_version: 1, maps: [{ owner_id: 'owner-a', slug }] }), /INVALID_ATLAS_NAVIGATION/);
  const [fallback] = buildAtlasViews([source], { schema_version: 1, maps: [] }, ['/city/']);
  assert.equal(fallback.atlasUrl, '/maps/' + source.map.id + '/');
});

test('one location can link to multiple approved atlas maps without duplicate articles', () => {
  const maps = ['a', 'b'].map(key => ({ entry: { id: 'owner-' + key, title: 'Mapa ' + key, url: '/map-article-' + key + '/', html: '' }, map: { id: 'legacy-map-' + key.repeat(20), owner_id: 'owner-' + key, markers: [{ id: 'marker-' + key, target_id: 'one-location', url: '/place/' }] } }));
  const views = buildAtlasViews(maps, { schema_version: 1, maps: [] }, maps.map(map => map.entry.url));
  assert.equal(atlasLinksForArticle({ id: 'one-location' }, views).length, 2);
  assert.equal(atlasLinksForArticle({ id: 'owner-a' }, views).length, 1);
  assert.deepEqual(atlasLinksForArticle({ id: 'unrelated' }, views), []);
  assert.equal(new Set(views.flatMap(view => view.map.markers.map(marker => marker.url))).size, 1);
});

test('built approved index matches validated rendered articles and remains separate from demo', () => {
  const local = prepareLocalArticles(process.cwd());
  const actual = JSON.parse(fs.readFileSync('.wiki-preview/approved-search.json', 'utf8'));
  assert.deepEqual(actual, projectApprovedSearch(local));
  const demo = JSON.parse(fs.readFileSync('.wiki-preview/demo-search.json', 'utf8'));
  const ids = new Set(actual.entries.map(entry => entry.id));
  assert.ok(demo.entries.every(entry => !ids.has(entry.id)));
  const urls = new Set(local.catalog.map(entry => entry.url));
  assert.ok(actual.entries.every(entry => urls.has(entry.url)));
  for (const entry of actual.entries) {
    assert.deepEqual(Object.keys(entry).sort(), ['id', 'url', 'title', 'category', 'aliases', 'body', 'summary'].sort());
    assert.ok(!entry.body.includes('<code class='));
  }
});

test('withdrawn Bekrit’s Mask is absent from approved catalogs and has no public route', () => {
  const local = prepareLocalArticles(process.cwd());
  const catalog = applyCatalogVisibility(organizeApprovedCatalog(local.catalog));
  const mask = catalog.entries.find(item => item.id === 'entry-ea1ef23a3438fa49ba3d');
  assert.equal(mask, undefined);
  assert.ok(!catalog.sections.flatMap(section => section.entries).some(item => item.id === 'entry-ea1ef23a3438fa49ba3d'));
  assert.ok(!local.catalog.some(item => item.url === '/przedmioty/bekrits-mask/'));
  assert.ok(!local.files.some(asset => asset.url === '/img/user/lorekeeper/bekrits-mask-card.png'));
});
