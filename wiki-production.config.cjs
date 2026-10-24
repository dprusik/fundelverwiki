const path = require('node:path');
const fs = require('node:fs');
const MarkdownIt = require('markdown-it');
const { prepareLocalArticles } = require('./src/helpers/wiki/local-articles.cjs');
const { projectApprovedSearch } = require('./src/helpers/wiki/approved-search.cjs');
const { organizeApprovedCatalog } = require('./src/wiki-ui/catalog.cjs');
const { applyCatalogVisibility } = require('./src/wiki-ui/catalog-visibility.cjs');
const { organizationViews } = require('./src/wiki-ui/organization-view.cjs');
const { organizeLocationNavigation, locationDirectoryView } = require('./src/wiki-ui/location-navigation.cjs');
const { atlasRouteReservations, buildAtlasViews, atlasLinksForArticle } = require('./src/wiki-ui/atlas.cjs');
const { characterPortraitView } = require('./src/wiki-ui/character-portrait.cjs');
const { optimizeImageHtml } = require('./src/helpers/wiki/image-variants.cjs');
const atlasConfig = require('./src/wiki-ui/atlas-navigation.json');
const { loadAppearance } = require('./src/wiki-ui/theme.cjs');

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
}
function publicBaseUrl(value) {
  let url;
  try { url = new URL(value || 'https://fundelverwiki.vercel.app'); } catch { throw Error('INVALID_PUBLICATION_SITE_URL'); }
  if (url.origin !== 'https://fundelverwiki.vercel.app' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('PUBLICATION_SITE_ORIGIN_NOT_ALLOWLISTED');
  return url.origin;
}

module.exports = function (config) {
  const root = process.cwd();
  const output = path.resolve(process.env.WIKI_PUBLICATION_OUTPUT || '');
  const stagingRoot = path.resolve(root, '.publication-build');
  if (!output.startsWith(stagingRoot + path.sep) || !fs.existsSync(output) || fs.lstatSync(output).isSymbolicLink()) throw Error('UNSAFE_PUBLICATION_STAGING_PATH');

  const activeMaps = atlasRouteReservations(atlasConfig);
  const reserved = ['/', '/approved/', '/organizations/', '/404.html', '/approved-search.json', '/graph.json', '/sitemap.xml', '/feed.xml', '/robots.txt', '/catalog/documents/', '/catalog/characters/', '/catalog/locations/', '/catalog/items/', '/catalog/maps/', '/catalog/chronicle/', ...activeMaps];
  const local = prepareLocalArticles(root, reserved);
  const catalog = applyCatalogVisibility(organizeApprovedCatalog(local.catalog));
  const catalogThumbnails = JSON.parse(process.env.WIKI_PUBLICATION_CATALOG_THUMBNAILS || '{}');
  for (const entry of catalog.entries) if (catalogThumbnails[entry.id]) entry.thumbnail = catalogThumbnails[entry.id];
  const locationNavigation = organizeLocationNavigation(catalog.entries, [...local.articles, ...local.maps.map(map => map.entry)], require('./src/wiki-ui/location-navigation.json'));
  for (const article of [...local.articles, ...local.maps.map(map => map.entry)]) Object.assign(article, catalog.entries.find(entry => entry.id === article.id));
  for (const group of locationNavigation.groups) {
    const parent = [...local.articles, ...local.maps.map(map => map.entry)].find(article => article.id === group.id);
    parent.locationDirectory = true;
    if (catalogThumbnails[group.id]) group.thumbnail = catalogThumbnails[group.id];
    for (const article of local.articles.filter(article => group.entries.some(entry => entry.id === article.id))) article.locationParent ||= { title: group.title, url: group.url };
  }
  const maps = buildAtlasViews(local.maps, atlasConfig, local.catalog.map(entry => entry.url));
  for (const view of maps) view.directoryView = locationDirectoryView(view.articleHtml, locationNavigation.groups.find(group => group.id === view.entry.id));
  for (const article of [...local.articles, ...local.maps.map(map => map.entry)]) article.atlasLinks = atlasLinksForArticle(article, maps);

  const production = process.env.WIKI_PUBLICATION_MODE === 'production';
  if (!production && process.env.WIKI_PUBLICATION_MODE !== 'preview') throw Error('PUBLICATION_BUILD_MODE_INVALID');
  config.addGlobalData('publicationPreview', !production);
  config.addGlobalData('publicationProduction', production);
  const themeAssets = {
    banner: '/img/user/lorekeeper/dark-archive-dragon-banner.png',
    logo: '/img/user/lorekeeper/dark-archive-dragon-banner.png'
  };
  const approvedAssetUrls = new Set(local.files.map(file => file.url));
  const imageVariants = JSON.parse(process.env.WIKI_PUBLICATION_IMAGE_VARIANTS || '{}');
  config.addTransform('approved-image-variants', function (html) {
    return this.page.outputPath?.endsWith('.html') ? optimizeImageHtml(html, imageVariants, approvedAssetUrls) : html;
  });
  const approvedDecorations = Object.fromEntries(Object.entries(themeAssets).map(([name, url]) => [name, approvedAssetUrls.has(url) ? url : null]));
  config.addGlobalData('appearance', { ...loadAppearance(), decorations: { ...loadAppearance().decorations, ...approvedDecorations } });
  config.addGlobalData('wiki', { sections: catalog.sections });
  config.addGlobalData('activeMaps', maps);
  config.addGlobalData('approvedArticles', local.articles.map(article => characterPortraitView(article, local.files)));
  config.addGlobalData('approvedCatalog', catalog.entries);
  config.addGlobalData('approvedSections', catalog.sections.map(section => section.id === 'maps' ? { ...section, count: maps.length } : section));
  config.addGlobalData('approvedGroups', catalog.groups);
  config.addGlobalData('approvedOrganizations', catalog.organizations);
  config.addGlobalData('approvedTotal', catalog.total);
  config.addGlobalData('locationNavigation', locationNavigation);
  config.addGlobalData('organizationViews', organizationViews(local));
  config.addGlobalData('publicationSearch', projectApprovedSearch(local));
  const visibleIds = new Set(catalog.entries.map(entry => entry.id));
  const publicRelations = local.relations.filter(edge => visibleIds.has(edge.source_id) && visibleIds.has(edge.target_id));
  config.addGlobalData('publicationGraph', {
    schema_version: 1,
    nodes: catalog.entries.map(entry => ({ id: entry.id, url: entry.url, title: entry.title, category: entry.category, kind: entry.kind })),
    edges: publicRelations.map(edge => ({ id: edge.id, source: edge.source_id, target: edge.target_id, type: edge.type === 'associated_with_location' ? 'located_in' : edge.type, ...(edge.description ? { description: edge.description } : {}) }))
  });
  config.addGlobalData('publicationRoutes', [...new Set(['/', '/approved/', '/organizations/', ...catalog.sections.map(section => `/catalog/${section.id}/`), ...catalog.entries.map(entry => entry.url), ...maps.map(map => map.atlasUrl)])].sort());
  config.addGlobalData('publicationBaseUrl', publicBaseUrl(process.env.PUBLICATION_SITE_URL));

  config.addFilter('safeJson', data => JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, character => ({ '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' })[character]));
  config.addFilter('xml', escapeXml);
  config.addFilter('markdown', value => new MarkdownIt({ html: false }).render(value || ''));
  config.addPassthroughCopy({ 'src/wiki-ui/client.js': 'assets/wiki.js' });
  config.addPassthroughCopy({ 'src/wiki-ui/search.mjs': 'assets/search.mjs' });
  if (maps.length) config.addPassthroughCopy({ 'tools/publication-review/map.js': 'assets/map-viewer.js' });
  for (const file of local.files) {
    const relative = decodeURIComponent(file.url.slice(1));
    if (!relative.startsWith('img/') || relative.split('/').some(part => !part || part === '.' || part === '..')) throw Error('INVALID_PUBLIC_ASSET_PATH');
    const target = path.resolve(output, relative);
    if (!target.startsWith(output + path.sep)) throw Error('INVALID_PUBLIC_ASSET_PATH');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.bytes, { flag: 'wx' });
  }
  return { dir: { input: 'production/site', includes: '../../src/wiki-ui/templates', output }, templateFormats: ['njk'], htmlTemplateEngine: 'njk' };
};
