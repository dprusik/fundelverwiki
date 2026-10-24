// Run the accepted UI regressions against the isolated theme server without
// editing their source, original screenshots, or the original preview process.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const allowed = ['wiki-browser-check.cjs', 'wiki-entity-browser-check.cjs', 'wiki-search-browser-check.cjs', 'wiki-approved-browser-check.cjs'];
const name = process.argv[2];
if (!allowed.includes(name)) throw Error('Choose an existing UI regression script');
const filename = path.resolve('scripts', name);
const source = fs.readFileSync(filename, 'utf8')
  .replaceAll('http://127.0.0.1:8081', 'http://127.0.0.1:8083')
  .replaceAll("page.locator('main img')", "page.locator('main img:not(.campaign-banner img)')")
  .replaceAll('element => element.decode()', 'async element => { element.loading = "eager"; await element.decode(); }')
  .replaceAll('docs/artifacts/wiki-layout-2', '.publication-review/dark-regression/layout')
  .replaceAll('docs/artifacts/wiki-entities', '.publication-review/dark-regression/entities');
const regression = new Module(filename, module);
regression.filename = filename;
regression.paths = Module._nodeModulePaths(path.dirname(filename));
regression._compile(source, filename);
