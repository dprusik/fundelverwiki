const fs = require('node:fs');
const path = require('node:path');

function validateDemo(data) {
  if (data.demonstration !== true || data.schema_version !== 1) throw Error('Only versioned demonstration data is permitted.');
  const ids = new Set();
  const assetIds = new Set();
  for (const asset of data.assets || []) {
    if (!/^[a-z0-9-]+$/.test(asset.id) || assetIds.has(asset.id) || asset.approved !== true || typeof asset.alt !== 'string' || !asset.alt.trim() || !/^\/assets\/branding\/[a-z0-9-]+\.(svg|png|jpg|webp)$/.test(asset.src)) throw Error('Invalid or unapproved public demo asset.');
    if (!fs.existsSync(path.join(__dirname, 'assets', path.basename(asset.src)))) throw Error('Missing public demo asset.');
    assetIds.add(asset.id);
  }
  const sectionIds = new Set(data.sections.map(section => section.id));
  for (const entry of data.entries) {
    if (!/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id) || !sectionIds.has(entry.section)) throw Error('Invalid demo entry.');
    ids.add(entry.id);
    for (const field of ['portrait_asset_id', 'illustration_asset_id']) {
      if (entry[field] !== undefined && (!assetIds.has(entry[field]) || entry.kind !== (field === 'portrait_asset_id' ? 'character' : 'location'))) throw Error('Invalid public image reference.');
    }
    if (entry.status !== undefined && (entry.kind !== 'character' || entry.status?.approved !== true || !['alive', 'dead', 'missing', 'unknown'].includes(entry.status.value) || Object.keys(entry.status).some(key => !['value', 'approved'].includes(key)))) throw Error('Status requires explicit public approval.');
  }
  const edges = new Set();
  for (const edge of data.relations) {
    const source = data.entries.find(entry => entry.id === edge.source);
    const target = data.entries.find(entry => entry.id === edge.target);
    const key = `${edge.source}:${edge.type}:${edge.target}`;
    const types = { member_of: 'organization', located_in: 'location', document: 'document' };
    if (!source || !target || edge.approved !== true || types[edge.type] !== target.kind || edges.has(key)) throw Error('Invalid or unapproved demo relation.');
    edges.add(key);
    if (edge.description !== undefined && (typeof edge.description !== 'string' || !edge.description.trim() || edge.description.length > 280)) throw Error('Invalid public relation description.');
  }
  // Explicit allowlist: even demo configuration cannot inject executable CSS.
  for (const [key, value] of Object.entries(data.campaign.theme)) {
    if (!['accent', 'background', 'surface', 'text', 'fontBody', 'fontHeading'].includes(key) || !/^[a-zA-Z0-9# ,.-]+$/.test(value)) throw Error('Invalid theme token.');
  }
  if (data.campaign.logo && !/^\/assets\/[a-zA-Z0-9/_.-]+\.(png|jpg|webp|svg)$/.test(data.campaign.logo)) throw Error('Logo must be a local asset.');
  return data;
}

function loadDemo() {
  const data = validateDemo(JSON.parse(fs.readFileSync(path.join(__dirname, 'demo.json'), 'utf8')));
  const statuses = { alive: 'Żyje', dead: 'Nie żyje', missing: 'Zaginiony', unknown: 'Nieznany' };
  data.entries = data.entries.map(entry => ({
    ...entry, url: `/demo/entities/${entry.id}/`,
    portrait: data.assets?.find(asset => asset.id === entry.portrait_asset_id),
    illustration: data.assets?.find(asset => asset.id === entry.illustration_asset_id),
    publicStatus: entry.status ? statuses[entry.status.value] : undefined
  }));
  data.recent = data.entries.filter(entry => entry.published_at).sort((a, b) => b.published_at.localeCompare(a.published_at)).slice(0, 6);
  return data;
}

function groupCharacters(data) {
  const characters = data.entries.filter(entry => entry.kind === 'character');
  const grouped = (type) => {
    const groups = data.entries.filter(entry => data.relations.some(edge => edge.type === type && edge.target === entry.id && characters.some(character => character.id === edge.source))).map(entry => ({
      id: entry.id, title: entry.title, url: entry.url,
      entries: characters.filter(character => data.relations.some(edge => edge.source === character.id && edge.type === type && edge.target === entry.id))
    }));
    const unassigned = characters.filter(character => !data.relations.some(edge => edge.source === character.id && edge.type === type));
    if (unassigned.length) groups.push({ id: 'unassigned', title: 'Bez publicznego przypisania', entries: unassigned });
    return groups;
  };
  return { all: [{ id: 'all', title: 'Wszystkie postacie', entries: characters }], faction: grouped('member_of'), location: grouped('located_in') };
}

module.exports = { validateDemo, loadDemo, groupCharacters };
