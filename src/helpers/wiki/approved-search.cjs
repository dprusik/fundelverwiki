const { parse } = require('node-html-parser');

const compact = value => value.replace(/\s+/gu, ' ').trim();
function renderedText(html) {
  // Omit `pre` from raw-text elements so <code> tags/classes are parsed, not indexed.
  const document = parse(html, { blockTextElements: { script: true, style: true, noscript: true } });
  // Defense in depth: the approved renderer never emits active or hidden HTML.
  for (const node of document.querySelectorAll('script, style, template, [hidden], [aria-hidden="true"]')) node.remove();
  return compact(document.structuredText);
}

// This input is the validated DTO returned by prepareLocalArticles, not raw notes.
// Each field is explicit so future additions to that DTO never enter search by default.
function projectApprovedSearch(local) {
  const entries = local.catalog.map(entry => {
    const map = local.maps.find(preview => preview.entry.id === entry.id)?.map;
    const text = [renderedText(entry.html)];
    if (map) for (const marker of map.markers) text.push(marker.name, marker.description);
    const body = compact(text.join(' '));
    return { id: entry.id, url: entry.url, title: entry.title, category: entry.category,
      aliases: (entry.aliases || []).slice(), body, summary: entry.summary || '' };
  }).sort((a, b) => a.title.localeCompare(b.title, 'pl', { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id));
  return { schema_version: 1, demonstration: false, entries };
}
module.exports = { projectApprovedSearch, renderedText };
