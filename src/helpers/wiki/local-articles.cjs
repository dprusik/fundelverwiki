const fs = require('node:fs');
const path = require('node:path');
const MarkdownIt = require('markdown-it');
const { validateLocalApprovedData, PublicationError, sha } = require('./publication.cjs');
const { extractLegacyMap } = require('./legacy-map.cjs');
const fail = code => { throw new PublicationError([{ code, ref: 'local-preview' }]); };
const raster = /\.(png|jpe?g|gif|webp)$/i;
function rasterBytes(bytes, extension) {
  if (/\.png$/i.test(extension)) return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (/\.jpe?g$/i.test(extension)) return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (/\.gif$/i.test(extension)) return /^GIF8[79]a/.test(bytes.subarray(0, 6).toString());
  return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
}
function renderApprovedMarkdown(markdown, entries, assets, records) {
  if (/<\/?[a-z!]|\{[{%]|%%|```\s*(base|dataview|dataviewjs)/i.test(markdown)) fail('ACTIVE_CONTENT_CHANNEL_NOT_SUPPORTED');
  const md = new MarkdownIt({ html: false, linkify: false });
  // Parse Obsidian syntax as inline tokens, never inside code or raw templates.
  const visible = new Map(entries.map(entry => [entry.source_key, entry]));
  const assetKeys = new Map(assets.map(asset => [asset.source_key, asset]));
  md.inline.ruler.before('link', 'approved_wikilink', (state, silent) => {
    const rest = state.src.slice(state.pos), match = rest.match(/^(!?)\[\[([^\]\r\n]+)\]\]/);
    if (!match) return false;
    if (silent) { state.pos += match[0].length; return true; }
    const parts = match[2].replace(/\\\|/g, '|').split('|');
    if (parts.length > 2 || /[#{}]/.test(parts[0])) fail('UNSUPPORTED_WIKILINK');
    const target = parts[0].trim();
    const candidates = records.filter(record => match[1]
      ? record.kind === 'asset' && (record.source.slice('src/site/'.length) === target || path.basename(record.source) === target)
      : record.kind === 'entry' && (record.source.slice('src/site/notes/'.length).replace(/\.md$/, '') === target || path.basename(record.source, '.md') === target));
    if (candidates.length !== 1) fail('UNAPPROVED_WIKILINK');
    const approved = (match[1] ? assetKeys : visible).get(candidates[0].key);
    if (!approved) fail('UNAPPROVED_WIKILINK');
    const label = parts[1] || (match[1] ? approved.alt : approved.title);
    if (match[1]) {
      if (!raster.test(approved.url)) fail('UNSUPPORTED_PREVIEW_ASSET');
      const token = state.push('image', 'img', 0); token.attrs = [['src', approved.url], ['alt', approved.alt]]; token.content = approved.alt;
      const child = new state.Token('text', '', 0); child.content = approved.alt; token.children = [child];
    } else {
      const open = state.push('link_open', 'a', 1); open.attrs = [['href', approved.permalink]];
      const token = state.push('text', '', 0); token.content = label;
      state.push('link_close', 'a', -1);
    }
    state.pos += match[0].length; return true;
  });
  // Disable MarkdownIt's URL suppression so rejected javascript links are inspected and blocked.
  md.validateLink = () => true;
  const tokens = md.parse(markdown, {}), links = new Set(entries.map(entry => entry.permalink)), images = new Set(assets.filter(asset => raster.test(asset.url)).map(asset => asset.url));
  const inspect = token => {
    if (token.type === 'heading_open' || token.type === 'heading_close') token.tag = 'h' + Math.min(6, Number(token.tag.slice(1)) + 1);
    if (token.type === 'html_inline' || token.type === 'html_block') fail('ACTIVE_CONTENT_CHANNEL_NOT_SUPPORTED');
    if (token.type === 'link_open') {
      const href = token.attrGet('href');
      if (!links.has(href)) fail('UNAPPROVED_LINK_OR_ASSET');
    }
    if (token.type === 'image' && !images.has(token.attrGet('src'))) fail('UNAPPROVED_LINK_OR_ASSET');
    if (token.type === 'text' && /!?\[\[|\]\]/.test(token.content)) fail('UNSUPPORTED_WIKILINK');
    if (token.type === 'text' && /!?\[[^\]\n]+\](?:\[[^\]\n]*\]|\()/.test(token.content)) fail('UNRESOLVED_MARKDOWN_LINK');
    for (const child of token.children || []) inspect(child);
  };
  tokens.forEach(inspect);
  return md.renderer.render(tokens, md.options, {});
}
function prepareLocalArticles(root, reservedUrls = []) {
  const verified = validateLocalApprovedData(root), byKey = new Map(verified.records.map(record => [record.key, record]));
  const visible = verified.entries.filter(entry => !byKey.get(entry.source_key).parsed.data.hide);
  const used = new Set(reservedUrls.map(url => url.toLowerCase())), articles = [], maps = [];
  for (const entry of visible) {
    const url = entry.permalink;
    if (!url.endsWith('/') || used.has(url.toLowerCase()) || /^\/(assets|catalog|entities|demo)(\/|$)/i.test(url)) fail('PREVIEW_ROUTE_COLLISION');
    used.add(url.toLowerCase());
    const parsedMap = extractLegacyMap(byKey.get(entry.source_key).parsed.content);
    const html = renderApprovedMarkdown(parsedMap ? parsedMap.markdown : byKey.get(entry.source_key).parsed.content, visible, verified.assets, verified.records);
    const result = { id: entry.id, url, title: entry.title, category: entry.category, kind: entry.kind, html, aliases: (entry.aliases || []).slice() };
    if (entry.summary) result.summary = entry.summary;
    for (const [field, output] of [['portrait_asset_id', 'portrait'], ['illustration_asset_id', 'illustration']]) {
      if (!entry[field]) continue;
      const asset = verified.assets.find(asset => asset.id === entry[field]);
      if (!asset) fail('UNAPPROVED_IMAGE_REFERENCE');
      result[output] = { id: asset.id, src: asset.url, alt: asset.alt };
    }
    if (entry.status) result.publicStatus = ({ alive: 'Żyje', dead: 'Nie żyje', missing: 'Zaginiony', unknown: 'Nieznany' })[entry.status.value];
    if (parsedMap) {
      const map = verified.maps.find(map => map.owner_id === entry.id);
      if (map.markers.some(marker => marker.url && !visible.some(target => target.permalink === marker.url))) fail('UNAPPROVED_LINK_OR_ASSET');
      maps.push({ entry: result, map, html, unresolved_links: map.markers.filter(marker => !marker.url).length, link_policy: entry.legacy_map?.link_policy });
    } else articles.push(result);
  }
  // Read exactly approved raster bytes; never let Eleventy re-read the vault during passthrough.
  const files = verified.assets.map(asset => {
    const record = byKey.get(asset.source_key);
    if (!raster.test(record.extension)) fail('UNSUPPORTED_PREVIEW_ASSET');
    let bytes;
    try { bytes = fs.readFileSync(path.join(root, record.source)); }
    catch { fail('INPUT_READ_OR_SCHEMA_ERROR'); }
    if (sha(bytes) !== asset.sha256) fail('SOURCE_CHANGED');
    if (!rasterBytes(bytes, record.extension)) fail('UNSUPPORTED_PREVIEW_ASSET');
    return { url: asset.url, bytes };
  });
  return { articles, maps, catalog: [...articles, ...maps.map(item => item.entry)], files };
}
function resetPreviewOutput(root) {
  const output = path.resolve(root, '.wiki-preview');
  if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) fail('UNSAFE_PREVIEW_OUTPUT');
  fs.rmSync(output, { recursive: true, force: true });
  return output;
}
module.exports = { prepareLocalArticles, renderApprovedMarkdown, resetPreviewOutput };
