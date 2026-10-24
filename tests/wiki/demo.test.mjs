import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadDemo, validateDemo, groupCharacters } from '../../src/wiki-ui/model.cjs';
import { searchEntries, normalize, validSearchUrl, searchSnippet } from '../../src/wiki-ui/search.mjs';

test('demo source is explicit and relations require approval and existing typed targets', () => {
  const data = loadDemo();
  for (const change of [d => d.demonstration = false, d => d.relations[0].approved = false, d => d.relations[0].target = 'unknown', d => d.relations[0].target = 'harbor', d => d.entries.push(d.entries[0]), d => d.relations.push(d.relations[0])]) {
    const invalid = structuredClone(data); change(invalid); assert.throws(() => validateDemo(invalid));
  }
});
test('multiple groups preserve one canonical character URL and public-unassigned state', () => {
  const groups = groupCharacters(loadDemo());
  const mira = groups.faction.flatMap(group => group.entries).filter(entry => entry.id === 'mira');
  assert.equal(mira.length, 2); assert.equal(new Set(mira.map(entry => entry.url)).size, 1);
  assert.deepEqual(groups.faction.find(group => group.id === 'unassigned').entries.map(entry => entry.id), ['lea']);
});
test('search supports title, body, alias, Polish normalization and treats markup as text', () => {
  const data = loadDemo();
  assert.equal(searchEntries(data.entries, 'Mira')[0].id, 'mira');
  assert.equal(searchEntries(data.entries, 'rysowniczka map')[0].id, 'mira');
  assert.ok(searchEntries(data.entries, 'nasiona').some(entry => entry.id === 'lea'));
  assert.equal(normalize('Łódź'), 'lodz');
  assert.deepEqual(searchEntries(data.entries, '<img onerror=alert(1)>'), []);
});

