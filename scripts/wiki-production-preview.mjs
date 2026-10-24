import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, lstatSync, existsSync, rmSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import * as sass from 'sass';
import localArticles from '../src/helpers/wiki/local-articles.cjs';
import outputGuard from '../src/helpers/wiki/production-output.cjs';
import { organizeApprovedCatalog } from '../src/wiki-ui/catalog.cjs';
import { projectApprovedSearch } from '../src/helpers/wiki/approved-search.cjs';

const require = createRequire(import.meta.url);

const root = process.cwd();
const stagingRoot = resolve(root, '.publication-build');
if (existsSync(stagingRoot) && (!lstatSync(stagingRoot).isDirectory() || lstatSync(stagingRoot).isSymbolicLink())) throw Error('UNSAFE_PUBLICATION_STAGING_ROOT');
mkdirSync(stagingRoot, { recursive: true });
const requestedMode = process.argv[2] || '--preview';
if (!['--preview', '--production'].includes(requestedMode)) throw Error('PUBLICATION_BUILD_MODE_INVALID');
const vercelEnvironment = process.env.VERCEL_ENV;
if (vercelEnvironment && !['preview', 'production'].includes(vercelEnvironment)) throw Error('PUBLICATION_VERCEL_ENV_INVALID');
const vercelPreview = requestedMode === '--production' && vercelEnvironment === 'preview';
const production = requestedMode === '--production' && !vercelPreview;
const fixedOutput = requestedMode === '--production';
const output = fixedOutput ? resolve(stagingRoot, 'production') : mkdtempSync(join(stagingRoot, 'preview-'));
if (fixedOutput && existsSync(output)) {
  const existing = lstatSync(output);
  if (!existing.isDirectory() || existing.isSymbolicLink() || !output.startsWith(stagingRoot + sep)) throw Error('UNSAFE_PUBLICATION_PRODUCTION_OUTPUT');
  rmSync(output, { recursive: true, force: true });
}
if (fixedOutput) mkdirSync(output, { recursive: false });
const mode = lstatSync(output);
if (!mode.isDirectory() || mode.isSymbolicLink() || !output.startsWith(stagingRoot + sep)) throw Error('UNSAFE_PUBLICATION_STAGING_PATH');

const atlasConfig = JSON.parse(readFileSync('src/wiki-ui/atlas-navigation.json', 'utf8'));
const atlasReservations = require('../src/wiki-ui/atlas.cjs').atlasRouteReservations(atlasConfig);
const reserved = ['/', '/approved/', '/organizations/', '/404.html', '/approved-search.json', '/graph.json', '/sitemap.xml', '/feed.xml', '/robots.txt',
  '/catalog/documents/', '/catalog/characters/', '/catalog/locations/', '/catalog/items/', '/catalog/maps/', '/catalog/chronicle/', ...atlasReservations];
const local = localArticles.prepareLocalArticles(root, reserved);
const catalog = organizeApprovedCatalog(local.catalog);
const siteUrl = new URL(process.env.PUBLICATION_SITE_URL || 'https://fundelverwiki.vercel.app');
if (siteUrl.origin !== 'https://fundelverwiki.vercel.app' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash || siteUrl.username || siteUrl.password) throw Error('PUBLICATION_SITE_ORIGIN_NOT_ALLOWLISTED');
const model = {
  sections: catalog.sections,
  catalog: catalog.entries.map(entry => ({ ...entry, ...(local.catalog.find(item => item.id === entry.id)?.published_at ? { published_at: local.catalog.find(item => item.id === entry.id).published_at } : {}) })),
  maps: [],
  assets: local.files.map(file => ({ url: file.url, sha256: createHash('sha256').update(file.bytes).digest('hex') })),
  relations: [],
  siteOrigin: siteUrl.origin
};
const publicIds = new Set(model.catalog.map(entry => entry.id));
model.relations = local.relations.filter(edge => publicIds.has(edge.source_id) && publicIds.has(edge.target_id));
const maps = require('../src/wiki-ui/atlas.cjs').buildAtlasViews(local.maps, atlasConfig, model.catalog.map(entry => entry.url));
model.maps = maps;

