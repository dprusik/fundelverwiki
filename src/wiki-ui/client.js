import { searchEntries, validSearchUrl, searchSnippet } from './search.mjs';

const body = document.body;
const panel = document.querySelector('#navigation');
const workspace = document.querySelector('#workspace');
const toggle = document.querySelector('#panel-toggle');
const mobileToggle = document.querySelector('#mobile-menu');
const backdrop = document.querySelector('#backdrop');
const desktop = matchMedia('(min-width: 1000px)');
const dialog = document.querySelector('#search-dialog');
const imageDialog = document.querySelector('#image-dialog');
let imageTrigger;
const term = document.querySelector('#search-term');
let searchTrigger;
let dataPromise;
let searchVersion = 0;
let approvedPromise;
const searchScope = dialog?.dataset.searchScope === 'demo' ? 'demo' : 'approved';
function approvedData() {
  if (!approvedPromise) approvedPromise = fetch('/approved-search.json').then(response => {
    if (!response.ok) throw Error('Search unavailable');
    return response.json();
  }).then(data => {
    if (data.schema_version !== 1 || data.demonstration !== false || !Array.isArray(data.entries)) throw Error('Invalid search index');
    return data;
  }).catch(error => { approvedPromise = undefined; throw error; });
  return approvedPromise;
}

function demoData() {
  if (!dataPromise) dataPromise = fetch('/demo-search.json').then(response => {
    if (!response.ok) throw Error('Nie można wczytać danych demo.');
    return response.json();
  }).then(data => {
    if (data.demonstration !== true) throw Error('Nieprawidłowy zbiór demonstracyjny.');
    return data;
  }).catch(error => { dataPromise = undefined; throw error; });
  return dataPromise;
}

function closeDrawer(restore = true) {
  const wasOpen = body.classList.contains('drawer-open');
  body.classList.remove('drawer-open');
  workspace.inert = false;
  backdrop.hidden = true;
  panel.removeAttribute('role');
  panel.removeAttribute('aria-modal');
  mobileToggle.setAttribute('aria-expanded', 'false');
  panel.inert = !desktop.matches;
  if (wasOpen && restore) mobileToggle.focus({ preventScroll: true });
}

function syncPanel() {
  const focused = panel.contains(document.activeElement);
  closeDrawer(false);
  toggle.textContent = desktop.matches ? (body.classList.contains('panel-collapsed') ? 'Rozwiń panel' : 'Zwiń panel') : 'Zamknij menu';
  toggle.setAttribute('aria-expanded', String(!desktop.matches || !body.classList.contains('panel-collapsed')));
  if (!desktop.matches && focused) mobileToggle.focus();
}

mobileToggle.addEventListener('click', () => {
  body.classList.add('drawer-open');
  panel.inert = false;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  workspace.inert = true;
  backdrop.hidden = false;
  mobileToggle.setAttribute('aria-expanded', 'true');
  toggle.focus();
});
toggle.addEventListener('click', () => {
  if (!desktop.matches) return closeDrawer();
  body.classList.toggle('panel-collapsed');
  syncPanel();
});
backdrop.addEventListener('click', () => closeDrawer());
panel.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeDrawer(false)));
document.querySelectorAll('.submenu-toggle').forEach(button => {
  const submenu = document.getElementById(button.getAttribute('aria-controls'));
  submenu.hidden = button.getAttribute('aria-expanded') !== 'true';
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    submenu.hidden = !expanded;
  });
});
desktop.addEventListener('change', syncPanel);
syncPanel();
body.classList.add('js');

document.addEventListener('keydown', event => {
  if (dialog && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); openSearch(document.querySelector('.top-search'));
  }
  if (body.classList.contains('drawer-open')) {
    if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); }
    if (event.key === 'Tab') {
      const focusable = [...panel.querySelectorAll('a,button')].filter(element => element.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
});

function openSearch(trigger, query = '') {
  if (!dialog || !trigger) return;
  if (imageDialog?.open) imageDialog.close();
  closeDrawer(false);
  searchTrigger = trigger.closest('#navigation') && !desktop.matches ? mobileToggle : trigger;
  if (!dialog.open) dialog.showModal();
  term.value = query;
  term.focus({ preventScroll: true });
  runSearch();
}
document.querySelectorAll('[data-search]').forEach(button => button.addEventListener('click', () => openSearch(button)));
document.querySelector('.home-search')?.addEventListener('submit', event => {
  event.preventDefault();
  openSearch(document.querySelector('#home-query'), document.querySelector('#home-query').value);
});
document.querySelector('#search-close')?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
});
dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog?.addEventListener('close', () => { searchVersion++; clearTimeout(debounce); searchTrigger?.focus({ preventScroll: true }); });
let debounce;
term?.addEventListener('input', () => { searchVersion++; clearTimeout(debounce); debounce = setTimeout(runSearch, 200); });

