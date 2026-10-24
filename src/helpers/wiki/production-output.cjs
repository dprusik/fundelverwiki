const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parse } = require('node-html-parser');

function fail(code) { throw Object.assign(new Error(code), { code }); }
const escapeXml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
function sameOriginUrl(value, origin) {
  try {
    const parsed = new URL(value);
    if (parsed.origin !== origin || parsed.username || parsed.password || parsed.search || parsed.hash) fail('OUTPUT_EXTERNAL_CANONICAL_URL');
    return parsed;
  } catch (error) {
    if (error.code) throw error;
    fail('OUTPUT_EXTERNAL_CANONICAL_URL');
  }
}
function localAssetReference(value, file, actual) {
  if (value.startsWith('//')) fail('OUTPUT_EXTERNAL_ASSET_REFERENCE');
  if (value.startsWith('#')) return;
  if (!value.startsWith('/')) fail('OUTPUT_EXTERNAL_ASSET_REFERENCE');
  let route;
  try { route = decodeURIComponent(value.split(/[?#]/, 1)[0]); } catch { fail('OUTPUT_BROKEN_LOCAL_REFERENCE'); }
  const target = /\.[a-z0-9]{1,8}$/i.test(route) ? route.slice(1) : routeFile(route);
  if (!actual.includes(target)) throw Error(`OUTPUT_BROKEN_LOCAL_REFERENCE:${file}:${value}`);
}
function validateCss(css, file, actual) {
  if (/@import\b/i.test(css)) fail('OUTPUT_EXTERNAL_ASSET_REFERENCE');
  for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    const reference = match[2].trim();
    if (/^data:image\/svg\+xml,/i.test(reference) || reference.startsWith('#')) continue;
    localAssetReference(reference, file, actual);
  }
}
function routeFile(url) {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//') || /[?#\\<>"'\s\x00-\x1f{}%]/.test(url) || url.split('/').some(part => part === '.' || part === '..')) fail('INVALID_PUBLIC_ROUTE');
  if (url === '/') return 'index.html';
  if (/\.html$/i.test(url)) return url.slice(1);
  return `${url.slice(1).replace(/\/$/, '')}/index.html`;
}
function assetFile(url) {
  if (typeof url !== 'string' || !url.startsWith('/img/') || url.startsWith('//') || /[?#\\<>"'\s\x00-\x1f{}]/.test(url)) fail('INVALID_PUBLIC_ASSET_URL');
  let decoded;
  try { decoded = decodeURIComponent(url.slice(1)); } catch { fail('INVALID_PUBLIC_ASSET_URL'); }
  if (decoded.split('/').some(part => !part || part === '.' || part === '..')) fail('INVALID_PUBLIC_ASSET_URL');
  return decoded;
}
function expectedOutputFiles(model) {
  const routes = [
    '/', '/approved/', '/organizations/', '/404.html',
    ...model.sections.map(section => `/catalog/${section.id}/`),
    ...model.catalog.map(entry => entry.url),
    ...model.maps.map(map => map.atlasUrl)
  ];
  const files = new Set([...routes.map(routeFile), 'approved-search.json', 'graph.json', 'sitemap.xml', 'feed.xml', 'robots.txt',
    'assets/wiki.css', 'assets/wiki.js', 'assets/search.mjs']);
  if (model.maps.length) files.add('assets/map-viewer.js');
  for (const asset of model.assets) files.add(assetFile(asset.url));
  return files;
}
function listOutputFiles(root, relative = '') {
  const base = path.join(root, relative);
  const result = [];
  for (const item of fs.readdirSync(base, { withFileTypes: true })) {
    const rel = path.posix.join(relative.replaceAll('\\', '/'), item.name);
    const full = path.join(root, rel);
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) fail('OUTPUT_SYMLINK_FORBIDDEN');
    if (stat.isDirectory()) result.push(...listOutputFiles(root, rel));
    else if (stat.isFile()) result.push(rel);
    else fail('OUTPUT_SPECIAL_FILE_FORBIDDEN');
  }
  return result;
}
function validateOutputDirectory(root, model, options = {}) {
  const mode = options.mode || 'preview';
  if (!['preview', 'production'].includes(mode)) fail('OUTPUT_MODE_INVALID');
  const resolved = path.resolve(root);
  if (!fs.existsSync(resolved) || fs.lstatSync(resolved).isSymbolicLink() || !fs.statSync(resolved).isDirectory()) fail('OUTPUT_DIRECTORY_UNSAFE');
  const expected = expectedOutputFiles(model), actual = listOutputFiles(resolved).sort();
  const unexpected = actual.filter(file => !expected.has(file));
  const missing = [...expected].filter(file => !actual.includes(file));
  if (unexpected.length || missing.length) fail('OUTPUT_FILESET_MISMATCH');

  const search = JSON.parse(fs.readFileSync(path.join(resolved, 'approved-search.json'), 'utf8'));
  const ids = model.catalog.map(entry => entry.id).sort();
  if (search.schema_version !== 1 || search.demonstration !== false || !Array.isArray(search.entries) || JSON.stringify(search.entries.map(entry => entry.id).sort()) !== JSON.stringify(ids) || (model.search && JSON.stringify(search) !== JSON.stringify(model.search))) fail('OUTPUT_SEARCH_MISMATCH');
  for (const entry of search.entries) {
    const approved = model.catalog.find(item => item.id === entry.id);
    if (!approved || entry.url !== approved.url || entry.title !== approved.title || Object.keys(entry).some(key => !['id', 'url', 'title', 'category', 'aliases', 'body', 'summary'].includes(key))) fail('OUTPUT_SEARCH_MISMATCH');
  }

  const graph = JSON.parse(fs.readFileSync(path.join(resolved, 'graph.json'), 'utf8'));
  const nodeIds = model.catalog.map(entry => entry.id).sort();
  const edges = model.relations.map(({ id, source_id, target_id, type, description }) => ({ id, source: source_id, target: target_id, type: type === 'associated_with_location' ? 'located_in' : type, ...(description ? { description } : {}) }));
  if (graph.schema_version !== 1 || !Array.isArray(graph.nodes) || JSON.stringify(graph.nodes.map(node => node.id).sort()) !== JSON.stringify(nodeIds) || JSON.stringify(graph.edges) !== JSON.stringify(edges) || (model.graph && JSON.stringify(graph) !== JSON.stringify(model.graph))) fail('OUTPUT_GRAPH_MISMATCH');
  if (graph.nodes.some(node => Object.keys(node).some(key => !['id', 'url', 'title', 'category', 'kind'].includes(key)) || !model.catalog.some(entry => entry.id === node.id && entry.url === node.url && entry.title === node.title))) fail('OUTPUT_GRAPH_MISMATCH');

  const origin = model.siteOrigin;
  if (!origin || new URL(origin).origin !== origin) fail('OUTPUT_SITE_ORIGIN_MISSING');
  const sitemap = fs.readFileSync(path.join(resolved, 'sitemap.xml'), 'utf8');
  const sitemapRoutes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => sameOriginUrl(match[1], origin).pathname);
  const publicRoutes = [...new Set(['/','/approved/','/organizations/',...model.sections.map(item => `/catalog/${item.id}/`),...model.catalog.map(item => item.url),...model.maps.map(item => item.atlasUrl)])].sort();
  const expectedSitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicRoutes.map(route => `<url><loc>${escapeXml(new URL(route, origin).href)}</loc></url>`).join('')}</urlset>\n`;
  if (JSON.stringify(sitemapRoutes.sort()) !== JSON.stringify(publicRoutes) || sitemap !== expectedSitemap) fail('OUTPUT_SITEMAP_MISMATCH');

  const feed = fs.readFileSync(path.join(resolved, 'feed.xml'), 'utf8');
  const feedItems = model.catalog.filter(entry => entry.published_at).map(entry => {
    const url = new URL(entry.url, origin).href;
    const date = new Date(entry.published_at);
    if (!Number.isFinite(date.getTime())) fail('OUTPUT_FEED_MISMATCH');
    return `<item><title>${escapeXml(entry.title)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><pubDate>${date.toUTCString()}</pubDate>${entry.summary ? `<description>${escapeXml(entry.summary)}</description>` : ''}</item>`;
  }).join('');
  const expectedFeed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Wiki kampanii</title><link>${escapeXml(origin)}</link><description>Jawnie zatwierdzone publikacje kampanii</description>${feedItems}</channel></rss>\n`;
  if (feed !== expectedFeed) fail('OUTPUT_FEED_MISMATCH');
  const robots = fs.readFileSync(path.join(resolved, 'robots.txt'), 'utf8');
  const expectedRobots = mode === 'preview' ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`;
  if (robots !== expectedRobots) fail(mode === 'preview' ? 'PREVIEW_ROBOTS_MISSING' : 'PRODUCTION_ROBOTS_INVALID');
  for (const asset of model.assets) {
    const target = path.join(resolved, assetFile(asset.url));
    if (crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex') !== asset.sha256) fail('OUTPUT_APPROVED_ASSET_HASH_MISMATCH');
  }
  for (const [file, expectedHash] of Object.entries(model.runtimeHashes || {})) {
    if (!expected.has(file) || crypto.createHash('sha256').update(fs.readFileSync(path.join(resolved, file))).digest('hex') !== expectedHash) fail('OUTPUT_RUNTIME_HASH_MISMATCH');
  }
  for (const file of actual.filter(item => item.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(resolved, file), 'utf8');
    const document = parse(html);
    const robotsMeta = document.querySelector('meta[name="robots"]');
    if (mode === 'preview' && robotsMeta?.getAttribute('content') !== 'noindex,nofollow') fail('PREVIEW_ROBOTS_MISSING');
    if (mode === 'production' && robotsMeta) fail('PRODUCTION_ROBOTS_INVALID');
    if (mode === 'production') {
      const route = file === 'index.html' ? '/' : file === '404.html' ? '/404.html' : file.endsWith('/index.html') ? `/${file.slice(0, -'index.html'.length)}` : `/${file}`;
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
      if (canonical !== new URL(route, origin).href) throw Error(`PRODUCTION_CANONICAL_MISMATCH:${file}`);
    }
    const forbiddenElements = new Set(['IFRAME', 'OBJECT', 'EMBED', 'BASE', 'FOREIGNOBJECT']);
    for (const node of document.querySelectorAll('*')) {
      if (forbiddenElements.has(node.tagName.toUpperCase())) fail('OUTPUT_ACTIVE_HTML_FORBIDDEN');
      if (node.tagName.toLowerCase() === 'meta' && node.getAttribute('http-equiv')?.toLowerCase() === 'refresh') fail('OUTPUT_ACTIVE_HTML_FORBIDDEN');
      if (node.hasAttribute('ping')) fail('OUTPUT_ACTIVE_HTML_FORBIDDEN');
      if (node.tagName.toLowerCase() === 'script' && !node.getAttribute('src')) {
        if (node.getAttribute('type') !== 'application/json' || node.getAttribute('id') !== 'map-data') fail('OUTPUT_ACTIVE_HTML_FORBIDDEN');
        let payload;
        try { payload = JSON.parse(node.textContent); } catch { fail('OUTPUT_MAP_DATA_MISMATCH'); }
        const map = model.maps.find(item => routeFile(item.atlasUrl) === file);
        if (!map || JSON.stringify(payload) !== JSON.stringify(map.viewerData)) fail('OUTPUT_MAP_DATA_MISMATCH');
      }
      for (const [attribute, rawValue] of Object.entries(node.attributes)) {
        const name = attribute.toLowerCase(), value = rawValue.trim();
        if (name.startsWith('on') || name === 'style' || name === 'srcdoc') fail('OUTPUT_ACTIVE_HTML_FORBIDDEN');
        const isAnchor = node.tagName.toLowerCase() === 'a' && name === 'href';
        const isCanonical = node.tagName.toLowerCase() === 'link' && name === 'href' && node.getAttribute('rel')?.toLowerCase() === 'canonical';
        const resource = ['src', 'poster', 'data', 'action', 'formaction', 'xlink:href'].includes(name) || name === 'href' && !isAnchor && !isCanonical;
        if (resource) localAssetReference(value, file, actual);
        if (isAnchor && value.startsWith('/')) localAssetReference(value, file, actual);
        if (isAnchor && value && !value.startsWith('/') && !value.startsWith('#')) {
          let link;
          try { link = new URL(value); } catch { fail('OUTPUT_EXTERNAL_LINK_INVALID'); }
          if (link.protocol !== 'https:' || link.username || link.password) fail('OUTPUT_EXTERNAL_LINK_INVALID');
        }
      }
      if (node.tagName.toLowerCase() === 'style') validateCss(node.textContent, file, actual);
      for (const candidate of (node.getAttribute('srcset') || '').split(',')) {
        const src = candidate.trim().split(/\s+/, 1)[0];
        if (src) localAssetReference(src, file, actual);
      }
    }
  }
  for (const file of actual.filter(item => item.endsWith('.css'))) {
    const css = fs.readFileSync(path.join(resolved, file), 'utf8');
    validateCss(css, file, actual);
  }
  return { files: actual.length, routes: publicRoutes.length, searchEntries: search.entries.length, graphNodes: graph.nodes.length, feedEntries: feedItems.length };
}
module.exports = { routeFile, assetFile, expectedOutputFiles, listOutputFiles, validateOutputDirectory };
