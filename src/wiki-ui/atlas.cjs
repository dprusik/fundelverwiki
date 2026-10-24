const { parse } = require('node-html-parser');
const fail = () => { throw Error('INVALID_ATLAS_NAVIGATION'); };
function atlasRouteReservations(config) {
  if (config?.schema_version !== 1 || !Array.isArray(config.maps)) fail();
  const owners = new Set(), slugs = new Set();
  for (const item of config.maps) {
    if (!item || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(item.owner_id || '') || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(item.slug || '') || owners.has(item.owner_id) || slugs.has(item.slug)) fail();
    owners.add(item.owner_id); slugs.add(item.slug);
  }
  return config.maps.map(item => `/maps/${item.slug}/`);
}
// Input maps come exclusively from prepareLocalArticles' validated projection.
function buildAtlasViews(maps, config, canonicalUrls) {
  atlasRouteReservations(config);
  const occupied = new Set(canonicalUrls.map(url => url.toLowerCase()));
  return maps.map(source => {
    if (source.map.owner_id !== source.entry.id || !/^legacy-map-[a-f0-9]{20}$/.test(source.map.id)) fail();
    const slug = config.maps.find(item => item.owner_id === source.entry.id)?.slug || source.map.id;
    const atlasUrl = `/maps/${slug}/`;
    if (occupied.has(atlasUrl.toLowerCase())) fail();
    occupied.add(atlasUrl.toLowerCase());
    const document = parse(source.entry.html || '');
    const heading = document.querySelector('h2,h3,h4');
    // Replace this legacy UI heading with the explicit Open map action.
    if (heading?.textContent.trim() === `Interaktywna mapa ${source.entry.title}`) heading.remove();
    const title = `Mapa: ${source.entry.title}`;
    return { ...source, atlasUrl, title, articleHtml: document.toString().trim(), viewerData: {
      title, entry: { id: source.entry.id, title: source.entry.title, url: source.entry.url },
      map: source.map, unresolved_links: source.unresolved_links, link_policy: source.link_policy
    } };
  }).sort((a, b) => a.entry.title.localeCompare(b.entry.title, 'pl'));
}
function atlasLinksForArticle(article, maps) {
  return maps.filter(view => view.entry.id === article.id || view.map.markers.some(marker => marker.target_id === article.id))
    .map(view => ({ url: view.atlasUrl, title: view.entry.title, map_id: view.map.id }));
}
module.exports = { atlasRouteReservations, buildAtlasViews, atlasLinksForArticle };
