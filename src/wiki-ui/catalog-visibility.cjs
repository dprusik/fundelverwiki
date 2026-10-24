// Catalog visibility rules are empty; publication approval now determines which entries appear.
const exclusions = [];

function applyCatalogVisibility(catalog) {
  const entriesById = new Map(catalog.entries.map(entry => [entry.id, entry]));
  for (const exclusion of exclusions) {
    const entry = entriesById.get(exclusion.entryId);
    if (entry && entry.category !== exclusion.sectionId) throw Error('INVALID_CATALOG_VISIBILITY_RULE');
  }
  for (const section of catalog.sections) {
    const hidden = new Set(exclusions.filter(rule => rule.sectionId === section.id).map(rule => rule.entryId));
    section.catalogEntries = section.entries.filter(entry => !hidden.has(entry.id));
    section.catalogCount = section.catalogEntries.length;
  }
  return catalog;
}

module.exports = { applyCatalogVisibility };
