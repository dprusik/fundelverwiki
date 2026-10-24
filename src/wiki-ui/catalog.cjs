// Uses only approved projected metadata; never infers categories from source paths.
const sections = [
  { id: 'documents', label: 'Dokumenty', symbol: '▤', description: 'Listy, dzienniki i materiały drużyny.' },
  { id: 'characters', label: 'Postacie', symbol: '♙', description: 'Postacie oraz organizacje świata kampanii.' },
  { id: 'locations', label: 'Lokacje', symbol: '⌖', description: 'Zatwierdzone opisy miejsc i spisy lokacji.' },
  { id: 'items', label: 'Przedmioty', symbol: '◇', description: 'Przedmioty i ich karty.' },
  { id: 'maps', label: 'Mapy', symbol: '▧', description: 'Mapy i dostępne na nich punkty.' },
  { id: 'chronicle', label: 'Kronika', symbol: '◷', description: 'Zatwierdzone zapisy wydarzeń i sesji.' }
];
const kinds = { article: 'Dokument', character: 'Postać', faction: 'Frakcja', organization: 'Organizacja', location: 'Lokacja', item: 'Przedmiot', spell: 'Zaklęcie', session: 'Sesja' };
function organizeApprovedCatalog(catalog) {
  const entries = catalog.map(entry => {
    const section = sections.find(section => section.id === entry.category);
    if (!section || !kinds[entry.kind]) throw Error('INVALID_APPROVED_CATALOG_METADATA');
    const organization = ['faction', 'organization'].includes(entry.kind);
    return { id: entry.id, url: entry.url, title: entry.title, category: entry.category, kind: entry.kind,
      kindLabel: kinds[entry.kind], section: entry.category,
      sectionLabel: organization ? 'Organizacje' : section.label,
      sectionUrl: organization ? '/organizations/' : `/catalog/${section.id}/`,
      ...(entry.summary ? { summary: entry.summary } : {}) };
  }).sort((a, b) => a.title.localeCompare(b.title, 'pl', { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id));
  const organizations = entries.filter(entry => ['faction', 'organization'].includes(entry.kind));
  const organized = sections.map(section => {
    const members = entries.filter(entry => entry.category === section.id);
    return { ...section, count: members.length, entries: members.filter(entry => !organizations.includes(entry)), organizations: organizations.filter(entry => entry.category === section.id) };
  });
  const groups = organized.flatMap(section => [
    { id: section.id, label: section.label, url: `/catalog/${section.id}/`, entries: section.entries, count: section.entries.length },
    ...(section.organizations.length ? [{ id: 'organizations', label: 'Organizacje', url: '/organizations/', entries: section.organizations, count: section.organizations.length }] : [])
  ]);
  return { entries, sections: organized, organizations, groups, total: entries.length };
}
module.exports = { organizeApprovedCatalog };
