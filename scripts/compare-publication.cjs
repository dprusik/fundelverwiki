const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { scanRepository } = require('../src/helpers/wiki/publication.cjs');
const { SITE, compareOnline, sameSitePath } = require('../src/helpers/wiki/online-comparison.cjs');
const { reviewStore } = require('../src/helpers/wiki/review.cjs');

(async () => {
  const records = scanRepository(process.cwd());
  async function remote(route) {
    if (!sameSitePath(route)) throw Error('INVALID_REMOTE_PATH');
    const response = await fetch(new URL(route, SITE), { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Lorekeeper-read-only-comparison/1' } });
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 20 * 1024 * 1024) throw Error('REMOTE_RESPONSE_TOO_LARGE');
    return { status: response.status, type: response.headers.get('content-type') || '', text: buffer.toString('utf8'), bytes: buffer };
  }
  const result = await compareOnline(records, remote, record => {
    try { const filename = record.url === '/' ? 'index.html' : record.url.slice(1) + (record.url.endsWith('/') ? 'index.html' : ''); return fs.readFileSync(path.join('dist', filename), 'utf8'); } catch { return null; }
  });
  fs.mkdirSync('docs/review', { recursive: true });
  // No full public/private titles, URLs or response bodies in versionable reports.
  const id = crypto.randomUUID();
  fs.writeFileSync(`docs/review/online-comparison-${id}.json`, JSON.stringify(result.redacted, null, 2), { flag: 'wx' });
  const localDirectory = path.join(reviewStore(process.cwd()), 'online');
  fs.mkdirSync(localDirectory, { recursive: true });
  fs.writeFileSync(path.join(localDirectory, `${id}.json`), JSON.stringify(result.local, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ report: `docs/review/online-comparison-${id}.json`, ...result.redacted.summary }));
})().catch(() => { console.error('PUBLIC_COMPARISON_UNAVAILABLE (no approval inferred; no private names logged)'); process.exitCode = 1; });
