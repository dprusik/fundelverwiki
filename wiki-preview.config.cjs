const { loadDemo, groupCharacters } = require('./src/wiki-ui/model.cjs');
const path = require('node:path');
const MarkdownIt = require('markdown-it');
const fs = require('node:fs');
const { prepareLocalArticles } = require('./src/helpers/wiki/local-articles.cjs');
const { organizeApprovedCatalog } = require('./src/wiki-ui/catalog.cjs');
const { applyCatalogVisibility } = require('./src/wiki-ui/catalog-visibility.cjs');
const { projectApprovedSearch } = require('./src/helpers/wiki/approved-search.cjs');
const { organizeLocationNavigation, locationDirectoryView } = require('./src/wiki-ui/location-navigation.cjs');
const { atlasRouteReservations, buildAtlasViews, atlasLinksForArticle } = require('./src/wiki-ui/atlas.cjs');
const atlasConfig = require('./src/wiki-ui/atlas-navigation.json');
const { entityImageView } = require('./src/wiki-ui/character-portrait.cjs');

// Deliberately separate from .eleventy.js: only the approval adapter may read real content.
module.exports = function (config) {
  const demo = loadDemo();
  config.addGlobalData('localPreview', true);
  const local = prepareLocalArticles(process.cwd(), ['/', '/approved/', '/organizations/', '/404.html', '/demo-search.json', '/approved-search.json', ...atlasRouteReservations(atlasConfig)]);
  config.addGlobalData('approvedSearch', projectApprovedSearch(local));
  const catalog = applyCatalogVisibility(organizeApprovedCatalog(local.catalog));
  const locationNavigation = organizeLocationNavigation(catalog.entries, [...local.articles, ...local.maps.map(map => map.entry)], require('./src/wiki-ui/location-navigation.json'));
  for (const article of [...local.articles, ...local.maps.map(map => map.entry)]) Object.assign(article, catalog.entries.find(entry => entry.id === article.id));
  for (const group of locationNavigation.groups) {
    const parent = [...local.articles, ...local.maps.map(map => map.entry)].find(article => article.id === group.id);
    parent.locationDirectory = true;
    for (const article of local.articles.filter(article => group.entries.some(entry => entry.id === article.id))) {
      article.locationParent ||= { title: group.title, url: group.url };
    }
  }
  const activeMaps = buildAtlasViews(local.maps, atlasConfig, local.catalog.map(entry => entry.url));
  for (const view of activeMaps) view.directoryView = locationDirectoryView(view.articleHtml, locationNavigation.groups.find(group => group.id === view.entry.id));
  for (const article of [...local.articles, ...local.maps.map(map => map.entry)]) article.atlasLinks = atlasLinksForArticle(article, activeMaps);
  config.addGlobalData('wiki', demo);
  config.addGlobalData('activeMaps', activeMaps);
  config.addGlobalData('approvedArticles', local.articles.map(article => entityImageView(article, local.files)));
  config.addGlobalData('approvedCatalog', catalog.entries);
  config.addGlobalData('approvedSections', catalog.sections.map(section => section.id === 'maps' ? { ...section, count: activeMaps.length } : section));
  config.addGlobalData('approvedGroups', catalog.groups);
  config.addGlobalData('approvedOrganizations', catalog.organizations);
  config.addGlobalData('approvedTotal', catalog.total);
  config.addGlobalData('locationNavigation', locationNavigation);
  config.addGlobalData('characterGroups', groupCharacters(demo));
  config.addFilter('demoSearch', data => JSON.stringify({ demonstration: true, entries: data.entries, relations: data.relations }));
  config.addFilter('safeJson', data => JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, character => ({ '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' })[character]));
  config.addFilter('markdown', value => new MarkdownIt({ html: false }).render(value || ''));
  config.addFilter('entry', id => demo.entries.find(entry => entry.id === id));
  config.addFilter('inSection', section => demo.entries.filter(entry => entry.section === section));
  config.addFilter('relationsTo', id => demo.relations.filter(edge => edge.target === id));
  config.addFilter('relationsFrom', id => demo.relations.filter(edge => edge.source === id));
  config.addFilter('relatedCharacters', id => demo.relations
    .filter(edge => edge.target === id && edge.type === 'located_in')
    .map(edge => ({ character: demo.entries.find(entry => entry.id === edge.source), description: edge.description }))
    .filter(item => item.character?.kind === 'character'));
  config.addPassthroughCopy({ 'src/wiki-ui/client.js': 'assets/wiki.js' });
  config.addPassthroughCopy({ 'src/wiki-ui/search.mjs': 'assets/search.mjs' });
  config.addPassthroughCopy({ 'src/wiki-ui/assets/rosedim.webp': 'assets/rosedim.webp' });
  config.addPassthroughCopy({ 'tools/publication-review/map.js': 'assets/map-viewer.js' });
  config.addPassthroughCopy({ 'src/wiki-ui/themes/assets/dragon-banner.png': 'assets/branding/dragon-banner.png' });
  config.addPassthroughCopy({ 'src/wiki-ui/themes/assets/bekrit-mask.png': 'assets/branding/bekrit-mask.png' });
  // Images are copied only from the explicitly approved demo asset manifest.
  for (const asset of demo.assets || []) config.addPassthroughCopy({ [`src/wiki-ui/assets/${asset.src.split('/').pop()}`]: asset.src.slice(1) });
  // Real content enters this isolated local prototype through the scoped approval adapter only.
  const output = path.resolve('.wiki-preview');
  for (const file of local.files) {
    const target = path.resolve(output, '.' + decodeURIComponent(file.url));
    if (!target.startsWith(output + path.sep) || !file.url.startsWith('/img/')) throw Error('Unsafe approved asset path.');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.bytes);
  }
  return {
    dir: { input: 'prototype/site', includes: '../../src/wiki-ui/templates', output: '.wiki-preview' },
    templateFormats: ['njk'], htmlTemplateEngine: 'njk'
  };
};