mkdirSync(join(output, 'assets'), { recursive: true });
writeFileSync(join(output, 'assets/wiki.css'), sass.compile('src/wiki-ui/wiki.scss', { style: 'compressed' }).css);
model.runtimeHashes = {
  'assets/wiki.css': createHash('sha256').update(readFileSync(join(output, 'assets/wiki.css'))).digest('hex'),
  'assets/wiki.js': createHash('sha256').update(readFileSync('src/wiki-ui/client.js')).digest('hex'),
  'assets/search.mjs': createHash('sha256').update(readFileSync('src/wiki-ui/search.mjs')).digest('hex'),
  ...(maps.length ? { 'assets/map-viewer.js': createHash('sha256').update(readFileSync('tools/publication-review/map.js')).digest('hex') } : {})
};
const env = { ...process.env, WIKI_PUBLICATION_OUTPUT: output, WIKI_PUBLICATION_MODE: production ? 'production' : 'preview' };
delete env.ELEVENTY_ENV;
const result = spawnSync(process.execPath, ['node_modules/@11ty/eleventy/cmd.cjs', '--config=wiki-production.config.cjs', '--quiet'], { cwd: root, env, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

const escapeXml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
const safeJson = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => ({ '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' })[character]);
const write = (name, value) => {
  const target = resolve(output, name);
  if (!target.startsWith(output + sep)) throw Error('UNSAFE_PUBLICATION_OUTPUT_PATH');
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, value, { flag: 'wx' });
};
const search = projectApprovedSearch(local);
const relationEdges = model.relations.map(({ id, source_id, target_id, type, description }) => ({ id, source: source_id, target: target_id, type: type === 'associated_with_location' ? 'located_in' : type, ...(description ? { description } : {}) }));
model.search = search;
model.graph = { schema_version: 1, nodes: model.catalog.map(entry => ({ id: entry.id, url: entry.url, title: entry.title, category: entry.category, kind: entry.kind })), edges: relationEdges };
write('approved-search.json', safeJson(search));
write('graph.json', safeJson(model.graph));

const routes = [...new Set(['/', '/approved/', '/organizations/', ...model.sections.map(section => `/catalog/${section.id}/`), ...model.catalog.map(entry => entry.url), ...maps.map(map => map.atlasUrl)])].sort();
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route => `<url><loc>${escapeXml(new URL(route, siteUrl).href)}</loc></url>`).join('')}</urlset>\n`;
write('sitemap.xml', sitemap);
const feedItems = model.catalog.filter(entry => entry.published_at).map(entry => {
  const url = new URL(entry.url, siteUrl).href;
  const date = new Date(entry.published_at);
  if (!Number.isFinite(date.getTime())) throw Error('INVALID_APPROVED_PUBLICATION_DATE');
  return `<item><title>${escapeXml(entry.title)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><pubDate>${date.toUTCString()}</pubDate>${entry.summary ? `<description>${escapeXml(entry.summary)}</description>` : ''}</item>`;
}).join('');
write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Wiki kampanii</title><link>${escapeXml(siteUrl.origin)}</link><description>Jawnie zatwierdzone publikacje kampanii</description>${feedItems}</channel></rss>\n`);
write('robots.txt', production
  ? `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap.xml', siteUrl).href}\n`
  : 'User-agent: *\nDisallow: /\n');

const report = outputGuard.validateOutputDirectory(output, model, { mode: production ? 'production' : 'preview' });
const manifest = outputGuard.listOutputFiles(output).sort().map(file => ({ path: file, sha256: createHash('sha256').update(readFileSync(join(output, file))).digest('hex') }));
const manifestMode = vercelPreview ? 'vercel-preview' : production ? 'production-candidate' : 'local-non-deployable-preview';
const manifestName = fixedOutput ? `${manifestMode}-${randomUUID()}.manifest.json` : `${output.split(/[\\/]/).at(-1)}.manifest.json`;
writeFileSync(join(stagingRoot, manifestName), JSON.stringify({ mode: manifestMode, generated_at: new Date().toISOString(), summary: report, files: manifest }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ status: 'PASS', mode: vercelPreview ? 'vercel-preview' : production ? 'production-candidate' : 'local-non-deployable-preview', output: output.slice(root.length + 1), approvedAssets: model.assets.length, ...report, legacyProductionGate: 'unchanged', deployable: production }, null, 2));
