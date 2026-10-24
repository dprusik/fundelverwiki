const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { parse } = require('node-html-parser');
const { scanRepository, sha } = require('./publication.cjs');
const { readRegistries } = require('./registry-store.cjs');
const { validPolicy } = require('./legacy-map.cjs');

class ReviewError extends Error { constructor(code) { super(code); this.code = code; } }
const deny = code => { throw new ReviewError(code); };
const readJson = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const textExtensions = new Set(['.md', '.canvas', '.njk', '.js', '.json', '.scss', '.css', '.svg', '.txt']);
function reviewStore(root) {
  const base = process.platform === 'win32' && process.env.LOCALAPPDATA ? process.env.LOCALAPPDATA : path.join(os.homedir(), '.local', 'state');
  return path.join(base, 'Lorekeeper', 'publication-review', sha(path.resolve(root)).slice(0, 20));
}

function dependencies(record, records) {
  if (record.kind !== 'entry' || !record.parsed) return { resolved: [], unresolved: [] };
  const content = record.parsed.content;
  const references = [];
  for (const match of content.matchAll(/!?\[\[([^\]|#]+)(?:[^\]]*)\]\]/g)) references.push({ target: match[1].replace(/\\$/, '').trim(), wiki: true });
  for (const match of content.matchAll(/!?\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+[^)]*)?\)/g)) references.push({ target: match[1], wiki: false });
  // This is an aid to local review, NOT a publication sanitizer or relationship engine.
  for (const node of parse(content).querySelectorAll('[src], [href]')) for (const attribute of ['src', 'href']) {
    if (node.getAttribute(attribute)) references.push({ target: node.getAttribute(attribute), wiki: false });
  }
  // Legacy map links are checked by the dedicated map validator, never inferred
  // as public relations. Its background is an explicit asset dependency.
  for (const node of parse(content).querySelectorAll('[data-map-src]')) references.push({ target: node.getAttribute('data-map-src'), wiki: false });
  const keys = new Set(); const unresolved = [];
  for (const reference of references) {
    let target = reference.target.split('#')[0];
    if (!target) continue;
    try { target = decodeURIComponent(target); } catch { unresolved.push(reference.target); continue; }
    let candidates;
    if (reference.wiki) {
      candidates = records.filter(item => {
        const name = item.source.replace(/^src\/site\/(notes\/|img\/user\/)?/, '');
        return name.replace(/\.(md|canvas)$/, '') === target || path.posix.basename(name).replace(/\.(md|canvas)$/, '') === target;
      });
    } else {
      if (/^[a-z]+:/i.test(target) || target.startsWith('//')) { unresolved.push(reference.target); continue; }
      const relative = path.posix.normalize(path.posix.join(path.posix.dirname(record.source), target));
      candidates = records.filter(item => item.url === target || item.source === relative || '/' + item.source.replace(/^src\/site\//, '') === target);
    }
    if (candidates.length === 1) keys.add(candidates[0].key);
    else unresolved.push(reference.target);
  }
  return { resolved: [...keys].sort(), unresolved: [...new Set(unresolved)] };
}

function lineDiff(before, after) {
  const a = before.split('\n'), b = after.split('\n');
  if (a.length * b.length > 600000) return { coarse: true, lines: [...a.map(text => ({ op: 'remove', text })), ...b.map(text => ({ op: 'add', text }))] };
  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const lines = []; let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { lines.push({ op: 'same', text: a[i++] }); j++; }
    else if (j < b.length && (i === a.length || table[i][j + 1] >= table[i + 1][j])) lines.push({ op: 'add', text: b[j++] });
    else lines.push({ op: 'remove', text: a[i++] });
  }
  return { coarse: false, lines };
}

function createReview(root, options = {}) {
  // Default private snapshots live outside the repository/OneDrive, not just gitignored.
  const store = options.store || reviewStore(root);
  function ensureStore() {
    if (fs.existsSync(store) && fs.lstatSync(store).isSymbolicLink()) deny('UNSAFE_REVIEW_STORE');
    for (const name of ['events', 'snapshots', 'exports']) {
      const target = path.join(store, name);
      if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) deny('UNSAFE_REVIEW_STORE');
      fs.mkdirSync(target, { recursive: true });
    }
  }
  function events() {
    const directory = path.join(store, 'events');
    if (!fs.existsSync(directory)) return [];
    if (fs.lstatSync(store).isSymbolicLink() || fs.lstatSync(directory).isSymbolicLink()) deny('UNSAFE_REVIEW_STORE');
    return fs.readdirSync(directory).filter(name => name.endsWith('.json')).map(name => {
      if (fs.lstatSync(path.join(directory, name)).isSymbolicLink()) deny('UNSAFE_REVIEW_STORE');
      return readJson(path.join(directory, name));
    }).sort((a, b) => a.sequence - b.sequence);
  }
  function external(record) {
    const read = (name, key) => readJson(path.join(root, 'src/wiki', name))[key];
    const decision = read('publication-decisions.json', 'decisions').find(item => item.key === record.key);
    const spec = { entry: ['public-entries.json', 'entries'], asset: ['public-assets.json', 'assets'], system: ['public-system.json', 'inputs'] }[record.kind];
    const approval = read(...spec).find(item => item.source_key === record.key);
    if (!decision && !approval) return null;
    return { id: 'registry-' + sha(JSON.stringify({ decision, approval })), sha256: approval?.sha256, decision: decision?.state === 'denied' ? 'denied' : approval?.approved === true ? 'approved' : 'pending', metadata: approval || {}, external: true };
  }
  function state(record, history) {
    const latest = history.filter(event => event.key === record.key).at(-1) || external(record);
    return { latest, revision: latest?.id || null, state: latest ? latest.sha256 && latest.sha256 !== record.sha256 ? 'changed' : latest.decision : 'pending' };
  }
  function list(records = scanRepository(root), history = events()) {
    let online = null;
    const reportDir = path.join(root, 'docs/review');
    if (fs.existsSync(reportDir)) {
      const reports = fs.readdirSync(reportDir).filter(name => /^online-comparison-[a-f0-9-]+\.json$/.test(name)).map(name => readJson(path.join(reportDir, name))).sort((a, b) => a.at.localeCompare(b.at));
      online = reports.at(-1);
    }
    return records.map(record => {
      const current = state(record, history);
      const deps = dependencies(record, records);
      const attention = deps.resolved.filter(key => {
        const dependency = records.find(item => item.key === key);
        return state(dependency, history).state !== 'approved';
      });
      return { key: record.key, kind: record.kind, name: path.posix.basename(record.source), source: record.source, folder: path.posix.dirname(record.source), bytes: record.bytes,
        sha256: record.sha256, flag: record.flag, state: current.state, revision: current.revision, scope: record.kind === 'system' ? 'technical' : 'content',
        dependency_attention: attention, dependency_count: deps.resolved.length, unresolved_count: deps.unresolved.length,
        online: online ? { at: online.at, observation: [...online.notes, ...online.assets].find(item => item.key === record.key) || null } : null };
    });
  }
  function item(key) {
    const records = scanRepository(root), history = events();
    const record = records.find(item => item.key === key);
    if (!record) deny('UNKNOWN_REVIEW_ITEM');
    const current = state(record, history);
    const bytes = fs.readFileSync(path.join(root, record.source));
    if (sha(bytes) !== record.sha256) deny('SOURCE_CHANGED_REFRESH');
    const isText = textExtensions.has(record.extension);
    const truncated = isText && bytes.length > 1024 * 1024;
    const text = isText ? bytes.toString('utf8').slice(0, 1024 * 1024) : null;
    let baseline = null, snapshotAvailable = false;
    if (current.latest?.snapshot) {
      if (!/^[a-f0-9]{64}$/.test(current.latest.snapshot)) deny('INVALID_SNAPSHOT');
      const filename = path.join(store, 'snapshots', current.latest.snapshot);
      if (fs.existsSync(filename) && !fs.lstatSync(filename).isSymbolicLink()) {
        const buffer = fs.readFileSync(filename);
        if (sha(buffer) !== current.latest.snapshot) deny('INVALID_SNAPSHOT');
        snapshotAvailable = true;
        if (isText) baseline = buffer.toString('utf8');
      }
    }
    const deps = dependencies(record, records);
    const previousDeps = current.latest?.dependencies || [];
    const listing = list(records, history);
    return { ...listing.find(item => item.key === key), url: record.url, text, truncated,
      image: ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(record.extension),
      diff: text !== null && baseline !== null ? lineDiff(baseline, text) : null,
      baseline_available: baseline !== null, snapshot_available: snapshotAvailable, previous_sha256: current.latest?.sha256 || null, previous_decision: current.latest?.decision || null,
      dependencies: deps.resolved.map(key => listing.find(item => item.key === key)), unresolved: deps.unresolved,
      dependency_changes: { added: deps.resolved.filter(key => !previousDeps.some(item => item.key === key)), removed: previousDeps.filter(item => !deps.resolved.includes(item.key)).map(item => item.key), changed: deps.resolved.filter(key => previousDeps.some(item => item.key === key && item.sha256 !== records.find(record => record.key === key).sha256)) },
      metadata: current.latest?.metadata || { id: record.key, title: record.parsed?.data.title || path.posix.basename(record.source, record.extension), permalink: record.url, category: '', kind: '', alt: '' },
      history: history.filter(event => event.key === key).map(event => ({ id: event.id, at: event.at, decision: event.decision, sha256: event.sha256, scope: event.scope }))
    };
  }
  function decide(requests) {
    if (!Array.isArray(requests) || !requests.length || requests.length > 250 || new Set(requests.map(item => item.key)).size !== requests.length) deny('INVALID_BATCH');
    const records = scanRepository(root), history = events();
    const prepared = requests.map(request => {
      const record = records.find(item => item.key === request.key);
      if (!record || request.sha256 !== record.sha256) deny('SOURCE_CHANGED_REFRESH');
      const current = state(record, history);
      if (request.expected_revision !== current.revision) deny('DECISION_CHANGED_REFRESH');
      if (current.latest && request.confirm_supersede !== true) deny('EXPLICIT_SUPERSESSION_REQUIRED');
      if (!['approved', 'denied'].includes(request.decision) || request.confirm_review !== true || request.scope !== (record.kind === 'system' ? 'technical' : 'content')) deny('EXPLICIT_SCOPED_REVIEW_REQUIRED');
      const bytes = fs.readFileSync(path.join(root, record.source));
      if (sha(bytes) !== request.sha256 || (textExtensions.has(record.extension) && bytes.length > 1024 * 1024)) deny('SOURCE_CHANGED_OR_TOO_LARGE');
      // A denial must not erase the previously chosen canonical ID/metadata.
      let metadata = current.latest?.metadata || {};
      if (request.decision === 'approved') {
        const m = request.metadata || {};
        if (record.kind === 'entry') {
          if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(m.id || '') || typeof m.title !== 'string' || !m.title.trim() || m.title.length > 160 || /[<>]/.test(m.title) || !['documents', 'characters', 'locations', 'items', 'maps', 'chronicle'].includes(m.category) || !['article', 'character', 'organization', 'faction', 'location', 'item', 'spell', 'session'].includes(m.kind)) deny('PUBLIC_METADATA_REQUIRED');
          if (current.latest?.metadata?.id && current.latest.metadata.id !== m.id) deny('STABLE_ID_MUST_BE_PRESERVED');
          if (current.latest?.metadata?.permalink && current.latest.metadata.permalink !== record.url) deny('CANONICAL_URL_CHANGED_REQUIRES_SEPARATE_PLAN');
          metadata = { id: m.id, title: m.title, category: m.category, kind: m.kind, permalink: record.url };
          const policy = m.legacy_map ?? current.latest?.metadata?.legacy_map;
          if (!validPolicy(policy)) deny('MAP_LINK_POLICY_REVIEW_REQUIRED');
          if (policy) metadata.legacy_map = policy;
        } else if (record.kind === 'asset') {
          if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(m.id || '') || typeof m.alt !== 'string' || !m.alt.trim() || m.alt.length > 500 || /[<>]/.test(m.alt)) deny('PUBLIC_ASSET_METADATA_REQUIRED');
          if (current.latest?.metadata?.id && current.latest.metadata.id !== m.id) deny('STABLE_ID_MUST_BE_PRESERVED');
          metadata = { id: m.id, alt: m.alt, url: encodeURI(record.url) };
        }
      }
      const deps = dependencies(record, records);
      return { record, bytes, current, request, metadata, dependencies: deps.resolved.map(key => ({ key, sha256: records.find(item => item.key === key).sha256 })) };
    });
    ensureStore();
    const saved = [];
    for (const item of prepared) {
      const snapshot = path.join(store, 'snapshots', item.record.sha256);
      if (!fs.existsSync(snapshot)) fs.writeFileSync(snapshot, item.bytes, { flag: 'wx' });
      else if (fs.lstatSync(snapshot).isSymbolicLink() || sha(fs.readFileSync(snapshot)) !== item.record.sha256) deny('INVALID_SNAPSHOT');
      const event = { schema_version: 1, id: crypto.randomUUID(), sequence: history.length + saved.length + 1, key: item.record.key, source: item.record.source, sha256: item.record.sha256,
        snapshot: item.record.sha256, at: new Date().toISOString(), scope: item.request.scope, decision: item.request.decision, supersedes: item.current.revision,
        metadata: item.metadata, dependencies: item.dependencies, active_revision: external(item.record)?.id || null,
        previous_external_decision: item.current.latest?.external ? item.current.latest : null };
      fs.writeFileSync(path.join(store, 'events', event.id + '.json'), JSON.stringify(event, null, 2), { flag: 'wx' }); saved.push(event.id);
    }
    return { saved: saved.length };
  }
  function proposal(sourceKeys) {
    const records = scanRepository(root), history = events();
    const selected = sourceKeys === undefined ? null : new Set(sourceKeys);
    if (selected && (!selected.size || selected.size !== sourceKeys.length || [...selected].some(key => !records.some(record => record.key === key)))) deny('INVALID_EXPORT_SELECTION');
    const proposals = [];
    for (const record of records) {
      if (selected && !selected.has(record.key)) continue;
      const current = state(record, history);
      if (!current.latest || current.latest.external) continue;
      if (current.state === 'changed') continue;
      const event = current.latest;
      proposals.push({ source_key: record.key, sha256: record.sha256, scope: event.scope, decision: event.decision, reviewed_at: event.at, metadata: event.metadata, event_id: event.id, supersedes: event.supersedes, previous_external_decision: event.previous_external_decision, dependencies: event.dependencies, active_revision: event.active_revision });
    }
    if (!proposals.length) deny('NO_CURRENT_DECISIONS_TO_EXPORT');
    if (selected && proposals.length !== selected.size) deny('NO_CURRENT_DECISION_FOR_SELECTION');
    return { schema_version: 2, repository_id: sha(path.resolve(root)), registry_hashes: readRegistries(root).hashes, note: 'Local proposal only. Explicit preview and confirmation required; not publication certification.', proposals };
  }
  function exportProposal(sourceKeys) {
    const data = proposal(sourceKeys);
    ensureStore();
    const id = crypto.randomUUID();
    const filename = path.join(store, 'exports', id + '.json');
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), { flag: 'wx' });
    return { exported: data.proposals.length, local_file: filename.startsWith(root + path.sep) ? path.relative(root, filename) : filename };
  }
  function blob(key, baseline) {
    const record = scanRepository(root).find(item => item.key === key);
    if (!record) deny('UNKNOWN_REVIEW_ITEM');
    if (baseline) {
      if (!/^[a-f0-9]{64}$/.test(baseline) || !events().some(event => event.key === key && event.snapshot === baseline)) deny('UNKNOWN_SNAPSHOT');
      const target = path.join(store, 'snapshots', baseline);
      if (fs.lstatSync(target).isSymbolicLink()) deny('UNSAFE_REVIEW_STORE');
      const bytes = fs.readFileSync(target);
      if (sha(bytes) !== baseline) deny('INVALID_SNAPSHOT');
      return { bytes, extension: record.extension };
    }
    return { bytes: fs.readFileSync(path.join(root, record.source)), extension: record.extension };
  }
  return { list, item, decide, proposal, exportProposal, blob, events, storePath: store };
}
module.exports = { createReview, reviewStore, dependencies, lineDiff, ReviewError };
