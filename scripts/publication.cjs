const fs = require('node:fs');
const path = require('node:path');
const { scanRepository, redactedInventory, validatePublication, preparePublicData, assertProductionBuildAllowed, PublicationError } = require('../src/helpers/wiki/publication.cjs');
const root = process.cwd();
const command = process.argv[2];
try {
  if (command === 'inventory') {
    const records = scanRepository(root);
    const inventory = { schema_version: 1, note: 'No DM approval inferred. Local dist is not remote-public evidence.', records: redactedInventory(records) };
    const decisions = JSON.parse(fs.readFileSync('src/wiki/publication-decisions.json', 'utf8')).decisions;
    const approvals = [
      ...JSON.parse(fs.readFileSync('src/wiki/public-entries.json', 'utf8')).entries,
      ...JSON.parse(fs.readFileSync('src/wiki/public-assets.json', 'utf8')).assets,
      ...JSON.parse(fs.readFileSync('src/wiki/public-system.json', 'utf8')).inputs
    ];
    for (const record of inventory.records) {
      const approval = approvals.find(item => item.source_key === record.key && item.approved === true);
      const decision = decisions.find(item => item.key === record.key);
      record.review = decision?.state === 'denied' ? 'denied' : approval ? (approval.sha256 === record.sha256 ? 'approval_recorded' : 'approval_stale') : 'pending';
    }
    fs.mkdirSync('docs/review', { recursive: true });
    fs.writeFileSync('docs/review/publication-inventory.json', JSON.stringify(inventory, null, 2) + '\n');
    const yes = value => value ? 'tak' : 'nie';
    const lines = [
      '# M1A.2 — lista kontrolna zgody DM', '',
      'Wygodny lokalny panel: npm run publication:review → http://127.0.0.1:8082. Instrukcja: ../PUBLICATION_WORKFLOW.md. Ten spis jest zredagowanym uzupełnieniem, bez zgód automatycznych.', '',
      'Inwentaryzacja lokalnego src/site. Obserwacja online jest w osobnym ONLINE_COMPARISON.md. dist jest starym lokalnym artefaktem, nie dowodem zgody na publikację.', '',
      'Nie zapisujemy tytułów, ścieżek, treści ani prywatnych nazw. ID pozwala DM zidentyfikować plik lokalnie:', '',
      '```powershell', 'node scripts/publication.cjs locate <ID-z-tabeli>', '```', '',
      'To polecenie wyświetla wyłącznie ścieżkę na lokalnym terminalu. Nie wklejaj prywatnych nazw/treści do raportów.', '',
      'pending = brak decyzji; denied = jawna odmowa; approval_recorded = wpisana zgoda (nadal wymaga pełnej walidacji); approval_stale = zmiana bajtów po zgodzie. Puste rejestry nie nadają zgody. Pełne hashe w publication-inventory.json.', '',
      '## Notatki — kandydaci', '',
      '| ID do przeglądu | Decyzja | dg-publish | HTML w dist | search | graph | sitemap | feed |',
      '|---|---|---|---|---|---|---|---|'
    ];
    for (const item of inventory.records.filter(item => item.kind === 'entry')) lines.push(`| ${item.key} | ${item.review} | ${item.dg_publish} | ${yes(item.local_dist_html)} | ${yes(item.local_channels.search)} | ${yes(item.local_channels.graph)} | ${yes(item.local_channels.sitemap)} | ${yes(item.local_channels.feed)} |`);
    lines.push('', '## Zasoby — kandydaci', '', '| ID do przeglądu | Decyzja | Format | Bajty | Identyczne bajty w dist |', '|---|---|---|---:|---|');
    for (const item of inventory.records.filter(item => item.kind === 'asset')) lines.push(`| ${item.key} | ${item.review} | ${item.extension} | ${item.bytes} | ${yes(item.local_dist_bytes_match)} |`);
    lines.push('', '## Pliki systemowe wejścia — przegląd techniczny', '', '| ID do przeglądu | Decyzja | Format |', '|---|---|---|');
    for (const item of inventory.records.filter(item => item.kind === 'system')) lines.push(`| ${item.key} | ${item.review} | ${item.extension} |`);
    lines.push('', `Stan decyzji: ${JSON.stringify(inventory.records.reduce((counts, item) => { counts[item.review] = (counts[item.review] || 0) + 1; return counts; }, {}))}. Zapisana zgoda nie odblokowuje produkcyjnych kanałów; wymagany jest pełny walidator i osobna przyszła integracja.`, '');
    fs.writeFileSync('docs/review/DM_REVIEW.md', lines.join('\n'));
    for (const kind of ['entry', 'asset', 'system']) console.log(`${kind}: ${records.filter(record => record.kind === kind).length}`);
    for (const flag of ['true', 'false', 'missing', 'invalid', 'parse_error']) console.log(`dg-publish ${flag}: ${records.filter(record => record.flag === flag).length}`);
    console.log(`local dist HTML matches: ${records.filter(record => record.localHtml).length}; remote status: unverified`);
    console.log(`local dist assets: ${records.filter(record => record.localAsset).length}; identical bytes: ${records.filter(record => record.localAssetMatches).length}`);
  } else if (command === 'locate') {
    // DM-operated local helper: prints a path only on explicit request, never body/title.
    const record = scanRepository(root).find(record => record.key === process.argv[3]);
    if (!record) throw new PublicationError([{ code: 'UNKNOWN_REVIEW_ID', ref: 'review' }]);
    console.log(record.source);
  } else if (command === 'validate') {
    const verified = validatePublication(root);
    console.log(`INPUTS_APPROVED: ${verified.entries.length} entries, ${verified.assets.length} assets. Production channels remain disabled.`);
  } else if (command === 'data') {
    const data = preparePublicData(root);
    fs.mkdirSync('.publication-prepared', { recursive: true });
    const target = path.join('.publication-prepared', `${require('node:crypto').randomUUID()}.json`);
    fs.writeFileSync(target, JSON.stringify(data, null, 2), { flag: 'wx' });
    console.log('PUBLIC_METADATA_PREPARED (no body/fulltext; local non-served .publication-prepared directory)');
  } else if (command === 'legacy') assertProductionBuildAllowed();
  else throw new PublicationError([{ code: 'INVALID_COMMAND', ref: 'command' }]);
} catch (error) {
  if (error instanceof PublicationError) {
    console.error('PUBLICATION_BLOCKED');
    const counts = {};
    for (const issue of error.issues) counts[issue.code] = (counts[issue.code] || 0) + 1;
    console.error(JSON.stringify(counts));
  } else console.error('PUBLICATION_BLOCKED: INPUT_READ_ERROR');
  process.exitCode = 1;
}
