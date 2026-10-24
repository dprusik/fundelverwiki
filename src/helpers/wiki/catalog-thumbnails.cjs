const sharp = require('sharp');
const { createHash } = require('node:crypto');
const { parse } = require('node-html-parser');

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Catalog thumbnails use only images already included by the publication
// approval adapter. Item cards are cropped to their artwork panel.
async function buildCatalogThumbnails(local, imageVariants) {
  const files = [];
  const byId = {};
  for (const article of local.articles) {
    if (!['character', 'item', 'location'].includes(article.kind)) continue;
    const image = parse(article.html).querySelector('img');
    const source = article.portrait?.src || article.illustration?.src || image?.getAttribute('src');
    if (!source || !local.files.some(file => file.url === source)) continue;

    if (article.kind === 'character' || article.kind === 'location') {
      const variant = imageVariants[source]?.find(item => item.width >= 320) || imageVariants[source]?.at(-1);
      if (variant) byId[article.id] = { src: variant.url, kind: article.kind, ...(article.kind === 'character' && !article.portrait?.src ? { fromArticle: true } : {}) };
      continue;
    }

    const approved = local.files.find(file => file.url === source);
    const metadata = await sharp(approved.bytes).metadata();
    if (!metadata.width || !metadata.height || metadata.width < 200 || metadata.height < 300) continue;
    const left = Math.round(metadata.width * 0.05);
    const top = Math.round(metadata.height * 0.04);
    const width = Math.round(metadata.width * 0.90);
    const height = Math.min(Math.round(metadata.height * 0.28), metadata.height - top);
    const bytes = await sharp(approved.bytes)
      .extract({ left, top, width, height })
      .resize(720, 360, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82 })
      .toBuffer();
    const digest = hash(bytes);
    const url = `/img/optimized/${digest}-catalog.webp`;
    files.push({ url, bytes, sha256: digest });
    byId[article.id] = { src: url, kind: 'item' };
  }
  return { files, byId };
}

module.exports = { buildCatalogThumbnails };
