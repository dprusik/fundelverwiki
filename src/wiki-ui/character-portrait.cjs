const { parse } = require('node-html-parser');

// DM requested reusing approved article images in character/location headers.
// Only already approved, copied assets may be reused; source notes stay intact.
function characterPortraitView(article, files) {
  if (article.kind !== 'character') return article;
  return articleImageView(article, files, 'portrait', 'Portret');
}

function entityImageView(article, files) {
  if (article.kind === 'character') return characterPortraitView(article, files);
  if (article.kind === 'location') return articleImageView(article, files, 'illustration', 'Ilustracja');
  return article;
}

function articleImageView(article, files, field, label) {
  const document = parse(article.html);
  const image = document.querySelector('img');
  const src = article[field]?.src || image?.getAttribute('src');
  if (!src || !files.some(file => file.url === src)) return article;
  const media = article[field] || { src, alt: (field === 'illustration' && image?.getAttribute('alt')) || `${label}: ${article.title}`, ...(field === 'portrait' ? { fromArticle: true } : {}) };
  if (image?.getAttribute('src') === src) {
    const paragraph = image.parentNode;
    if (paragraph.tagName === 'P' && paragraph.childNodes.every(node => node === image || node.nodeType === 3 && !node.textContent.trim())) paragraph.remove();
  }
  return { ...article, [field]: media, html: document.toString().trim() };
}
module.exports = { characterPortraitView, entityImageView };
