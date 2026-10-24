const themes = { 'dark-archive': require('./themes/dark-archive.cjs') };
function loadAppearance(config = require('./campaign-theme.json')) {
  const theme = themes[config.themeId];
  if (!theme || !['cartography', 'none'].includes(config.decorations?.texture)) throw Error('INVALID_UI_THEME');
  const banner = config.decorations.banner;
  const logo = config.decorations.logo ?? null;
  if (logo !== null && (typeof logo !== 'string' || !/^\/assets\/branding\/[a-z0-9-]+\.(png|webp|avif)$/.test(logo))) throw Error('INVALID_UI_DECORATION');
  if (banner !== null && (typeof banner !== 'string' || !/^\/assets\/branding\/[a-z0-9-]+\.(png|webp|avif)$/.test(banner))) throw Error('INVALID_UI_DECORATION');
  const cssTokens = Object.entries(theme.tokens).map(([key, value]) => {
    if (!/^[a-z-]+$/.test(key) || !/^(#[a-fA-F0-9]{6}|[a-zA-Z ,.-]+)$/.test(value)) throw Error('INVALID_UI_TOKEN');
    return `--lk-${key}: ${value};`;
  }).join(' ');
  return { id: config.themeId, label: theme.label, cssTokens, decorations: { texture: config.decorations.texture, banner, logo } };
}
module.exports = { loadAppearance };
