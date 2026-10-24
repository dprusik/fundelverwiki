const { createImporter, ImportError } = require('../src/helpers/wiki/import.cjs');
const { PublicationError } = require('../src/helpers/wiki/publication.cjs');
const { lineDiff } = require('../src/helpers/wiki/review.cjs');

function printPlan(plan) {
  console.log('TYLKO LOKALNIE: diff może zawierać zatwierdzane metadane. Nie kopiuj go do publicznych raportów.');
  for (const change of plan.changes) {
    console.log(`\n${change.source} (${change.key}): ${change.scope} → ${change.decision}`);
    console.log(`Poprzednia decyzja: ${JSON.stringify(change.previous_decision)}`);
    for (const line of lineDiff(JSON.stringify(change.before, null, 2), JSON.stringify(change.after, null, 2)).lines) {
      console.log(({ same: ' ', add: '+', remove: '-' })[line.op] + line.text);
    }
  }
  console.log('\nZależności (hash przy przeglądzie / obecny):');
  console.log(JSON.stringify(plan.dependencies, null, 2));
  console.log(`Zmiany: ${plan.changes.length}; pozostałe niedopuszczone wejścia: ${plan.remaining.length}. Produkcyjny build nadal zablokowany.`);
  console.log(`CONFIRM: ${plan.token}`);
}
try {
  const importer = createImporter(process.cwd());
  const [command, filename] = process.argv.slice(2);
  const position = process.argv.indexOf('--confirm');
  const confirmation = position < 0 ? null : process.argv[position + 1];
  if (command === 'status') {
    const status = importer.status();
    if (process.argv.includes('--json')) console.log(JSON.stringify(status, null, 2));
    else {
      const counts = status.records.reduce((result, row) => { result[row.state] = (result[row.state] || 0) + 1; return result; }, {});
      console.log(JSON.stringify({ states: counts, registry_import_incomplete: status.registry_import_incomplete, production_channels: false, validation_issue_count: status.validation_issues.length }));
      for (const row of status.records.filter(row => !process.argv.includes('--needs-review') || row.state !== 'approved' || row.dependency_attention.length || row.unresolved_count)) console.log(`${row.key} ${row.state}; zależności do przeglądu: ${row.dependency_attention.length}; nierozwiązane: ${row.unresolved_count}`);
    }
  }
  else if (command === 'preview' || command === 'apply') {
    if (!filename) throw new ImportError('PROPOSAL_PATH_REQUIRED');
    printPlan(importer.preview(filename));
    if (command === 'apply') console.log(JSON.stringify(importer.apply(filename, confirmation)));
  } else if (command === 'recover') {
    const plan = importer.recoveryPreview();
    console.log('TYLKO LOKALNIE: przywrócenie rejestrów sprzed przerwanej transakcji: ' + plan.id);
    for (const name of Object.keys(plan.restore)) if (plan.current[name] !== plan.restore[name]) {
      console.log(name);
      for (const line of lineDiff(plan.current[name], plan.restore[name]).lines) console.log(({ same: ' ', add: '+', remove: '-' })[line.op] + line.text);
    }
    console.log('CONFIRM: ' + plan.token);
    if (confirmation) console.log(JSON.stringify(importer.recover(confirmation)));
  } else throw new ImportError('USE_preview_apply_status_OR_recover');
} catch (error) {
  console.error(error instanceof ImportError ? error.code : error instanceof PublicationError ? 'PUBLICATION_BLOCKED' : 'IMPORT_INPUT_ERROR');
  if (error.issues) console.error(JSON.stringify(error.issues));
  process.exitCode = 1;
}
