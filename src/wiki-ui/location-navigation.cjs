const { parse } = require('node-html-parser');

// Explicit DM-selected navigation, projected through approved articles only.
// Place membership is independent of map markers and source folder names.
function organizeLocationNavigation(catalog, articles, config) {
  const fail = () => { throw Error('INVALID_LOCATION_NAVIGATION'); };
  if (config?.schema_version !== 1 || !Array.isArray(config.groups)) fail();
  const byId = new Map(catalog.map(entry => [entry.id, entry]));
  const articlesById = new Map(articles.map(article => [article.id, article]));
  const seen = new Set(), assigned = new Set(), groups = [];
  for (const definition of config.groups) {
    if (!definition || typeof definition.parent_id !== 'string' || seen.has(definition.parent_id) || !Array.isArray(definition.member_ids) || definition.member_ids.some(id => typeof id !== 'string') || new Set(definition.member_ids).size !== definition.member_ids.length) fail();
    seen.add(definition.parent_id);
    const parent = byId.get(definition.parent_id), article = articlesById.get(definition.parent_id);
    if (!parent || !article || parent.kind !== 'location') continue;
    // Config alone cannot expose a relation removed from the approved parent article.
    const links = new Set(parse(article.html).querySelectorAll('a[href]').map(a => a.getAttribute('href')));
    const members = new Set(definition.member_ids);
    const entries = catalog.filter(entry => members.has(entry.id) && entry.id !== parent.id && entry.category === 'locations' && entry.kind === 'location' && links.has(entry.url));
    entries.forEach(entry => assigned.add(entry.id));
    assigned.add(parent.id);
    groups.push({ id: parent.id, title: parent.title, url: parent.url, count: entries.length, entries });
  }
  groups.sort((a, b) => a.title.localeCompare(b.title, 'pl'));
  return { groups, ungrouped: catalog.filter(entry => entry.category === 'locations' && !assigned.has(entry.id)) };
}
// Replace only a complete, standalone list of canonical child links.
// Narrative, custom labels and mixed lists stay in the original article.
function locationDirectoryView(html, group) {
  if (!group?.entries.length) return null;
  const document = parse(html), byUrl = new Map(group.entries.map(entry => [entry.url, entry.title]));
  for (const list of document.querySelectorAll('ul,ol')) {
    if (list.parentNode !== document || list.children.length !== group.entries.length || list.children.some(li => li.tagName !== 'LI')) continue;
    const urls = [];
    const valid = list.children.every(li => {
      const nodes = li.childNodes.filter(node => node.nodeType !== 3 || node.textContent.trim());
      if (nodes.length !== 1 || nodes[0].tagName !== 'A') return false;
      const link = nodes[0], url = link.getAttribute('href');
      if (!byUrl.has(url) || link.textContent.trim() !== byUrl.get(url)) return false;
      urls.push(url); return true;
    });
    if (!valid || new Set(urls).size !== group.entries.length) continue;
    const index = document.childNodes.indexOf(list);
    const previous = document.childNodes.slice(0, index).filter(node => node.nodeType !== 3 || node.textContent.trim()).at(-1);
    const title = `Lokacje w ${group.title}`;
    const replaceHeading = /^H[2-6]$/.test(previous?.tagName || '') && previous.textContent.trim() === title;
    return { title, entries: group.entries, beforeHtml: html.slice(0, replaceHeading ? previous.range[0] : list.range[0]).trim(), afterHtml: html.slice(list.range[1]).trim() };
  }
  return null;
}
module.exports = { organizeLocationNavigation, locationDirectoryView };