test('approved search ranks reviewed aliases and titles above body and shows matching context', () => {
  const entries = [
    { id: 'body', title: 'A', body: 'Początek '.repeat(40) + 'Łódź i przeprawa na końcu.' },
    { id: 'title', title: 'Łódź', body: '' },
    { id: 'alias', title: 'Z', aliases: ['Łódź'], body: '' }
  ];
  assert.deepEqual(searchEntries(entries, 'lodz').map(entry => entry.id), ['title', 'alias', 'body']);
  assert.ok(searchSnippet(entries[0], 'lodz').includes('Łódź'));
  assert.ok(searchSnippet(entries[0], 'lodz').startsWith('…'));
  const index = JSON.parse(readFileSync('.wiki-preview/approved-search.json', 'utf8'));
  assert.ok(index.entries.every(entry => validSearchUrl(entry.url, 'approved')));
  for (const url of ['//evil.invalid/', 'javascript:alert(1)', '/%2e%2e/private/', '/a/../private/', '/demo/entities/mira/', '/assets/image/', '/x/?q=y']) assert.equal(validSearchUrl(url, 'approved'), false);
});
test('built preview keeps demo search separate and every internal link resolves', () => {
  const files = [];
  function walk(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) { const file = join(dir, entry.name); if (entry.isDirectory()) walk(file); else files.push(file); } }
  walk('.wiki-preview');
  const paths = new Set(files.map(file => '/' + file.replaceAll('\\', '/').replace(/^\.wiki-preview\//, '')));
  assert.ok(!paths.has('/searchIndex.json')); assert.ok(!paths.has('/graph.json'));
  const index = JSON.parse(readFileSync('.wiki-preview/demo-search.json', 'utf8'));
  assert.equal(index.demonstration, true); assert.equal(index.entries.length, 9);
  for (const file of files.filter(file => file.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, file);
    assert.ok(html.includes('Prototyp demonstracyjny') || html.includes('Lokalny podgląd'), file);
    assert.ok(!html.includes('searchIndex.json'), file);
    for (const match of html.matchAll(/(?:href|src)="(\/[^"?#]*)(?:[?#][^"]*)?"/g)) {
      const decoded = decodeURIComponent(match[1]);
      const target = decoded.endsWith('/') ? decoded + 'index.html' : decoded;
      assert.ok(paths.has(target), `${file}: missing ${target}`);
    }
  }
});

test('active map route uses the approved projection and stays out of demo search', () => {
  const file = '.wiki-preview/maps/neverwinter/index.html';
  const html = readFileSync(file, 'utf8');
  const match = html.match(/<script id="map-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'the local map page embeds its validated projection');
  const data = JSON.parse(match[1]);
  assert.equal(data.entry.url, '/dnd/wiki/neverwinter/');
  const city = readFileSync('.wiki-preview/dnd/wiki/neverwinter/index.html', 'utf8');
  assert.ok(!city.includes('id="map-data"') && !city.includes('assets/map-viewer.js'), 'Canonical city article has no map viewer');
  assert.ok(city.includes('href="/maps/neverwinter/"') && city.includes('Lokacje w Neverwinter'));
  assert.ok(html.includes('data-map-article') && !html.includes('class="prose approved-prose"'), 'Atlas links to the article instead of repeating it');
  assert.deepEqual(Object.keys(data.entry).sort(), ['id', 'title', 'url']);
  assert.equal(data.map.markers.length, 11);
  assert.equal(data.unresolved_links, 0);
  assert.equal(data.map.markers.filter(marker => marker.url).length, 11);
  assert.equal(new Set(data.map.markers.map(marker => marker.url)).size, 11);
  const entries = JSON.parse(readFileSync('src/wiki/public-entries.json', 'utf8')).entries;
  const search = JSON.parse(readFileSync('.wiki-preview/approved-search.json', 'utf8')).entries;
  for (const marker of data.map.markers) {
    const location = entries.find(entry => entry.id === marker.target_id);
    assert.ok(location?.approved && location.kind === 'location' && location.category === 'locations');
    assert.equal(location.permalink, marker.url);
    assert.equal(location.title, marker.name);
    const article = readFileSync('.wiki-preview' + marker.url + 'index.html', 'utf8');
    assert.ok(article.includes(marker.description.trim()), 'Location preserves the approved marker description');
    assert.ok(article.includes('href="/dnd/wiki/neverwinter/"'), 'Location links back to Neverwinter');
    assert.ok(article.includes('data-atlas-link href="/maps/neverwinter/"'), 'Location also links directly to its atlas map');
    assert.ok(search.some(entry => entry.id === location.id && entry.url === marker.url), 'Location is in the approved search index');
  }
  assert.equal(data.map.image.src, '/img/user/DND/Lokacje/Phandalin/NeverwinterMapClean.jpg');
  assert.ok(!html.includes('data-map-src') && !html.includes('source_key') && !html.includes('sha256'));
  const demoSearch = readFileSync('.wiki-preview/demo-search.json', 'utf8');
  assert.ok(!demoSearch.includes(data.entry.title));
});

test('portraits and illustrations reference existing explicitly approved local assets', () => {
  const data = loadDemo();
  assert.equal(data.entries.find(entry => entry.id === 'mira').portrait.id, 'portrait-mira');
  assert.equal(data.entries.find(entry => entry.id === 'oskar').portrait, undefined);
  for (const change of [
    d => d.assets[1].approved = false,
    d => d.assets[1].src = '/assets/branding/../../secret.svg',
    d => d.assets[1].src = 'https://example.com/image.jpg',
    d => d.assets[1].src = '/assets/branding/not-present.png',
    d => d.assets[1].alt = '',
    d => d.entries[0].portrait_asset_id = 'unapproved',
    d => d.entries.find(entry => entry.id === 'harbor').portrait_asset_id = 'portrait-mira'
  ]) {
    const invalid = structuredClone(data); change(invalid); assert.throws(() => validateDemo(invalid));
  }
});

test('status requires explicit approval, supports known values, and absence is not unknown', () => {
  const data = loadDemo();
  assert.equal(data.entries.find(entry => entry.id === 'mira').publicStatus, 'Żyje');
  assert.equal(data.entries.find(entry => entry.id === 'oskar').publicStatus, 'Nieznany');
  assert.equal(data.entries.find(entry => entry.id === 'lea').publicStatus, undefined);
  for (const value of ['alive', 'dead', 'missing', 'unknown']) {
    const fixture = structuredClone(data); fixture.entries[0].status = { value, approved: true };
    assert.doesNotThrow(() => validateDemo(fixture));
  }
  for (const status of [{ value: 'dead' }, { value: 'dead', approved: false }, { value: 'dead', approved: 'true' }, { value: 'secret', approved: true }, { value: 'alive', approved: true, dm_notes: 'synthetic' }, 'alive', null]) {
    const fixture = structuredClone(data); fixture.entries[0].status = status;
    assert.throws(() => validateDemo(fixture));
  }
});

test('entity HTML preserves Markdown and renders optional fields and inverse character-only relations', () => {
  const html = id => readFileSync(`.wiki-preview/demo/entities/${id}/index.html`, 'utf8');
  assert.ok(html('mira').includes('Mira sporządza mapy szlaków wokół Przystani.'));
  assert.ok(html('mira').includes('Publicznie znany status'));
  assert.ok(html('mira').includes('mira.svg'));
  assert.ok(html('oskar').includes('aria-label="Brak portretu postaci"'));
  assert.ok(!html('oskar').includes('alt="Portret'));
  assert.ok(!html('lea').includes('Publicznie znany status'));
  const harbor = html('harbor').split('<ul class="location-characters">')[1].split('</ul>')[0];
  assert.ok(harbor.includes('/demo/entities/mira/'));
  assert.ok(harbor.includes('/demo/entities/oskar/'));
  assert.ok(!harbor.includes('/demo/entities/guild/'));
  assert.ok(harbor.includes('Sporządzała mapy szlaków prowadzących do przystani.'));
  assert.ok(html('gardens').includes('/demo/entities/mira/')); // Same source character, second location.
  assert.ok(html('ridge').includes('Brak publicznie ujawnionych powiązanych postaci.'));
  assert.ok(html('ridge').includes('aria-label="Brak ilustracji lokacji"'));
  assert.ok(html('ridge').includes('disabled aria-describedby="location-map-help"'));
});
