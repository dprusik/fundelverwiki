const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const matter = require('gray-matter');
const yaml = require(require.resolve('js-yaml', { paths: [require.resolve('gray-matter')] }));
const slugify = require('@sindresorhus/slugify');
const { extractLegacyMap, projectLegacyMap, validPolicy, LegacyMapError } = require('./legacy-map.cjs');

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const opaqueKey = (kind, source) => `${kind}-${sha(source).slice(0, 20)}`;
const categories = new Set(['documents', 'characters', 'locations', 'items', 'maps', 'chronicle']);
const kinds = new Set(['article', 'character', 'organization', 'faction', 'location', 'item', 'spell', 'session']);
class PublicationError extends Error {
  constructor(issues) { super('PUBLICATION_BLOCKED'); this.issues = issues; }
}
function privateOperation(action) {
  try { return action(); }
  catch (error) {
    if (error instanceof PublicationError) throw error;
    // OS/parser exceptions can include private filenames or source snippets.
    throw new PublicationError([{ code: 'INPUT_READ_OR_SCHEMA_ERROR', ref: 'input' }]);
  }
}
function walk(root, relative = '') {
  const result = [];
  if (!fs.existsSync(path.join(root, relative))) return result;
  if (fs.lstatSync(path.join(root, relative)).isSymbolicLink()) throw new PublicationError([{ code: 'UNSUPPORTED_INPUT', ref: opaqueKey('input', relative) }]);
  for (const item of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const source = path.posix.join(relative, item.name);
    // Never traverse links, vault metadata or version control, including in fixtures.
    if (item.isSymbolicLink() || ['.obsidian', '.git', 'node_modules'].includes(item.name)) throw new PublicationError([{ code: 'UNSUPPORTED_INPUT', ref: opaqueKey('input', source) }]);
    if (item.isDirectory()) result.push(...walk(root, source));
    else result.push(source);
  }
  return result.sort();
}
function parseNote(buffer) {
  try {
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    if (text.startsWith('---') && !/^---(?:yaml|json)?\r?\n/.test(text)) return null;
    return matter(text, { engines: { yaml: frontmatter => yaml.load(frontmatter.replace(/\\\|/g, '|'), { schema: yaml.JSON_SCHEMA }) } });
  } catch { return null; }
}
function canonicalUrl(source, data) {
  const tags = Array.isArray(data.tags) ? data.tags : typeof data.tags === 'string' ? [data.tags] : [];
  if (tags.includes('gardenEntry')) return '/';
  if (typeof data.permalink === 'string') return data.permalink;
  // Inherited layout default confirmed in layouts/note.njk. Approval still binds this URL.
  return `/notes/${slugify(path.basename(source, path.extname(source)))}/`;
}
function localUrl(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !/[?#\\<>"'\s\x00-\x1f{}%]/.test(value) && !value.split('/').some(part => part === '.' || part === '..');
}
function localChannelEvidence(root) {
  const read = name => { try { return fs.readFileSync(path.join(root, 'dist', name), 'utf8'); } catch { return ''; } };
  const json = name => { try { return JSON.parse(read(name)); } catch { return null; } };
  const graphStrings = new Set();
  const collect = value => {
    if (typeof value === 'string') graphStrings.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(json('graph.json'));
  const search = json('searchIndex.json');
  const searchUrls = new Set(Array.isArray(search) ? search.map(item => item.url) : []);
  const urlPath = value => { try { return new URL(value, 'https://local.invalid').pathname; } catch { return null; } };
  const sitemapUrls = new Set([...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => urlPath(match[1])));
  const feedUrls = new Set([...read('feed.xml').matchAll(/<link[^>]+href="([^"]+)"/g)].map(match => urlPath(match[1])));
  return url => ({ search: searchUrls.has(url), graph: graphStrings.has(url), sitemap: sitemapUrls.has(url), feed: feedUrls.has(url) });
}
function inventorySources(root) {
  const records = [];
  if (!fs.existsSync(path.join(root, 'src/site')) || fs.lstatSync(path.join(root, 'src')).isSymbolicLink()) throw new PublicationError([{ code: 'INPUT_ROOT_MISSING_OR_UNSAFE', ref: 'input' }]);
  const files = walk(root, 'src/site');
  const evidence = localChannelEvidence(root);
  for (const source of files) {
    const isEntry = source.startsWith('src/site/notes/') && /\.(md|canvas)$/i.test(source);
    const isAsset = source.startsWith('src/site/img/') || /^src\/site\/(logo\.[^/]+|favicon\.svg)$/.test(source) || /\.(css|woff2?|ttf|otf|png|jpe?g|gif|webp|svg|pdf|mp[34])$/i.test(source);
    const kind = isEntry ? 'entry' : isAsset ? 'asset' : 'system';
    const bytes = fs.readFileSync(path.join(root, source));
    const parsed = isEntry ? parseNote(bytes) : null;
    const url = isEntry && parsed ? canonicalUrl(source, parsed.data) : isAsset ? '/' + source.slice('src/site/'.length) : null;
    let localHtml = false;
    if (isEntry && url && localUrl(url)) {
      const target = path.join(root, 'dist', url === '/' ? 'index.html' : url.slice(1) + (url.endsWith('/') ? 'index.html' : ''));
      localHtml = fs.existsSync(target) && fs.statSync(target).isFile();
    }
    const localAssetPath = isAsset ? path.join(root, 'dist', source.slice('src/site/'.length)) : null;
    const localAsset = localAssetPath && fs.existsSync(localAssetPath) && fs.statSync(localAssetPath).isFile();
    records.push({ key: opaqueKey(kind, source), kind, source, sha256: sha(bytes), bytes: bytes.length,
      parsed, url, extension: path.extname(source).toLowerCase(), localHtml,
      localChannels: isEntry && url ? evidence(url) : undefined,
      localAsset: Boolean(localAsset), localAssetMatches: Boolean(localAsset && sha(fs.readFileSync(localAssetPath)) === sha(bytes)),
      flag: !isEntry ? null : !parsed ? 'parse_error' : parsed.data['dg-publish'] === true ? 'true' : parsed.data['dg-publish'] === false ? 'false' : parsed.data['dg-publish'] === undefined ? 'missing' : 'invalid' });
  }
  return records;
}
function scanRepository(root) { return privateOperation(() => inventorySources(root)); }
function redactedInventory(records) {
  return records.map(record => ({ key: record.key, kind: record.kind, sha256: record.sha256, bytes: record.bytes, extension: record.extension,
    ...(record.kind === 'entry' ? { dg_publish: record.flag, local_dist_html: record.localHtml, local_channels: record.localChannels, effective_url_sha256: record.url ? sha(record.url) : null } : {}),
    ...(record.kind === 'asset' ? { local_dist_asset: record.localAsset, local_dist_bytes_match: record.localAssetMatches } : {}),
    remote_publication: 'unverified', review: 'pending' }));
}
function readRegistry(root, name, collection) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'src/wiki', name), 'utf8'));
    if (data.schema_version !== 1 || !Array.isArray(data[collection]) || Object.keys(data).some(key => !['schema_version', collection].includes(key))) throw Error();
    return data[collection];
  } catch { throw new PublicationError([{ code: 'INVALID_REGISTRY', ref: name }]); }
}
const safeText = (value, max = 280) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[<>\x00-\x08]/.test(value);
function validatePublicationInputs(root, registryOverride, localScope = null) {
  if (['.publication-import.pending', '.publication-import.lock'].some(name => fs.existsSync(path.join(root, 'src/wiki', name)))) throw new PublicationError([{ code: 'REGISTRY_IMPORT_INCOMPLETE', ref: 'registries' }]);
  const allRecords = scanRepository(root);
  const scopeKeys = localScope?.sourceKeys ? new Set(localScope.sourceKeys) : null;
  if (scopeKeys && (!scopeKeys.size || scopeKeys.size > 20 || [...scopeKeys].some(key => !allRecords.some(record => record.key === key)))) throw new PublicationError([{ code: 'INVALID_LOCAL_PREVIEW_SCOPE', ref: 'preview' }]);
  const records = scopeKeys ? allRecords.filter(record => scopeKeys.has(record.key)) : allRecords;
  const load = (name, collection) => {
    const items = registryOverride ? registryOverride[name][collection] : readRegistry(root, name, collection);
    if (!scopeKeys) return items;
    if (name === 'public-relations.json') return [];
    return items.filter(item => scopeKeys.has(item.source_key ?? item.key));
  };
  const entries = load('public-entries.json', 'entries');
  const assets = load('public-assets.json', 'assets');
  const systems = load('public-system.json', 'inputs');
  const relations = load('public-relations.json', 'relations');
  const decisions = load('publication-decisions.json', 'decisions');
  const issues = [];
  const byKey = new Map(allRecords.map(record => [record.key, record]));
  const decisionByKey = new Map();
  for (const decision of decisions) {
    if (Object.keys(decision).some(key => !['key', 'state'].includes(key)) || !['pending', 'denied'].includes(decision.state) || !byKey.has(decision.key) || decisionByKey.has(decision.key)) issues.push({ code: 'INVALID_REVIEW_DECISION', ref: 'decisions' });
    decisionByKey.set(decision.key, decision.state);
  }
  const approved = new Map();
  const legacyMaps = new Map();
  const ids = new Set(); const urls = new Set();
  const shapes = {
    entry: ['id', 'source_key', 'sha256', 'approved', 'reviewed_at', 'title', 'permalink', 'category', 'kind', 'summary', 'aliases', 'published_at', 'portrait_asset_id', 'illustration_asset_id', 'status', 'legacy_map'],
    asset: ['id', 'source_key', 'sha256', 'approved', 'reviewed_at', 'url', 'alt'],
    system: ['source_key', 'sha256', 'approved', 'reviewed_at']
  };
  for (const [type, list] of [['entry', entries], ['asset', assets], ['system', systems]]) {
    for (const item of list) {
      const record = byKey.get(item.source_key);
      const ref = record?.key || 'registry';
      const fail = code => issues.push({ code, ref });
      if (!record || record.kind !== type || approved.has(item.source_key) || Object.keys(item).some(key => !shapes[type].includes(key))) { fail('INVALID_APPROVAL'); continue; }
      if (item.approved !== true || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(item.reviewed_at || '') || !Number.isFinite(Date.parse(item.reviewed_at))) fail('EXPLICIT_REVIEW_REQUIRED');
      if (record.sha256 !== item.sha256) fail('SOURCE_CHANGED');
      if (decisionByKey.has(record.key)) fail('CONFLICTING_REVIEW_DECISION');
      if (type !== 'system') {
        if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(item.id || '') || ids.has(item.id)) fail('INVALID_OR_DUPLICATE_ID');
        ids.add(item.id);
      }
      if (type === 'entry') {
        if (record.flag !== 'true') fail('PUBLISH_FLAG_REQUIRED');
        if (!localUrl(item.permalink) || item.permalink !== record.url || urls.has(item.permalink)) fail('CANONICAL_URL_MISMATCH');
        urls.add(item.permalink);
        if (!safeText(item.title, 160) || !categories.has(item.category) || !kinds.has(item.kind)) fail('INVALID_PUBLIC_METADATA');
        if (item.summary !== undefined && !safeText(item.summary)) fail('INVALID_PUBLIC_METADATA');
        if (item.aliases !== undefined && (!Array.isArray(item.aliases) || item.aliases.some(alias => !safeText(alias, 160)))) fail('INVALID_PUBLIC_METADATA');
        if (item.published_at !== undefined && (!/^\d{4}-\d{2}-\d{2}(T.*Z)?$/.test(item.published_at) || !Number.isFinite(Date.parse(item.published_at)))) fail('INVALID_PUBLIC_DATE');
        if (item.status !== undefined && (item.kind !== 'character' || item.status?.approved !== true || !['alive', 'dead', 'missing', 'unknown'].includes(item.status.value) || Object.keys(item.status).some(key => !['value', 'approved'].includes(key)))) fail('STATUS_REVIEW_REQUIRED');
        const allowedFrontmatter = new Set(['dg-publish', 'permalink', 'title', 'tags', 'created', 'updated', 'cssclasses', 'noteIcon', 'dgShowBacklinks', 'dgShowLocalGraph', 'dgShowToc', 'dgShowInlineTitle', 'dgEnableSearch', 'dgHomeLink', 'dgShowFileTree', 'dgLinkPreview', 'dgShowTags', 'hide', 'hideInFiletree', 'hideInGraph']);
        if (!record.parsed || Object.keys(record.parsed.data).some(key => !allowedFrontmatter.has(key))) fail('UNREVIEWED_FRONTMATTER');
        if (record.extension === '.canvas') fail('CANVAS_CHANNEL_NOT_SUPPORTED');
        let content = record.parsed?.content || '';
        try {
          const map = extractLegacyMap(content);
          if (map) { legacyMaps.set(record.key, map); content = map.markdown; }
          if (!validPolicy(item.legacy_map) || item.legacy_map && !map) fail('MAP_LINK_POLICY_REVIEW_REQUIRED');
        } catch (error) { if (!(error instanceof LegacyMapError)) throw error; fail(error.code); }
        if (/<\/?[a-z!]|```\s*(base|dataview|dataviewjs)|\{[{%]|%%/i.test(content)) fail('ACTIVE_CONTENT_CHANNEL_NOT_SUPPORTED');
      }
      if (type === 'asset') {
        // Target path must preserve the existing publication address; URL-encode spaces/Unicode.
        if (typeof item.url !== 'string' || item.url !== encodeURI(record.url) || !safeText(item.alt, 500)) fail('INVALID_ASSET_METADATA');
      }
      approved.set(item.source_key, item);
    }
  }
  for (const record of records) {
    if (!approved.has(record.key)) issues.push({ code: decisionByKey.get(record.key) === 'denied' ? 'DENIED_INPUT' : 'UNAPPROVED_INPUT', ref: record.key });
  }
  const entryById = new Map(entries.map(entry => [entry.id, entry]));
  const assetById = new Map(assets.map(asset => [asset.id, asset]));
  const linkTargets = new Set(entries.map(entry => entry.permalink));
  const assetTargets = new Set(assets.map(asset => asset.url));
  for (const entry of entries) {
    for (const [field, kind] of [['portrait_asset_id', 'character'], ['illustration_asset_id', 'location']]) {
      if (entry[field] !== undefined && (entry.kind !== kind || !assetById.has(entry[field]))) issues.push({ code: 'UNAPPROVED_IMAGE_REFERENCE', ref: entry.source_key });
    }
    const record = byKey.get(entry.source_key);
    if (!record?.parsed) continue;
    const content = record.parsed.content;
    // Fail closed on unresolved wiki dependencies, including private targets; no inference of relations.
    for (const match of content.matchAll(/!?\[\[([^\]|#]+)(?:[^\]]*)\]\]/g)) {
      const target = match[1].replace(/\\$/, '').trim();
      const embed = match[0].startsWith('!');
      const matches = records.filter(candidate => embed
        ? candidate.kind === 'asset' && (candidate.source.slice('src/site/'.length) === target || path.basename(candidate.source) === target)
        : candidate.source.startsWith('src/site/notes/') && (candidate.source.slice('src/site/notes/'.length).replace(/\.(md|canvas)$/, '') === target || path.basename(candidate.source).replace(/\.(md|canvas)$/, '') === target));
      if (matches.length !== 1 || !approved.has(matches[0].key)) issues.push({ code: 'UNAPPROVED_WIKILINK', ref: record.key });
    }
    for (const match of content.matchAll(/!?\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+[^)]*)?\)/g)) {
      const target = match[1].split('#')[0];
      if (target && !linkTargets.has(target) && !assetTargets.has(target)) issues.push({ code: 'UNAPPROVED_LINK_OR_ASSET', ref: record.key });
    }
  }
  const relationIds = new Set(); const triples = new Set();
  const maps = [];
  for (const [key, parsed] of legacyMaps) {
    try { maps.push(projectLegacyMap(parsed, byKey.get(key), approved.get(key), records, entries, assets).map); }
    catch (error) { if (!(error instanceof LegacyMapError)) throw error; issues.push({ code: error.code, ref: key }); }
  }
  const targetKinds = { member_of: ['organization', 'faction'], associated_with_location: ['location'], located_in: ['location'], document: ['article'] };
  for (const edge of relations) {
    const source = entryById.get(edge.source_id), target = entryById.get(edge.target_id);
    const triple = `${edge.source_id}:${edge.type}:${edge.target_id}`;
    if (Object.keys(edge).some(key => !['id', 'source_id', 'target_id', 'type', 'approved', 'description'].includes(key)) || !/^[a-z0-9-]{3,80}$/.test(edge.id || '') || relationIds.has(edge.id) || triples.has(triple) || edge.approved !== true || !source || !target || !Object.hasOwn(targetKinds, edge.type) || !targetKinds[edge.type]?.includes(target.kind) || (edge.description !== undefined && !safeText(edge.description))) issues.push({ code: 'UNAPPROVED_OR_INVALID_RELATION', ref: 'relations' });
    relationIds.add(edge.id); triples.add(triple);
  }
  const blockingIssues = localScope?.allowUnapproved ? issues.filter(issue => !['UNAPPROVED_INPUT', 'DENIED_INPUT'].includes(issue.code)) : issues;
  if (blockingIssues.length) throw new PublicationError(blockingIssues);
  return { records, entries, assets, relations, maps };
}
function validatePublication(root, registryOverride) { return privateOperation(() => validatePublicationInputs(root, registryOverride)); }
function validateLocalApprovedData(root) { return privateOperation(() => validatePublicationInputs(root, null, { allowUnapproved: true })); }
function projectPublicData(verified) {
  const statuses = { alive: 'Żyje', dead: 'Nie żyje', missing: 'Zaginiony', unknown: 'Nieznany' };
  const assets = verified.assets.map(asset => ({ id: asset.id, src: asset.url, alt: asset.alt }));
  const visible = verified.entries.filter(item => !verified.records.find(record => record.key === item.source_key).parsed.data.hide);
  const visibleIds = new Set(visible.map(item => item.id));
  const entries = visible.map(item => {
    const result = { id: item.id, url: item.permalink, title: item.title, category: item.category, section: item.category, kind: item.kind, aliases: (item.aliases || []).slice() };
    if (item.summary !== undefined) result.summary = item.summary;
    if (item.published_at !== undefined) result.published_at = item.published_at;
    for (const [field, output] of [['portrait_asset_id', 'portrait'], ['illustration_asset_id', 'illustration']]) if (item[field]) result[output] = assets.find(asset => asset.id === item[field]);
    if (item.status) result.publicStatus = statuses[item.status.value];
    return result;
  });
  const relations = verified.relations.filter(edge => visibleIds.has(edge.source_id) && visibleIds.has(edge.target_id)).map(edge => {
    const result = { id: edge.id, source: edge.source_id, target: edge.target_id, type: edge.type === 'associated_with_location' ? 'located_in' : edge.type };
    if (edge.description !== undefined) result.description = edge.description;
    return result;
  });
  return { schema_version: 1, entries, assets, relations, maps: (verified.maps || []).filter(map => visibleIds.has(map.owner_id)), capabilities: { body: false, fulltext: false, production_channels: false } };
}
function preparePublicData(root) { return projectPublicData(validatePublication(root)); }
function prepareLocalMapPreviewData(root) {
  return privateOperation(() => {
    const records = scanRepository(root);
    const entries = readRegistry(root, 'public-entries.json', 'entries');
    const candidates = entries.filter(entry => Object.hasOwn(entry, 'legacy_map') || /campaign-map/.test(records.find(item => item.key === entry.source_key)?.parsed?.content || ''));
    return candidates.map(entry => {
      const record = records.find(item => item.key === entry.source_key);
      if (!record || record.kind !== 'entry' || !record.parsed) throw new PublicationError([{ code: 'MAP_SOURCE_UNAPPROVED', ref: entry.source_key }]);
      const parsed = extractLegacyMap(record.parsed.content);
      if (!parsed) throw new PublicationError([{ code: 'MAP_SOURCE_UNAPPROVED', ref: entry.source_key }]);
      const images = records.filter(item => item.kind === 'asset' && item.url === parsed.image);
      if (images.length !== 1) throw new PublicationError([{ code: 'MAP_IMAGE_UNAPPROVED', ref: entry.source_key }]);
      const verified = validatePublicationInputs(root, null, { sourceKeys: [record.key, images[0].key] });
      const projected = projectPublicData(verified);
      const publicEntry = projected.entries.find(item => item.id === entry.id);
      const map = projected.maps.find(item => item.owner_id === entry.id);
      if (!publicEntry || !map) throw new PublicationError([{ code: 'MAP_PREVIEW_PROJECTION_FAILED', ref: entry.source_key }]);
      return { entry: publicEntry, map, unresolved_links: map.markers.filter(marker => !marker.url).length, link_policy: entry.legacy_map.link_policy };
    });
  });
}
function assertProductionBuildAllowed() {
  // Intentionally not switchable by an environment flag or empty approvals.
  // The legacy generator has not been adapted/audited per output channel yet.
  throw new PublicationError([{ code: 'PRODUCTION_CHANNELS_NOT_CERTIFIED', ref: 'legacy-build' }]);
}
module.exports = { sha, opaqueKey, scanRepository, redactedInventory, validatePublication, validateLocalApprovedData, preparePublicData, prepareLocalMapPreviewData, assertProductionBuildAllowed, PublicationError };