document.querySelectorAll('[data-image-viewer]').forEach(trigger => trigger.addEventListener('click', event => {
  const image = trigger.querySelector('img'), source = image?.getAttribute('src');
  if (!imageDialog || !source || trigger.getAttribute('href') !== source || !source.startsWith('/') || source.startsWith('//') || new URL(source, location.href).origin !== location.origin) return;
  event.preventDefault();
  imageTrigger = trigger;
  document.querySelector('#image-dialog-image').src = source;
  document.querySelector('#image-dialog-image').alt = image.alt;
  document.querySelector('#image-dialog-title').textContent = 'Ilustracja: ' + (trigger.dataset.imageLabel || '');
  document.querySelector('#image-dialog-original').href = source;
  imageDialog.showModal();
  body.classList.add('image-viewer-open');
  document.querySelector('#image-dialog-close').focus({ preventScroll: true });
}));
document.querySelector('#image-dialog-close')?.addEventListener('click', () => imageDialog.close());
imageDialog?.addEventListener('click', event => { if (event.target === imageDialog) imageDialog.close(); });
imageDialog?.addEventListener('close', () => {
  body.classList.remove('image-viewer-open');
  document.querySelector('#image-dialog-image').removeAttribute('src');
  if (!dialog?.open) imageTrigger?.focus({ preventScroll: true });
});

async function runSearch() {
  const version = ++searchVersion;
  const query = term.value.trim();
  const status = document.querySelector('#search-status');
  const results = document.querySelector('#search-results');
  results.replaceChildren();
  const scopeLabel = searchScope === 'demo' ? 'dane demonstracyjne' : 'zatwierdzone treści kampanii';
  if (!query) { status.textContent = `Wpisz hasło. Przeszukiwane są wyłącznie ${scopeLabel}.`; return; }
  status.textContent = 'Ładowanie wyszukiwarki…';
  try {
    const data = await (searchScope === 'demo' ? demoData() : approvedData());
    if (version !== searchVersion || !dialog.open) return;
    const matches = searchEntries(data.entries, query).filter(entry => validSearchUrl(entry.url, searchScope));
    status.textContent = matches.length ? `Wyniki: ${matches.length}${matches.length > 30 ? ' · pokazano pierwsze 30' : ''} · ${scopeLabel}` : 'Brak wyników. Spróbuj innego hasła.';
    for (const entry of matches.slice(0, 30)) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = entry.url;
      link.textContent = entry.title;
      const excerpt = document.createElement('p');
      excerpt.textContent = searchSnippet(entry, query);
      item.append(link, excerpt); results.append(item);
    }
  } catch {
    if (version !== searchVersion || !dialog.open) return;
    status.textContent = 'Nie udało się pobrać danych wyszukiwarki. ';
    const retry = document.createElement('button'); retry.textContent = 'Spróbuj ponownie';
    retry.addEventListener('click', runSearch); status.append(retry);
  }
}

const controls = document.querySelector('#catalog-controls');
if (controls) {
  const group = controls.elements.group, faction = controls.elements.faction, location = controls.elements.location;
  function readUrl() {
    const params = new URLSearchParams(window.location.search);
    for (const field of [group, faction, location]) {
      const value = params.get(field.name) || (field === group ? 'all' : '');
      field.value = [...field.options].some(option => option.value === value) ? value : (field === group ? 'all' : '');
    }
  }
  async function update(push = false) {
    if (push) {
      const params = new URLSearchParams();
      for (const field of [group, faction, location]) if (field.value && field.value !== 'all') params.set(field.name, field.value);
      history.pushState(null, '', window.location.pathname + (params.size ? '?' + params : ''));
    }
    const status = document.querySelector('#catalog-status');
    try {
      const data = await demoData();
      const matches = new Set(data.entries.filter(entry => entry.kind === 'character' && (!faction.value || data.relations.some(edge => edge.source === entry.id && edge.type === 'member_of' && edge.target === faction.value)) && (!location.value || data.relations.some(edge => edge.source === entry.id && edge.type === 'located_in' && edge.target === location.value))).map(entry => entry.id));
      document.querySelectorAll('[data-group-mode]').forEach(mode => {
        mode.hidden = mode.dataset.groupMode !== group.value;
        mode.querySelectorAll('.character-group').forEach(section => {
          let visible = 0;
          section.querySelectorAll('[data-character-id]').forEach(card => { card.hidden = !matches.has(card.dataset.characterId); if (!card.hidden) visible++; });
          section.hidden = !visible;
        });
      });
      status.textContent = `Postacie: ${matches.size} · unikalne wpisy demonstracyjne`;
      document.querySelector('#catalog-empty').hidden = matches.size !== 0;
    } catch {
      status.textContent = 'Nie udało się wczytać filtrów. Pełna lista poniżej pozostaje dostępna. Odśwież stronę, aby spróbować ponownie.';
    }
  }
  controls.addEventListener('change', () => update(true));
  controls.addEventListener('submit', event => event.preventDefault());
  controls.addEventListener('reset', () => setTimeout(() => update(true), 0));
  window.addEventListener('popstate', () => { readUrl(); update(); });
  readUrl(); update();
}
