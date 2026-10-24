const { parse } = require('node-html-parser');

// DM requested using the existing article illustration as its portrait.
// Only already approved, copied assets may be reused; source notes stay intact.
function characterPortraitView(article, files) {
  if (article.kind !== 'character') return article;
  const document = parse(article.html);
  const image = document.querySelector('img');
  const src = article.portrait?.src || image?.getAttribute('src');
  if (!src || !files.some(file => file.url === src)) return article;
  const portrait = article.portrait || { src, alt: `Portret: ${article.title}`, fromArticle: true };
  if (image?.getAttribute('src') === src) {
    const paragraph = image.parentNode;
    if (paragraph.tagName === 'P' && paragraph.childNodes.every(node => node === image || node.nodeType === 3 && !node.textContent.trim())) paragraph.remove();
  }
  return { ...article, portrait, html: document.toString().trim() };
}
module.exports = { characterPortraitView };
