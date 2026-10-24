const { parse } = require('node-html-parser');
const { sha } = require('./publication.cjs');
const SITE = 'https://fundelverwiki.vercel.app';
function sameSitePath(value) {
  try { const url = new URL(value, SITE); return url.origin === SITE && !url.username && !url.password ? url.pathname : null; } catch { return null; }
}
function textOf(html) {
  const document = parse(html); document.querySelectorAll('script,style').forEach(node => node.remove());
  const main = document.querySelector('main.content') || document.querySelector('main');
  return main ? main.textContent.replace(/\s+/g, ' ').trim() : null;
}
async function compareOnline(records, readRemote, readLocalHtml) {
  const endpoints = {};
  // Only fixed public endpoints and paths disclosed by them are requested.
  for (const route of ['/', '/sitemap.xml', '/searchIndex.json', '/graph.json', '/feed.xml']) endpoints[route] = await readRemote(route);
  if (endpoints['/'].status !== 200) throw Error('PUBLIC_SITE_UNAVAILABLE');
  const search = (() => { try { return JSON.parse(endpoints['/searchIndex.json'].text); } catch { return []; } })();
  const searchPaths = new Set(Array.isArray(search) ? search.map(item => sameSitePath(item.url)).filter(Boolean) : []);
  const sitemapPaths = new Set([...endpoints['/sitemap.xml'].text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => sameSitePath(match[1].replaceAll('&amp;', '&'))).filter(Boolean));
  const graphPaths = new Set();
  function collect(value) {
    if (typeof value === 'string' && (value.startsWith('/') || value.startsWith(SITE))) { const route = sameSitePath(value); if (route) graphPaths.add(route); }
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  }
  try { collect(JSON.parse(endpoints['/graph.json'].text)); } catch { /* status reported */ }
  const rootLinks = new Set(parse(endpoints['/'].text).querySelectorAll('a[href]').map(link => sameSitePath(link.getAttribute('href'))).filter(Boolean));
  const advertised = new Set(['/', ...searchPaths, ...sitemapPaths, ...rootLinks]);
  // Never probe an unpublished local-only note URL, even if it looks plausible.
  const noteRecords = records.filter(record => record.kind === 'entry');
  const fetched = new Map([['/', endpoints['/']]]);
  const remoteOnly = [...advertised].filter(route => !noteRecords.some(record => record.url === route));
  const requested = [...advertised].filter(route => noteRecords.some(record => record.url === route));
  async function parallel(items, action) {
    let index = 0;
    await Promise.all(Array.from({ length: Math.min(5, items.length) }, async () => { while (index < items.length) await action(items[index++]); }));
  }
  await parallel(requested.filter(route => route !== '/'), async route => fetched.set(route, await readRemote(route)));
  const assetReferences = new Set();
  for (const response of fetched.values()) if (response.status === 200) {
    for (const node of parse(response.text).querySelectorAll('[src],link[href]')) {
      const route = sameSitePath(node.getAttribute('src') || node.getAttribute('href'));
      if (route) assetReferences.add(route);
    }
  }
  const notes = noteRecords.map(record => {
    const remote = fetched.get(record.url);
    const local = readLocalHtml(record);
    const a = remote?.status === 200 ? textOf(remote.text) : null, b = local ? textOf(local) : null;
    return { key: record.key, sitemap: sitemapPaths.has(record.url), search: searchPaths.has(record.url), graph: graphPaths.has(record.url), root_link: rootLinks.has(record.url),
      html_status: remote?.status || null, main_text: a !== null && b !== null ? a === b ? 'same' : 'different' : 'not_compared' };
  });
  const assets = [];
  await parallel(records.filter(record => record.kind === 'asset'), async record => {
    const route = encodeURI(record.url);
    if (!assetReferences.has(route) && !assetReferences.has(record.url)) { assets.push({ key: record.key, status: null, bytes: 'not_requested_not_advertised' }); return; }
    const response = await readRemote(route, true);
    assets.push({ key: record.key, status: response.status, bytes: response.status === 200 ? sha(response.bytes) === record.sha256 ? 'same' : 'different' : 'not_compared' });
  });
  const rootBrokenLinks = [];
  for (const route of rootLinks) {
    if (fetched.has(route)) { if (fetched.get(route).status >= 400) rootBrokenLinks.push(route); continue; }
    if (route === '/searchIndex.json' || /\.(png|jpg|css|js|svg)$/i.test(route)) continue;
    const response = await readRemote(route);
    if (response.status >= 400) rootBrokenLinks.push(route);
  }
  const summary = {
    local_notes: notes.length, confirmed_html_200: notes.filter(row => row.html_status === 200).length,
    not_advertised_locally_known: notes.filter(row => row.html_status === null).length,
    advertised_html_error: notes.filter(row => row.html_status !== null && row.html_status !== 200).length,
    same_main_text_as_local_dist: notes.filter(row => row.main_text === 'same').length,
    different_main_text_from_local_dist: notes.filter(row => row.main_text === 'different').length,
    local_assets: assets.length, observed_assets_same_bytes: assets.filter(row => row.bytes === 'same').length,
    observed_assets_different_bytes: assets.filter(row => row.bytes === 'different').length,
    assets_not_requested: assets.filter(row => row.status === null).length,
    public_paths_not_matching_note: remoteOnly.length, broken_home_links: rootBrokenLinks.length
  };
  return {
    redacted: { schema_version: 1, at: new Date().toISOString(), site: SITE, approval_inferred: false,
      endpoints: Object.fromEntries(Object.entries(endpoints).map(([route, result]) => [route, { status: result.status, type: result.type }])), summary, notes, assets: assets.sort((a, b) => a.key.localeCompare(b.key)),
      unmatched_public_path_hashes: remoteOnly.map(sha), broken_home_link_hashes: rootBrokenLinks.map(sha) },
    local: { site: SITE, public_paths: [...advertised], unmatched_public_paths: remoteOnly, broken_home_links: rootBrokenLinks }
  };
}
module.exports = { SITE, compareOnline, sameSitePath, textOf };
