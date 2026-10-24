const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { scanRepository, sha, validatePublication, PublicationError } = require('./publication.cjs');
const { createReview, dependencies } = require('./review.cjs');
const { collections, readRegistries } = require('./registry-store.cjs');

class ImportError extends Error { constructor(code) { super(code); this.code = code; } }
const fail = code => { throw new ImportError(code); };
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const specs = { entry: ['public-entries.json', 'entries'], asset: ['public-assets.json', 'assets'], system: ['public-system.json', 'inputs'] };
const pendingName = '.publication-import.pending', lockName = '.publication-import.lock';

function createImporter(root, options = {}) {
  root = path.resolve(root);
  const review = createReview(root, options);
  const directory = path.join(review.storePath, 'imports');
  const target = name => path.join(root, 'src/wiki', name);
  function safeDirectory(create = false) {
    for (let current = directory; current !== path.dirname(current); current = path.dirname(current)) {
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail('UNSAFE_IMPORT_STORE');
    }
    if (create) fs.mkdirSync(directory, { recursive: true });
  }
  function receipts() {
    safeDirectory();
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory).filter(name => /^[a-f0-9-]+\.json$/.test(name)).map(name => {
      const filename = path.join(directory, name);
      if (fs.lstatSync(filename).isSymbolicLink()) fail('UNSAFE_IMPORT_STORE');
      const receipt = JSON.parse(fs.readFileSync(filename, 'utf8'));
      if (receipt.repository_id !== sha(root)) fail('INVALID_IMPORT_RECEIPT');
      return receipt;
    }).sort((a, b) => a.at.localeCompare(b.at));
  }
  function revision(data, record) {
    const decision = data['publication-decisions.json'].decisions.find(item => item.key === record.key);
    const [name, key] = specs[record.kind];
    const approval = data[name][key].find(item => item.source_key === record.key);
    return decision || approval ? 'registry-' + sha(JSON.stringify({ decision, approval })) : null;
  }
  function preview(filename) {
    if ([pendingName, lockName].some(name => fs.existsSync(target(name)))) fail('IMPORT_RECOVERY_REQUIRED');
    if (fs.lstatSync(filename).isSymbolicLink() || fs.statSync(filename).size > 4 * 1024 * 1024) fail('INVALID_PROPOSAL_FILE');
    const proposalBytes = fs.readFileSync(filename, 'utf8');
    const proposal = JSON.parse(proposalBytes);
    const current = readRegistries(root);
    const activeKeys = Object.values(specs).flatMap(([name, key]) => current.data[name][key].map(item => item.source_key));
    const decisionKeys = current.data['publication-decisions.json'].decisions.map(item => item.key);
    if (new Set(activeKeys).size !== activeKeys.length || new Set(decisionKeys).size !== decisionKeys.length || decisionKeys.some(key => activeKeys.includes(key))) fail('CONFLICTING_ACTIVE_REGISTRIES');
    if (proposal.schema_version !== 2 || proposal.repository_id !== sha(root)) fail('REEXPORT_PROPOSAL_REQUIRED');
    if (!equal(proposal.registry_hashes, current.hashes)) fail('REGISTRIES_CHANGED_REEXPORT');
    if (!Array.isArray(proposal.proposals) || proposal.proposals.length > 250) fail('INVALID_PROPOSAL');
    const records = scanRepository(root), history = review.events(), archive = receipts();
    const after = structuredClone(current.data), seen = new Set(), changes = [], dependencyDiff = [];
    for (const p of proposal.proposals) {
      if (seen.has(p.source_key)) fail('CONFLICTING_PROPOSAL_DECISIONS');
      seen.add(p.source_key);
      const record = records.find(item => item.key === p.source_key);
      const event = history.filter(item => item.key === p.source_key).at(-1);
      if (!record || p.sha256 !== record.sha256) fail('STALE_SOURCE_HASH');
      if (!event || event.id !== p.event_id || !['approved', 'denied'].includes(p.decision)) fail('STALE_OR_UNKNOWN_DECISION');
      const eventFields = { source_key: event.key, sha256: event.sha256, scope: event.scope, decision: event.decision, reviewed_at: event.at, metadata: event.metadata, event_id: event.id, supersedes: event.supersedes, previous_external_decision: event.previous_external_decision, dependencies: event.dependencies, active_revision: event.active_revision };
      if (!equal(p, eventFields) || !Object.hasOwn(event, 'active_revision') || p.scope !== (record.kind === 'system' ? 'technical' : 'content')) fail('PROPOSAL_EVENT_MISMATCH');
      const [name, key] = specs[record.kind];
      const list = after[name][key], index = list.findIndex(item => item.source_key === record.key);
      const old = index < 0 ? null : list[index];
      const oldDecision = after['publication-decisions.json'].decisions.find(item => item.key === record.key);
      const already = archive.some(receipt => receipt.events.includes(event.id) && fs.existsSync(path.join(directory, receipt.id + '.committed')) && !fs.existsSync(path.join(directory, receipt.id + '.rolled-back')));
      if (already) {
        if (p.decision === 'approved' ? old?.sha256 !== p.sha256 || oldDecision : oldDecision?.state !== 'denied' || old) fail('IMPORTED_DECISION_CONFLICT');
        continue; // Never replay old form fields over later metadata edits.
      }
      if (revision(current.data, record) !== event.active_revision) fail('ACTIVE_DECISION_CONFLICT');
      const retired = archive.slice().reverse().flatMap(receipt => {
        const before = JSON.parse(receipt.before[name]);
        return before[key].filter(item => item.source_key === record.key);
      })[0];
      const retained = old || retired || {};
      if (record.kind !== 'system' && retained.id && retained.id !== p.metadata.id) fail('STABLE_ID_CONFLICT');
      if (record.kind === 'entry' && retained.permalink && retained.permalink !== record.url) fail('CANONICAL_URL_CONFLICT');
      if (p.decision === 'approved') {
        const fields = record.kind === 'entry' ? ['id', 'title', 'category', 'kind', 'permalink', 'legacy_map'] : record.kind === 'asset' ? ['id', 'alt', 'url'] : [];
        if (Object.keys(p.metadata).some(field => !fields.includes(field)) && !equal(p.metadata, retained)) fail('UNSUPPORTED_METADATA_PATCH');
        const updated = { ...retained, ...Object.fromEntries(fields.filter(field => Object.hasOwn(p.metadata, field)).map(field => [field, p.metadata[field]])), source_key: record.key, sha256: p.sha256, approved: true, reviewed_at: p.reviewed_at };
        if (index < 0) list.push(updated); else list[index] = updated;
      } else if (index >= 0) list.splice(index, 1);
      after['publication-decisions.json'].decisions = after['publication-decisions.json'].decisions.filter(item => item.key !== record.key);
      if (p.decision === 'denied') after['publication-decisions.json'].decisions.push({ key: record.key, state: 'denied' });
      changes.push({ key: record.key, source: record.source, scope: p.scope, decision: p.decision, before: old, after: p.decision === 'approved' ? list.find(item => item.source_key === record.key) : null, previous_decision: oldDecision || null });
      const deps = dependencies(record, records);
      dependencyDiff.push({ key: record.key, reviewed: p.dependencies, current: deps.resolved.map(key => ({ key, source: records.find(item => item.key === key).source, sha256: records.find(item => item.key === key).sha256 })), unresolved_count: deps.unresolved.length });
    }
    // Validate the complete merged model. Pending/denied unrelated inputs may remain;
    // all other failures (including stale approvals or dangling relations) stop import.
    let publicationIssues = [];
    try { validatePublication(root, after); } catch (error) {
      if (!(error instanceof PublicationError)) throw error;
      publicationIssues = error.issues;
      if (publicationIssues.some(issue => !['UNAPPROVED_INPUT', 'DENIED_INPUT'].includes(issue.code))) {
        const error = new ImportError('MERGED_REGISTRIES_INVALID'); error.issues = publicationIssues; throw error;
      }
    }
    const approved = new Map(Object.values(specs).flatMap(([name, key]) => after[name][key]).map(item => [item.source_key, item]));
    // Current dependency hashes must have their OWN approval; a changed attachment
    // does not require reapproval of the unchanged parent note.
    for (const record of records.filter(item => approved.has(item.key))) {
      const deps = dependencies(record, records);
      if (deps.unresolved.length || deps.resolved.some(key => approved.get(key)?.sha256 !== records.find(item => item.key === key).sha256)) fail('UNRESOLVED_OR_UNAPPROVED_DEPENDENCY');
    }
    const afterBytes = Object.fromEntries(Object.keys(collections).map(name => [name, equal(current.data[name], after[name]) ? current.bytes[name] : JSON.stringify(after[name], null, 2) + '\n']));
    const token = sha(JSON.stringify({ proposal: sha(proposalBytes), before: current.hashes, after: afterBytes, sources: records.map(item => [item.key, item.sha256]), events: history }));
    return { token, changes, dependencies: dependencyDiff, remaining: publicationIssues, before: current.bytes, after: afterBytes, events: proposal.proposals.map(p => p.event_id), source_digest: sha(JSON.stringify(records.map(item => [item.key, item.sha256]))), history_digest: sha(JSON.stringify(history)), proposal_digest: sha(proposalBytes) };
  }
  function apply(filename, confirmation) {
    const plan = preview(filename);
    if (confirmation !== plan.token) fail('PREVIEW_CONFIRMATION_REQUIRED');
    if (!plan.changes.length) return { applied: 0 };
    safeDirectory(true);
    const id = crypto.randomUUID();
    const lock = fs.openSync(target(lockName), 'wx');
    fs.writeFileSync(lock, JSON.stringify({ id, pid: process.pid }));
    fs.closeSync(lock);
    let started = false;
    try {
      if (!equal(readRegistries(root).bytes, plan.before)) fail('REGISTRIES_CHANGED_REPREVIEW');
      if (sha(JSON.stringify(scanRepository(root).map(item => [item.key, item.sha256]))) !== plan.source_digest || sha(JSON.stringify(review.events())) !== plan.history_digest || sha(fs.readFileSync(filename, 'utf8')) !== plan.proposal_digest) fail('REVIEW_CHANGED_REPREVIEW');
      const receipt = { id, at: new Date().toISOString(), repository_id: sha(root), token: plan.token, events: plan.events, before: plan.before, after: plan.after };
      fs.writeFileSync(path.join(directory, id + '.json'), JSON.stringify(receipt, null, 2), { flag: 'wx', mode: 0o600 });
      fs.writeFileSync(target(pendingName), id, { flag: 'wx' }); started = true;
      for (const name of Object.keys(collections)) {
        if (plan.before[name] === plan.after[name]) continue;
        if (fs.readFileSync(target(name), 'utf8') !== plan.before[name]) fail('CONCURRENT_REGISTRY_CHANGE');
        const temporary = target('.' + name + '.' + id);
        fs.writeFileSync(temporary, plan.after[name], { flag: 'wx' });
        fs.renameSync(temporary, target(name));
      }
      fs.writeFileSync(path.join(directory, id + '.committed'), plan.token, { flag: 'wx' });
      fs.unlinkSync(target(pendingName)); started = false;
      return { applied: plan.changes.length, transaction: id };
    } catch (error) {
      if (started) fs.writeFileSync(target(lockName), JSON.stringify({ id, pid: null }));
      throw error;
    } finally {
      if (!started) fs.unlinkSync(target(lockName));
      // Interrupted writes intentionally leave BOTH markers: validator fails closed.
    }
  }
  function recoveryPreview() {
    let owner = null;
    if (fs.existsSync(target(lockName))) {
      if (fs.lstatSync(target(lockName)).isSymbolicLink()) fail('UNSAFE_REGISTRY_PATH');
      owner = JSON.parse(fs.readFileSync(target(lockName), 'utf8'));
      if (Number.isInteger(owner.pid) && owner.pid > 0) {
        let alive = true;
        try { process.kill(owner.pid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; }
        if (alive) fail('IMPORT_PROCESS_STILL_RUNNING');
      }
    }
    if (fs.existsSync(target(pendingName)) && fs.lstatSync(target(pendingName)).isSymbolicLink()) fail('UNSAFE_REGISTRY_PATH');
    const hasPending = fs.existsSync(target(pendingName));
    const id = hasPending ? fs.readFileSync(target(pendingName), 'utf8') : owner?.id;
    if (!id) fail('NO_PENDING_TRANSACTION');
    if (!/^[a-f0-9-]{36}$/.test(id)) fail('INVALID_PENDING_TRANSACTION');
    const receipt = receipts().find(item => item.id === id);
    const current = readRegistries(root);
    if (!receipt && hasPending) fail('RECOVERY_BACKUP_MISSING');
    if (receipt && Object.keys(collections).some(name => ![receipt.before[name], receipt.after[name]].includes(current.bytes[name]))) fail('RECOVERY_EXTERNAL_CHANGE');
    // No pending marker means no registry writes started, or commit fully finished.
    const restore = hasPending ? receipt.before : current.bytes;
    return { token: sha(JSON.stringify({ id, current: current.hashes, before: restore })), id, restore, current: current.bytes, rollback: hasPending };
  }
  function recover(confirmation) {
    const plan = recoveryPreview();
    if (confirmation !== plan.token) fail('RECOVERY_CONFIRMATION_REQUIRED');
    for (const name of Object.keys(collections)) {
      if (plan.current[name] === plan.restore[name]) continue;
      const temporary = target('.' + name + '.recover-' + crypto.randomUUID());
      fs.writeFileSync(temporary, plan.restore[name], { flag: 'wx' }); fs.renameSync(temporary, target(name));
    }
    if (plan.rollback && !fs.existsSync(path.join(directory, plan.id + '.rolled-back'))) fs.writeFileSync(path.join(directory, plan.id + '.rolled-back'), plan.token, { flag: 'wx' });
    if (fs.existsSync(target(pendingName))) fs.unlinkSync(target(pendingName));
    if (fs.existsSync(target(lockName))) fs.unlinkSync(target(lockName));
    return { recovered: plan.id };
  }
  function status() {
    const current = readRegistries(root), records = scanRepository(root);
    const pending = [pendingName, lockName].some(name => fs.existsSync(target(name)));
    const rows = records.map(record => {
      const [name, key] = specs[record.kind], approval = current.data[name][key].find(item => item.source_key === record.key);
      const decision = current.data['publication-decisions.json'].decisions.find(item => item.key === record.key);
      const state = decision?.state === 'denied' ? 'denied' : approval ? approval.sha256 === record.sha256 ? 'approved' : 'changed' : 'pending';
      const deps = dependencies(record, records);
      return { key: record.key, kind: record.kind, state, dependencies: deps.resolved, unresolved_count: deps.unresolved.length };
    });
    for (const row of rows) row.dependency_attention = row.dependencies.filter(key => rows.find(item => item.key === key)?.state !== 'approved');
    let validation = [];
    try { validatePublication(root); } catch (error) { if (!(error instanceof PublicationError)) throw error; validation = error.issues; }
    return { registry_import_incomplete: pending, production_channels: false, records: rows, validation_issues: validation };
  }
  return { preview, apply, status, recoveryPreview, recover };
}
module.exports = { createImporter, ImportError };
