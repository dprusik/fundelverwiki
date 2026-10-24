const { parse } = require('node-html-parser');

// Presentation of explicit links already present in approved rendered articles.
// A mention is not promoted to a member_of relationship or written to any registry.
function organizationViews(local) {
  const byUrl = new Map(local.catalog.map(entry => [entry.url, entry]));
  const imageUrls = new Set(local.files.map(file => file.url));
  const views = {};
  for (const organization of local.catalog.filter(entry => ['faction', 'organization'].includes(entry.kind))) {
    const document = parse(organization.html);
    const characters = [], seen = new Set();
    for (const link of document.querySelectorAll('a[href]')) {
      const target = byUrl.get(link.getAttribute('href'));
      if (target?.kind !== 'character' || seen.has(target.id)) continue;
      seen.add(target.id);
      const image = parse(target.html).querySelector('img');
      const src = image?.getAttribute('src');
      const label = link.textContent.trim();
      characters.push({ id: target.id, url: target.url, title: target.title,
        ...(target.summary ? { summary: target.summary } : {}),
        ...(src && imageUrls.has(src) ? { illustration: { src } } : {}),
        ...(label && label !== target.title ? { mentionLabel: label } : {}) });
    }
    // Link-only paragraphs become cards. Narrative and other links stay intact.
    for (const paragraph of document.querySelectorAll('p')) {
      if (paragraph.childNodes.length && paragraph.childNodes.every(node =>
        node.nodeType === 3 ? !node.textContent.trim() : node.tagName === 'A' && byUrl.get(node.getAttribute('href'))?.kind === 'character' && node.textContent.trim() === byUrl.get(node.getAttribute('href')).title)) paragraph.remove();
    }
    views[organization.id] = { html: document.toString().trim(), characters };
  }
  return views;
}
module.exports = { organizationViews };
