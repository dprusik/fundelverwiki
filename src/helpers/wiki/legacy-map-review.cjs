const fs = require('node:fs');
const path = require('node:path');
const { scanRepository, sha } = require('./publication.cjs');
const { readRegistries } = require('./registry-store.cjs');
const { extractLegacyMap, projectLegacyMap, LegacyMapError } = require('./legacy-map.cjs');
function reviewedMap(root, review, key) {
  const records = scanRepository(root), registry = readRegistries(root).data;
  const events = review.events(), rows = review.list(records, events);
  const approved = [];
  for (const row of rows.filter(item => item.state === 'approved' && item.scope === 'content')) {
    const latest = events.filter(item => item.key === row.key).at(-1);
    const name = row.kind === 'entry' ? 'public-entries.json' : 'public-assets.json';
    const collection = row.kind === 'entry' ? 'entries' : 'assets';
    const metadata = latest?.metadata || registry[name][collection].find(item => item.source_key === row.key);
    if (!metadata) continue;
    approved.push({ ...metadata, source_key: row.key, sha256: row.sha256, approved: true });
  }
  const record = records.find(item => item.key === key);
  const entry = approved.find(item => item.source_key === key);
  if (!record || !entry || record.kind !== 'entry' || !record.parsed) throw new LegacyMapError('MAP_SOURCE_UNAPPROVED');
  const parsed = extractLegacyMap(record.parsed.content);
  if (!parsed) throw new LegacyMapError('MAP_FORMAT_NOT_FOUND');
  const entries = approved.filter(item => records.find(record => record.key === item.source_key)?.kind === 'entry');
  const assets = approved.filter(item => records.find(record => record.key === item.source_key)?.kind === 'asset');
  const result = projectLegacyMap(parsed, record, entry, records, entries, assets, true);
  const imageApproval = assets.find(item => item.id === result.map.image.id);
  const imageRecord = records.find(item => item.key === imageApproval.source_key);
  return { result, entry, imageRecord };
}
function reviewedMapImage(root, review, key) {
  const { imageRecord } = reviewedMap(root, review, key);
  const bytes = fs.readFileSync(path.join(root, imageRecord.source));
  if (sha(bytes) !== imageRecord.sha256) throw new LegacyMapError('MAP_IMAGE_CHANGED');
  return { bytes, type: { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[imageRecord.extension] };
}
module.exports = { reviewedMap, reviewedMapImage };
