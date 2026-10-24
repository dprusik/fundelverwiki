const Image = require('@11ty/eleventy-img');
const { createHash } = require('node:crypto');
const { parse } = require('node-html-parser');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// Consume only bytes from prepareLocalArticles, never source paths or remote URLs.
async function buildImageVariants(local, decorationUrls = []) {
  const selected = new Set(decorationUrls);
  const excluded = new Set(local.maps.map(item => item.map.image.src));
  for (const article of local.articles) {
    const urls = parse(article.html).querySelectorAll('img').map(img => img.getAttribute('src'));
    if (article.category === 'items') urls.forEach(url => excluded.add(url));
    else urls.forEach(url => selected.add(url));
    for (const field of ['portrait', 'illustration']) if (article[field]) selected.add(article[field].src);
  }
  const files = [], sources = {};
  for (const file of local.files) {
    if (!selected.has(file.url) || excluded.has(file.url) || !/\.(png|jpe?g)$/i.test(file.url)) continue;
    const stats = await Image(file.bytes, {
      widths: [96, 320, 640, 960, 1440], formats: ['webp'], dryRun: true, useCache: false,
      sharpWebpOptions: { quality: 82 },
    });
    const variants = [];
    for (const stat of stats.webp) {
      const hash = digest(stat.buffer);
      const url = `/img/optimized/${hash}-${stat.width}.webp`;
      if (!files.some(file => file.url === url)) files.push({ url, bytes: stat.buffer, sha256: hash });
      variants.push({ url, width: stat.width, height: stat.height });
    }
    sources[file.url] = variants.sort((a, b) => a.width - b.width);
  }
  return { files, sources };
}

function optimizeImageHtml(html, sources, approvedUrls) {
  const document = parse(html);
  for (const img of document.querySelectorAll('img')) {
    const original = img.getAttribute('src');
    const variants = approvedUrls.has(original) && sources[original];
    if (!variants?.length || img.closest('.item-rules-cards')) continue;
    const width = Number(img.getAttribute('width'));
    const fixed = width > 0 && width <= 400;
    const portrait = Boolean(img.closest('.profile-portrait'));
    const desired = portrait ? 240 : fixed ? width : 960;
    const fallback = variants.find(item => item.width >= desired) || variants.at(-1);
    img.setAttribute('src', fallback.url);
    img.setAttribute('srcset', variants.map(item => `${item.url} ${item.width}w`).join(', '));
    img.setAttribute('sizes', portrait ? '(max-width: 700px) 200px, 240px' : fixed ? `${width}px` : '(max-width: 999px) calc(100vw - 32px), 960px');
    img.setAttribute('decoding', 'async');
    if (!img.hasAttribute('width') && !img.hasAttribute('height')) {
      img.setAttribute('width', String(fallback.width));
      img.setAttribute('height', String(fallback.height));
    }
    if (img.closest('.approved-prose')) {
      img.setAttribute('loading', 'lazy');
      if (!img.closest('a')) {
        const link = parse('<a data-image-viewer></a>').firstChild;
        link.setAttribute('href', original);
        link.setAttribute('data-image-label', img.getAttribute('alt') || '');
        link.setAttribute('aria-label', `Powiększ ilustrację: ${img.getAttribute('alt') || 'Otwórz oryginał'}`);
        img.replaceWith(link);
        link.appendChild(img);
      }
    }
  }
  return document.toString();
}

module.exports = { buildImageVariants, optimizeImageHtml };
