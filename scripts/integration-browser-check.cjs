// Runs an existing regression against the candidate's own localhost server.
// Source files and the accepted preview process are not modified.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const allowed = ['wiki-browser-check.cjs', 'wiki-entity-browser-check.cjs', 'wiki-search-browser-check.cjs', 'wiki-approved-browser-check.cjs', 'wiki-portrait-browser-check.cjs', 'wiki-map-locations-browser-check.cjs', 'wiki-map-mobile-browser-check.cjs', 'wiki-sticky-header-browser-check.cjs', 'wiki-catalog-disclosure-browser-check.cjs', 'organization-browser-check.cjs', 'dark-archive-browser-check.cjs'];
const name = process.argv[2], port = Number(process.env.WIKI_INTEGRATION_PORT || 8084);
if (!allowed.includes(name) || !Number.isInteger(port) || port < 1024 || port > 65535) throw Error('INVALID_INTEGRATION_BROWSER_CHECK');
const base = `http://127.0.0.1:${port}`;
process.env.WIKI_PREVIEW_URL = base;
const filename = path.resolve('scripts', name);
const source = fs.readFileSync(filename, 'utf8')
  .replaceAll('http://127.0.0.1:8081', base).replaceAll('http://127.0.0.1:8083', base)
  .replaceAll("page.locator('main img')", "page.locator('main img:not(.campaign-banner img)')")
  .replaceAll('element => element.decode()', 'async element => { element.loading = "eager"; await element.decode(); }')
  .replaceAll('docs/artifacts/', '.integration-checks/artifacts/');
const regression = new Module(filename, module);
regression.filename = filename;
regression.paths = Module._nodeModulePaths(path.dirname(filename));
regression._compile(source, filename);
