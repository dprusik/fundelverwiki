const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadAppearance } = require('../src/wiki-ui/theme.cjs');
const { tokens } = require('../src/wiki-ui/themes/dark-archive.cjs');
const luminance = hex => {
  const linear = hex.match(/[a-f0-9]{2}/gi).map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
};
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
const checks = [];
for (const surface of ['bg', 'surface', 'card', 'sidebar']) {
  for (const text of ['text', 'muted', 'link', 'metal', 'dragon-red-ink', 'dragon-blue-ink']) checks.push({ pair: `${text}/${surface}`, ratio: ratio(tokens[text], tokens[surface]), minimum: 4.5 });
  for (const control of ['control-border', 'focus']) checks.push({ pair: `${control}/${surface}`, ratio: ratio(tokens[control], tokens[surface]), minimum: 3 });
}
checks.push({ pair: 'button', ratio: ratio(tokens['on-accent'], tokens.accent), minimum: 4.5 });
checks.push({ pair: 'selection', ratio: ratio(tokens.text, tokens.selection), minimum: 4.5 });
for (const check of checks) assert.ok(check.ratio >= check.minimum, `${check.pair}: ${check.ratio.toFixed(2)} < ${check.minimum}`);
const appearance = loadAppearance(); assert.equal(appearance.decorations.banner, '/assets/branding/dragon-banner.png');
assert.equal(loadAppearance({ themeId: 'dark-archive', decorations: { texture: 'none', banner: null } }).decorations.banner, null);
assert.throws(() => loadAppearance({ themeId: 'unknown', decorations: { texture: 'none', banner: null } }));
assert.throws(() => loadAppearance({ themeId: 'dark-archive', decorations: { texture: 'none', banner: 'https://external.invalid/image.png' } }));
const report = { checks: checks.map(check => ({ ...check, ratio: Number(check.ratio.toFixed(2)) })), thresholds: 'WCAG contrast formula; text 4.5:1, control boundaries/focus 3:1; not a full WCAG audit' };
fs.mkdirSync('docs/artifacts/dark-archive', { recursive: true });
fs.writeFileSync('docs/artifacts/dark-archive/contrast.json', JSON.stringify(report, null, 2));
console.log(`CONTRAST_PASS: ${checks.length} pairs; minimum text ${Math.min(...checks.filter(check => check.minimum === 4.5).map(check => check.ratio)).toFixed(2)}:1`);
