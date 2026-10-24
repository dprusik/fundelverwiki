const { parse } = require('node-html-parser');
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
class LegacyMapError extends Error { constructor(code) { super(code); this.code = code; } }
const fail = code => { throw new LegacyMapError(code); };
const types = new Set(['number', 'tavern', 'home', 'safe', 'merchant', 'danger', 'dangerous', 'temple', 'magic', 'castle']);
const text = (value, max, empty = false) => typeof value === 'string' && value.length <= max && (empty || value.trim()) && !/[<>\x00-\x1f]/.test(value);
function localPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[?#\\<>"'\x00-\x1f]/.test(value)) fail('MAP_UNSAFE_URL');
  let decoded; try { decoded = decodeURIComponent(value); } catch { fail('MAP_UNSAFE_URL'); }
  if (decoded.startsWith('//') || /[?#\\<>"'\x00-\x1f]/.test(decoded) || decoded.split('/').some(item => ['.', '..'].includes(item))) fail('MAP_UNSAFE_URL');
  return encodeURI(decoded);
}
function number(value, min, max) {
  if (typeof value !== 'string' || !value.trim() || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) fail('MAP_INVALID_COORDINATES');
  return Number(value);
}
function attributes(node, allowed) {
  // Only explicit quoted attributes; duplicates and parser recovery are not consent.
  const regexp = /\s*([a-z][a-z0-9-]*)\s*=\s*("[^"]*"|'[^']*')/gy;
  let offset = 0; const seen = new Set();
  while (offset < node.rawAttrs.length && node.rawAttrs.slice(offset).trim()) {
    regexp.lastIndex = offset; const match = regexp.exec(node.rawAttrs);
    if (!match || !allowed.includes(match[1]) || seen.has(match[1])) fail('MAP_UNSUPPORTED_ATTRIBUTE');
    seen.add(match[1]); offset = regexp.lastIndex;
  }
  if (Object.keys(node.attributes).some(key => !allowed.includes(key))) fail('MAP_UNSUPPORTED_ATTRIBUTE');
  return node.attributes;
}
function extractLegacyMap(content) {
  if (!/campaign-map/.test(content)) return null;
  if (/<!--[\s\S]*|<!doctype|<\?|\{[{%]|%%|```\s*(?:base|dataview|dataviewjs)/i.test(content)) fail('MAP_UNSUPPORTED_CONTENT');
  const document = parse(content, { comment: true });
  const nodes = document.querySelectorAll('*');
  const containers = nodes.filter(node => node.getAttribute('id') === 'campaign-map' || node.getAttribute('class') === 'campaign-map');
  if (containers.length !== 1 || nodes.some(node => node.rawTagName !== 'div' || node.parentNode !== document) || (content.match(/<div\b/g) || []).length !== nodes.length || (content.match(/<\/div\s*>/g) || []).length !== nodes.length) fail('MAP_UNSUPPORTED_STRUCTURE');
  const container = containers[0];
  const config = attributes(container, ['id', 'class', 'data-map-src', 'data-map-image', 'data-map-width', 'data-map-height', 'data-initial-zoom-offset', 'style']);
  if (container.textContent.trim() || (config.id && config.id !== 'campaign-map') || (config.class && config.class !== 'campaign-map')) fail('MAP_UNSUPPORTED_STRUCTURE');
  const width = number(config['data-map-width'], 1, 1000000), height = number(config['data-map-height'], 1, 1000000);
  const zoom = number(config['data-initial-zoom-offset'] ?? '0', -5, 4);
  const image = localPath(config['data-map-src']);
  if (config['data-map-image'] && decodeURIComponent(image).split('/').at(-1) !== config['data-map-image']) fail('MAP_IMAGE_MISMATCH');
  // Legacy layout CSS is recognized but never copied into the viewer.
  const styles = { width: ['100%', 'min(99vw,1800px)'], 'aspect-ratio': [`${width}/${height}`], 'max-width': ['none'], 'margin-left': ['50%'], transform: ['translatex(-50%)'], border: ['1pxsolid#555'], 'border-radius': ['8px'] };
  for (const declaration of (config.style || '').split(';').filter(item => item.trim())) {
    const [name, ...rest] = declaration.split(':');
    if (!styles[name.trim().toLowerCase()]?.includes(rest.join(':').replace(/\s/g, '').toLowerCase())) fail('MAP_UNSUPPORTED_STYLE');
  }
  const markers = [];
  for (const node of nodes.filter(node => node !== container)) {
    if (node.getAttribute('class') === 'campaign-map-marker') {
      const a = attributes(node, ['class', 'data-name', 'data-x', 'data-y', 'data-url', 'data-type', 'data-description', 'data-color', 'data-number', 'data-icon']);
      if (node.textContent.trim() || !text(a['data-name'], 160) || !text(a['data-description'] || '', 2000, true) || !types.has(a['data-type'] || 'number')) fail('MAP_INVALID_MARKER');
      if (a['data-color'] && !/^#[a-f0-9]{3}(?:[a-f0-9]{3})?$/i.test(a['data-color'])) fail('MAP_INVALID_COLOR');
      if (a['data-icon'] && !text(a['data-icon'], 16)) fail('MAP_INVALID_MARKER');
      if (a['data-number'] && !/^\d{1,4}$/.test(a['data-number'])) fail('MAP_INVALID_MARKER');
      markers.push({ name: a['data-name'], description: a['data-description'] || '', x: number(a['data-x'], 0, width), y: number(a['data-y'], 0, height), type: a['data-type'] || 'number', ...(a['data-url'] ? { target: localPath(a['data-url']) } : {}), ...(a['data-color'] ? { color: a['data-color'] } : {}), ...(a['data-icon'] ? { icon: a['data-icon'] } : {}), ...(a['data-number'] ? { number: a['data-number'] } : {}) });
    } else {
      const a = attributes(node, ['style']);
      const match = node.textContent.trim().match(/^!\[[^\]\r\n]*\]\(([^)\r\n]+)\)$/);
      if (a.style?.replace(/\s/g, '').toLowerCase() !== 'display:none;' && a.style?.replace(/\s/g, '').toLowerCase() !== 'display:none') fail('MAP_UNSUPPORTED_STRUCTURE');
      if (!match || localPath(match[1]) !== image) fail('MAP_UNSUPPORTED_STRUCTURE');
    }
  }
  if (!markers.length || markers.length > 500) fail('MAP_INVALID_MARKER_COUNT');
  let markdown = content;
  for (const node of nodes.slice().sort((a, b) => b.range[0] - a.range[0])) markdown = markdown.slice(0, node.range[0]) + markdown.slice(node.range[1]);
  if (/<\/?[a-z!]/i.test(markdown)) fail('MAP_UNSUPPORTED_CONTENT');
  return { width, height, zoom, image, markers, markdown };
}
function validPolicy(policy) {
  return policy === undefined || policy && policy.approved === true && ['require_approved', 'omit_unresolved'].includes(policy.link_policy) && Object.keys(policy).every(key => ['approved', 'link_policy'].includes(key));
}
function projectLegacyMap(parsed, record, entry, records, entries, assets, reviewOnly = false) {
  const byKey = new Map(records.map(item => [item.key, item]));
  const current = item => item?.approved === true && byKey.get(item.source_key)?.sha256 === item.sha256;
  if (!current(entry) || entry.source_key !== record.key || record.flag !== 'true' || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(entry.id || '')) fail('MAP_SOURCE_UNAPPROVED');
  if (!validPolicy(entry.legacy_map)) fail('MAP_LINK_POLICY_REVIEW_REQUIRED');
  const images = assets.filter(item => item.url === parsed.image);
  const image = images[0];
  if (images.length !== 1 || !current(image) || !text(image.alt, 500) || !/\.(png|jpe?g|webp)$/i.test(image.url)) fail('MAP_IMAGE_UNAPPROVED');
  const id = 'legacy-map-' + hash(entry.id).slice(0, 20), unresolved = [];
  const markers = parsed.markers.map((marker, index) => {
    const { target, ...fields } = marker;
    const result = { id: id + '-marker-' + (index + 1), ...fields };
    if (target) {
      const matches = entries.filter(item => item.permalink === target);
      const destination = matches[0];
      if (matches.length === 1 && current(destination) && byKey.get(destination.source_key)?.flag === 'true' && !byKey.get(destination.source_key)?.parsed?.data.hide) { result.url = destination.permalink; result.target_id = destination.id; }
      else unresolved.push(result.id);
    }
    return result;
  });
  if (unresolved.length && entry.legacy_map?.link_policy !== 'omit_unresolved' && !reviewOnly) fail('MAP_LINK_TARGET_UNAPPROVED');
  return { map: { schema_version: 1, id, owner_id: entry.id, width: parsed.width, height: parsed.height, initial_zoom_offset: parsed.zoom, image: { id: image.id, src: image.url, alt: image.alt }, markers }, unresolved };
}
module.exports = { extractLegacyMap, projectLegacyMap, validPolicy, localPath, LegacyMapError };
