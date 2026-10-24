export const normalize = value => String(value ?? '').toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');

// Both isolated indexes share ranking, never their data or fetch cache.
export function searchEntries(entries, query) {
  const term = normalize(query).trim();
  if (!term || !Array.isArray(entries)) return [];
  return entries.filter(entry => entry && typeof entry.title === 'string').map(entry => {
    const title = normalize(entry.title);
    const aliases = Array.isArray(entry.aliases) ? entry.aliases.map(normalize) : [];
    const score = title === term || aliases.includes(term) ? 3 : title.includes(term) || aliases.some(alias => alias.includes(term)) ? 2 : normalize(entry.body).includes(term) ? 1 : 0;
    return { entry, score };
  }).filter(result => result.score).sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'pl')).map(result => result.entry);
}

export function validSearchUrl(url, scope) {
  if (typeof url !== 'string') return false;
  if (scope === 'demo') return /^\/demo\/entities\/[a-z0-9-]+\/$/.test(url);
  if (!url.startsWith('/') || url.startsWith('//') || !url.endsWith('/')) return false;
  if (/[?#\\<>"'\s\x00-\x1f{}%]/.test(url) || url.split('/').some(part => part === '.' || part === '..')) return false;
  return !/^\/(?:demo|assets|catalog|entities)(?:\/|$)/i.test(url);
}

export function searchSnippet(entry, query) {
  const body = typeof entry.body === 'string' ? entry.body.replace(/\s+/g, ' ').trim() : '';
  const position = normalize(body).indexOf(normalize(query).trim());
  const text = position >= 0 ? body : String(entry.summary || body);
  const start = position >= 0 ? Math.max(0, position - 65) : 0;
  const end = Math.min(text.length, start + 210);
  return (start ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}
