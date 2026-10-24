let rows = [], csrf;
const opened = new Map(), selected = new Set();
let previewVersion = 0;
let reviewMode = 'list';
const $ = id => document.getElementById(id);
const labels = { pending: 'Do przeglądu', changed: 'Zmieniony od decyzji', approved: 'Zatwierdzony lokalnie', denied: 'Odrzucony' };
function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
async function api(url, data) {
  const response = await fetch(url, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Review-Token': csrf }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw Error(result.error);
  return result;
}
function announce(text) { $('message').textContent = text; }
function feedback(id, text, error = false) {
  const node = $(id); node.textContent = text; node.classList.toggle('warning', error);
  announce(text); node.focus({ preventScroll: true }); node.scrollIntoView({ block: 'nearest' });
}
function errorMessage(error) {
  const messages = {
    PUBLIC_METADATA_REQUIRED: 'Uzupełnij publiczny tytuł, główną sekcję i rodzaj encji w podglądzie zaznaczonych notatek.',
    PUBLIC_ASSET_METADATA_REQUIRED: 'Uzupełnij publiczny opis obrazu (alt) i poprawne ID w podglądzie zaznaczonych zasobów.',
    SOURCE_CHANGED_REFRESH: 'Plik zmienił się od podglądu. Otwórz jego aktualną wersję i sprawdź zmianę.',
    SOURCE_CHANGED_OR_TOO_LARGE: 'Plik zmienił się albo przekracza limit podglądu. Wymaga ponownego lub osobnego przeglądu.',
    DECISION_CHANGED_REFRESH: 'Decyzja zmieniła się od podglądu. Otwórz ponownie zaznaczony plik.',
    EXPLICIT_SUPERSESSION_REQUIRED: 'Istnieje wcześniejsza decyzja. Potwierdź jej świadome zastąpienie drugim polem nad przyciskami.',
    OPEN_PREVIEW_BEFORE_DECISION: 'Podgląd wygasł, np. po restarcie serwera. Otwórz ponownie podgląd zaznaczonych plików.',
    NO_CURRENT_DECISIONS_TO_EXPORT: 'Brak zapisanych aktualnych decyzji do eksportu. Najpierw zatwierdź lub odrzuć materiały i sprawdź potwierdzenie zapisu.',
    REVIEW_STORE_WRITE_DENIED: 'Serwer nie ma prawa zapisu do lokalnego magazynu decyzji. Uruchom publication:review w zwykłym terminalu użytkownika, poza ograniczonym środowiskiem agenta. Nie zmieniaj miejsca magazynu na publiczny katalog. Odśwież stan przed ponowieniem: część grupy mogła zostać zapisana.',
    REVIEW_STORE_FULL: 'Brak miejsca na dysku lokalnego magazynu. Zwolnij miejsce i odśwież stan przed ponowieniem: część grupy mogła zostać zapisana.',
    EXPLICIT_LOCAL_REQUEST_REQUIRED: 'Sesja panelu wygasła albo adres jest nieprawidłowy. Otwórz panel pod http://127.0.0.1:8082 i odśwież stronę.',
    'Failed to fetch': 'Brak połączenia z lokalnym serwerem. Sprawdź terminal z publication:review. Nie można potwierdzić wyniku zapisu; odśwież stan przed ponowieniem.'
  };
  return messages[error.message] || error.message;
}
function visibleRows() { return rows.filter(row => (!$('kind').value || row.kind === $('kind').value) && (!$('state').value || row.state === $('state').value) && (!$('folder').value || row.folder === $('folder').value) && (row.source + ' ' + row.key).toLocaleLowerCase('pl').includes($('query').value.toLocaleLowerCase('pl'))); }
function setReviewMode(mode) {
  reviewMode = mode;
  if (mode === 'attachments') {
    selected.clear();
    $('confirm-review').checked = false;
    $('confirm-supersede').checked = false;
  }
  $('list-decisions').hidden = mode === 'attachments';
  $('return-to-list').hidden = mode !== 'attachments';
  $('select-visible').disabled = mode === 'attachments';
  drawList();
}
function proposalButton() {
  const button = element('button', 'Utwórz lokalną propozycję z zapisanych decyzji');
  button.addEventListener('click', () => $('export').click()); return button;
}
function drawList() {
  $('list').replaceChildren();
  const visible = visibleRows(); $('count').textContent = `Widoczne: ${visible.length} / ${rows.length} · zaznaczone: ${selected.size}`;
  for (const row of visible) {
    const item = element('div', undefined, 'file-row');
    const check = element('input'); check.type = 'checkbox'; check.checked = selected.has(row.key); check.disabled = reviewMode === 'attachments'; check.setAttribute('aria-label', 'Zaznacz ' + row.source);
    check.addEventListener('change', () => { check.checked ? selected.add(row.key) : selected.delete(row.key); drawList(); });
    const open = element('button', row.source); open.className = 'file-link'; open.addEventListener('click', () => show(row.key));
    const state = element('small', `${labels[row.state] || row.state} · ${row.scope === 'technical' ? 'kod' : 'treść'} · zależności do sprawdzenia: ${row.dependency_attention.length + row.unresolved_count}`);
    const info = element('div'); info.append(open, state); item.append(check, info); $('list').append(item);
  }
}
async function refresh() {
  rows = await api('/api/items');
  const previous = $('folder').value;
  $('folder').replaceChildren(new Option('Wszystkie foldery', ''));
  [...new Set(rows.map(row => row.folder))].sort().forEach(folder => $('folder').add(new Option(folder, folder)));
  $('folder').value = previous; if (!$('folder').value) $('folder').value = '';
  drawList();
  $('review-linked-assets').disabled = false;
}
function metadataForm(item, container) {
  const metadata = item.metadata;
  if (item.kind === 'system') { container.append(element('p', 'Przegląd techniczny kodu. Nie jest to zgoda na publikację treści fabularnej.')); return; }
  container.append(element('h3', 'Jawne metadane publiczne — sprawdź przed zgodą'));
  const fields = item.kind === 'entry' ? ['id', 'title', 'category', 'kind'] : ['id', 'alt'];
  const names = { id: 'Stałe ID', title: 'Publiczny tytuł', category: 'Główna sekcja', kind: 'Rodzaj encji', alt: 'Publiczny opis obrazu (alt)' };
  const choices = { documents: 'Dokumenty', characters: 'Postacie', locations: 'Lokacje', items: 'Przedmioty', maps: 'Mapy', chronicle: 'Kronika', article: 'Artykuł', character: 'Postać', organization: 'Organizacja', faction: 'Frakcja', location: 'Lokacja', item: 'Przedmiot', spell: 'Zaklęcie', session: 'Relacja z sesji' };
  for (const field of fields) {
    const label = element('label', names[field]);
    let input;
    if (field === 'category' || field === 'kind') {
      input = element('select'); input.add(new Option('Wybierz jawnie', ''));
      const values = field === 'category' ? ['documents', 'characters', 'locations', 'items', 'maps', 'chronicle'] : ['article', 'character', 'organization', 'faction', 'location', 'item', 'spell', 'session'];
      values.forEach(value => input.add(new Option(choices[value], value)));
    } else input = element('input');
    input.setAttribute('aria-label', names[field]); input.value = metadata[field] || '';
    input.addEventListener('input', () => { metadata[field] = input.value; }); label.append(input); container.append(label);
  }
  container.append(element('p', 'Sugerowana nazwa i ID nie stanowią zgody. Pozostałe wcześniejsze pola nie są nadpisywane; propozycja będzie wymagać jawnego scalenia z rejestrem.'));
}
async function show(key) {
  const version = ++previewVersion;
  setReviewMode('list');
  try {
    const previous = opened.get(key);
    const item = await api('/api/item/' + key);
    if (version !== previewVersion) return;
    if (previous && previous.sha256 === item.sha256 && previous.revision === item.revision) item.metadata = previous.metadata;
    opened.set(key, item); const panel = $('preview'); panel.replaceChildren();
    panel.append(element('h2', item.source), element('p', `${item.bytes} bajtów · ${labels[item.state]} · SHA-256 ${item.sha256}`, 'hash'));
    if (item.previous_decision) panel.append(element('p', 'Poprzednia zapisana decyzja: ' + (labels[item.previous_decision] || item.previous_decision) + '. Zmiana bajtów nie usuwa tej decyzji z historii.'));
    if (item.kind === 'entry' && item.text?.includes('campaign-map')) {
      const link = element('a', 'Otwórz bezpieczny podgląd mapy'); link.href = '/map-review/?entry=' + encodeURIComponent(item.key); link.target = '_blank'; link.rel = 'noopener'; panel.append(link);
    }
    panel.append(element('p', item.kind === 'entry' ? `dg-publish: ${item.flag} · kanoniczny adres: ${item.url || 'brak'}` : item.scope === 'technical' ? 'Zakres: techniczny przegląd kodu' : 'Zakres: zgoda na publikację całego zasobu'));
    if (item.online) panel.append(element('p', `Obserwacja online (${item.online.at}): ${JSON.stringify(item.online.observation)}. To informacja techniczna, nie zgoda DM.`));
    if (item.image) {
      if (item.snapshot_available && item.state === 'changed') { panel.append(element('h3', 'Poprzednia przejrzana wersja')); const previousImage = element('img'); previousImage.src = '/api/blob/' + item.key + '?baseline=' + item.previous_sha256; previousImage.alt = 'Poprzedni lokalny snapshot obrazu'; panel.append(previousImage); }
      panel.append(element('h3', 'Obecna wersja')); const image = element('img'); image.src = '/api/blob/' + item.key; image.alt = 'Lokalny podgląd wybranego zasobu'; const full = element('a', 'Otwórz obraz w pełnym rozmiarze'); full.href = image.src; full.target = '_blank'; full.rel = 'noreferrer'; panel.append(image, full);
    }
    else if (item.text !== null) {
      const details = element('details'); details.open = true; const summary = element('summary', 'Pełna treść jako tekst (HTML/JS/SVG nigdy nie są wykonywane)');
      details.append(summary, element('pre', item.text)); panel.append(details);
    } else { const link = element('a', 'Pobierz do osobnego lokalnego przeglądu'); link.href = '/api/blob/' + item.key; panel.append(link, element('p', 'Format bez osadzonego podglądu. Przejrzyj pobrany plik przed decyzją.')); }
    if (item.truncated) panel.append(element('p', 'Materiał przekracza limit podglądu. Zgoda w tym narzędziu jest zablokowana.', 'warning'));
    const diff = element('details'); diff.open = item.state === 'changed'; diff.append(element('summary', 'Diff od poprzedniej lokalnej decyzji'));
    if (item.diff) { const pre = element('pre'); for (const line of item.diff.lines) pre.append(element('div', (line.op === 'add' ? '+ ' : line.op === 'remove' ? '- ' : '  ') + line.text, line.op)); diff.append(pre); }
    else diff.append(element('p', item.previous_sha256 ? 'Brak tekstowej kopii bazowej; przejrzyj całość lub porównaj binaria.' : 'Pierwszy przegląd — brak wcześniejszego snapshotu.'));
    panel.append(diff, element('h3', 'Zależności (nie są automatycznie zatwierdzane)'));
    const list = element('ul'); for (const dependency of item.dependencies) { const li = element('li'); const button = element('button', `${dependency.source} · ${labels[dependency.state]}`); button.addEventListener('click', () => show(dependency.key)); li.append(button); list.append(li); }
    panel.append(list, element('p', `Od poprzedniej decyzji: nowe zależności ${item.dependency_changes.added.length}, usunięte ${item.dependency_changes.removed.length}, zmienione bajty zależności ${item.dependency_changes.changed.length}. Niezmieniona notatka nie wymaga ponownej zgody tylko dlatego, że zmienił się obraz.`));
    if (item.unresolved.length) { const ul = element('ul'); item.unresolved.forEach(target => ul.append(element('li', target))); panel.append(element('h3', 'Nierozwiązane lub zewnętrzne odwołania — wymagają sprawdzenia'), ul); }
    metadataForm(item, panel);
    if (item.history.length) { const details = element('details'); details.append(element('summary', 'Zachowana historia decyzji')); item.history.forEach(event => details.append(element('p', `${event.at} · ${event.decision} · ${event.sha256}`))); panel.append(details); }
    if (item.kind === 'entry' && item.dependencies.some(dependency => dependency.kind === 'asset')) await attachmentReview(panel, item.dependencies.filter(dependency => dependency.kind === 'asset'), item, version);
  } catch (error) { announce(error.message); }
}
function approvalRequest(item, supersede) {
  if (item.kind === 'entry' && (!item.metadata.title?.trim() || !item.metadata.category || !item.metadata.kind)) throw Error('Uzupełnij publiczny tytuł, główną sekcję i rodzaj encji w podglądzie: ' + item.source);
  if (item.kind === 'asset' && !item.metadata.alt?.trim()) throw Error('Uzupełnij publiczny opis obrazu (alt) w podglądzie: ' + item.source);
  return { key: item.key, sha256: item.sha256, expected_revision: item.revision, scope: item.scope, metadata: item.metadata, decision: 'approved', confirm_review: true, confirm_supersede: supersede, review_token: item.review_token };
}
async function attachmentReview(panel, dependencies, parent, version) {
  setReviewMode('attachments');
  const section = element('section', undefined, 'attachment-review');
  section.append(element('h3', parent ? 'Przegląd notatki z załącznikami' : 'Załączniki zatwierdzonych notatek'));
  section.append(element('p', 'Obejrzyj pokazane materiały. Checkbox przy każdym pliku określa zakres wspólnej zgody. Zapis nastąpi dopiero po Twoim potwierdzeniu. SVG i kod pozostają tekstem.'));
  const candidates = [...new Map(dependencies.map(item => [item.key, item])).values()];
  const grid = element('div', undefined, 'attachment-grid'); section.append(grid); panel.append(section);
  const fetched = await Promise.allSettled(candidates.map(item => api('/api/item/' + item.key)));
  if (version !== previewVersion) return;
  const choices = [];
  for (let index = 0; index < candidates.length; index++) {
    const result = fetched[index], card = element('article', undefined, 'attachment-card'); grid.append(card);
    if (result.status !== 'fulfilled') { card.append(element('h4', candidates[index].source), element('p', 'Nie udało się otworzyć podglądu. Plik nie będzie zatwierdzany: ' + errorMessage(result.reason), 'warning')); continue; }
    const item = result.value;
    if (item.kind !== 'asset') continue;
    const previous = opened.get(item.key);
    if (previous && previous.sha256 === item.sha256 && previous.revision === item.revision) item.metadata = previous.metadata;
    opened.set(item.key, item);
    card.append(element('h4', item.source), element('p', labels[item.state]));
    if (item.state === 'approved') { card.append(element('p', 'Aktualna zgoda już istnieje. Nie wymaga ponownego przeglądu ani nowej decyzji.')); continue; }
    const label = element('label'), check = element('input'); check.type = 'checkbox'; check.checked = item.state !== 'denied';
    label.append(check, document.createTextNode(' Zatwierdź załącznik ' + item.source)); card.append(label);
    const choice = { item, check, ready: !item.image && !item.truncated }; choices.push(choice);
    if (item.image) {
      if (item.state === 'changed' && item.snapshot_available) {
        card.append(element('p', 'Poprzednia wersja'));
        const baseline = element('img'); baseline.src = '/api/blob/' + item.key + '?baseline=' + item.previous_sha256; baseline.alt = 'Poprzedni snapshot'; card.append(baseline);
      }
      const image = element('img'); image.alt = 'Obecny podgląd ' + item.name;
      image.addEventListener('load', () => { choice.ready = image.naturalWidth > 0; });
      image.addEventListener('error', () => { choice.ready = false; check.checked = false; check.disabled = true; card.append(element('p', 'Nie można wyświetlić obrazu. Przejrzyj plik osobno; wspólne zatwierdzenie jest zablokowane.', 'warning')); });
      image.src = '/api/blob/' + item.key;
      const full = element('a', 'Powiększ obraz'); full.href = image.src; full.target = '_blank'; full.rel = 'noreferrer'; card.append(image, full);
    } else if (item.text !== null) {
      card.append(element('pre', item.text));
      if (item.diff) { const diff = element('details'); diff.open = item.state === 'changed'; diff.append(element('summary', 'Zmiany od poprzedniej zgody')); const pre = element('pre'); item.diff.lines.forEach(line => pre.append(element('div', line.text, line.op))); diff.append(pre); card.append(diff); }
    } else { check.checked = false; check.disabled = true; card.append(element('p', 'Ten format wymaga osobnego pobrania i przeglądu. Nie jest częścią wspólnej zgody.')); }
    if (item.truncated) { check.checked = false; check.disabled = true; card.append(element('p', 'Niepełny podgląd — wspólna zgoda zablokowana.', 'warning')); }
    metadataForm(item, card);
  }
  if (parent?.unresolved.length) section.append(element('p', 'Notatka ma nierozwiązane odwołania. Zapis zgody nie rozwiąże ich i nie odblokuje importu.', 'warning'));
  const includeParent = element('input'); includeParent.type = 'checkbox'; includeParent.checked = parent && !['approved', 'denied'].includes(parent.state);
  if (parent && parent.state !== 'approved') { const label = element('label'); label.append(includeParent, document.createTextNode(' Uwzględnij również tę notatkę')); section.append(label); }
  else if (parent) section.append(element('p', 'Zgoda na niezmienioną notatkę pozostanie bez zmian. Zapis obejmie tylko wybrane załączniki.'));
  const common = element('input'); common.placeholder = 'Opis do pustych pól alt wybranych załączników'; common.setAttribute('aria-label', 'Wspólny publiczny opis załączników');
  const fill = element('button', 'Wstaw opis do pustych pól wybranych załączników');
  fill.addEventListener('click', () => {
    if (!common.value.trim()) return;
    for (const choice of choices.filter(choice => choice.check.checked && !choice.item.metadata.alt?.trim())) {
      choice.item.metadata.alt = common.value;
      const input = choice.check.closest('article').querySelector('input[aria-label="Publiczny opis obrazu (alt)"]'); if (input) input.value = common.value;
    }
  });
  if (choices.length) section.append(common, fill);
  const confirm = element('input'); confirm.type = 'checkbox';
  const confirmLabel = element('label'); confirmLabel.append(confirm, document.createTextNode(' Przejrzałem pokazane materiały i zatwierdzam dla graczy wyłącznie zaznaczoną notatkę i załączniki.')); section.append(confirmLabel);
  const supersede = element('input'); supersede.type = 'checkbox';
  const supersedeLabel = element('label'); supersedeLabel.append(supersede, document.createTextNode(' Świadomie zastępuję wcześniejsze decyzje wybranych zmienionych lub odrzuconych plików. Historia pozostaje zachowana.')); section.append(supersedeLabel);
  const save = element('button'), message = element('p', undefined, 'feedback'); message.id = 'attachment-feedback'; message.setAttribute('role', 'status'); message.tabIndex = -1;
  const labelButton = () => { save.textContent = includeParent.checked ? 'Zatwierdź notatkę i wybrane załączniki' : 'Zatwierdź wybrane załączniki'; };
  includeParent.addEventListener('change', labelButton); labelButton(); section.append(save, message);
  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      if (!confirm.checked) throw Error('Potwierdź przegląd pokazanych materiałów.');
      const included = choices.filter(choice => choice.check.checked && !choice.check.disabled);
      if (included.some(choice => !choice.ready)) throw Error('Poczekaj na pełne załadowanie wybranych podglądów.');
      const items = [...(includeParent.checked ? [parent] : []), ...included.map(choice => choice.item)];
      if (!items.length) throw Error('Wybierz co najmniej jeden materiał do zatwierdzenia.');
      const result = await api('/api/decide', { items: items.map(item => approvalRequest(item, supersede.checked)) });
      for (const item of items) { selected.delete(item.key); opened.delete(item.key); }
      feedback(message.id, `Zapisano ${result.saved} nowych decyzji. Pozostałe zgody zachowano. Możesz utworzyć lokalną propozycję.`);
      confirm.checked = false;
      try { await refresh(); } catch { announce('Decyzje zapisane; odśwież listę, aby sprawdzić aktualny stan.'); }
      const next = element('button', 'Pokaż pozostałe załączniki zatwierdzonych notatek'); next.addEventListener('click', reviewApprovedAssets); section.append(next);
      section.append(proposalButton());
    } catch (error) { feedback(message.id, 'Nie udało się potwierdzić zapisu: ' + errorMessage(error), true); save.disabled = false; }
  });
}
async function reviewApprovedAssets() {
  const version = ++previewVersion, panel = $('preview');
  setReviewMode('attachments');
  $('review-linked-assets').disabled = true;
  panel.replaceChildren(element('h2', 'Wspólny przegląd załączników'), element('p', 'Wczytywanie powiązanych materiałów…'));
  try {
    const notes = await Promise.allSettled(rows.filter(item => item.kind === 'entry' && item.state === 'approved').map(item => api('/api/item/' + item.key)));
    if (version !== previewVersion) return;
    const assets = new Map();
    for (const result of notes) if (result.status === 'fulfilled') {
      // Recheck current state; changed notes never authorize their new references.
      if (result.value.state !== 'approved') continue;
      for (const dependency of result.value.dependencies.filter(item => item.kind === 'asset' && item.state !== 'approved')) assets.set(dependency.key, dependency);
    }
    panel.replaceChildren(element('h2', 'Wspólny przegląd załączników'));
    panel.append(element('p', `Do przejrzenia: ${assets.size} unikalnych załączników. Zgody na notatki pozostają bez zmian.`));
    if (notes.some(result => result.status === 'rejected')) panel.append(element('p', 'Nie wszystkie notatki udało się odczytać. Lista może być niepełna; pozostałe materiały nie są zatwierdzane.', 'warning'));
    if (assets.size) await attachmentReview(panel, [...assets.values()], null, version);
    else panel.append(element('p', 'Brak załączników wymagających nowej zgody w odczytanych zatwierdzonych notatkach. Zapisane decyzje są zachowane.'), proposalButton());
  } catch (error) { announce(errorMessage(error)); }
  finally { $('review-linked-assets').disabled = false; }
}
async function decide(decision) {
  if (reviewMode === 'attachments') { announce('Jesteś we wspólnym przeglądzie. Użyj jego przycisku zatwierdzania lub wróć do trybu indywidualnego.'); return; }
  $('approve').disabled = true; $('reject').disabled = true;
  try {
    if (!$('confirm-review').checked) throw Error('Potwierdź przegląd zaznaczonych materiałów.');
    if (!selected.size) throw Error('Zaznacz co najmniej jeden plik.');
    const items = [...selected].map(key => {
      const item = opened.get(key); if (!item) throw Error('Najpierw otwórz podgląd zaznaczonego pliku: ' + rows.find(row => row.key === key).source + '. Nie zapisano decyzji dla tej grupy.');
      if (decision === 'approved' && item.kind === 'entry' && (!item.metadata.title?.trim() || !item.metadata.category || !item.metadata.kind)) throw Error('Uzupełnij publiczny tytuł, główną sekcję i rodzaj encji w podglądzie: ' + item.source);
      if (decision === 'approved' && item.kind === 'asset' && !item.metadata.alt?.trim()) throw Error('Uzupełnij publiczny opis obrazu (alt) w podglądzie: ' + item.source);
      return { key, sha256: item.sha256, expected_revision: item.revision, scope: item.scope, metadata: item.metadata, decision, confirm_review: true, confirm_supersede: $('confirm-supersede').checked, review_token: item.review_token };
    });
    const result = await api('/api/decide', { items });
    selected.clear(); opened.clear(); $('confirm-review').checked = false; $('confirm-supersede').checked = false;
    feedback('decision-feedback', `Zapisano ${result.saved} nowych decyzji. Możesz teraz utworzyć lokalną propozycję. Build nadal zablokowany.`);
    try { await refresh(); } catch { feedback('decision-feedback', `Zapisano ${result.saved} nowych decyzji, ale nie udało się odświeżyć listy. Kliknij Odśwież przed kolejną decyzją.`); }
  } catch (error) { feedback('decision-feedback', 'Nie udało się potwierdzić zapisu: ' + errorMessage(error), true); }
  finally { $('approve').disabled = false; $('reject').disabled = false; }
}
for (const id of ['kind', 'state', 'folder', 'query']) $(id).addEventListener('input', drawList);
$('refresh').addEventListener('click', () => refresh().catch(error => announce(error.message)));
$('select-visible').addEventListener('click', () => { visibleRows().forEach(row => selected.add(row.key)); drawList(); });
$('clear-selection').addEventListener('click', () => { selected.clear(); drawList(); });
$('approve').addEventListener('click', () => decide('approved')); $('reject').addEventListener('click', () => decide('denied'));
$('review-linked-assets').addEventListener('click', reviewApprovedAssets);
$('return-to-list').addEventListener('click', () => {
  setReviewMode('list');
  document.querySelectorAll('.attachment-review').forEach(section => { section.hidden = true; });
  announce('Tryb indywidualny: decyzje obejmują tylko pliki zaznaczone na liście. Zapisane zgody pozostają zachowane.');
});
$('export').addEventListener('click', async () => {
  $('export').disabled = true;
  try {
    // Do not let export hide a failed/unfinished decision on the selected batch.
    if (selected.size) throw Error('Masz zaznaczone pliki bez zapisanego potwierdzenia. Najpierw użyj Zatwierdź/Odrzuć i sprawdź komunikat przy tych przyciskach, albo wyczyść zaznaczenie, aby eksportować wcześniejsze decyzje.');
    const result = await api('/api/export', { confirm: true });
    if (!result.exported) throw Error('NO_CURRENT_DECISIONS_TO_EXPORT');
    feedback('export-feedback', `Propozycje: ${result.exported}. Plik lokalny: ${result.local_file}. Nie zmieniono aktywnych rejestrów.`);
  } catch (error) { feedback('export-feedback', 'Nie utworzono propozycji z decyzjami: ' + errorMessage(error), true); }
  finally { $('export').disabled = false; }
});
$('online').addEventListener('toggle', async () => {
  if (!$('online').open) return;
  try {
    const result = await api('/api/online'); const panel = $('online-details'); panel.replaceChildren();
    if (!result.available) { panel.append(element('p', 'Brak lokalnego porównania. Uruchom npm run publication:compare.')); return; }
    panel.append(element('p', 'URL-e ujawnione przez publiczną witrynę, które nie pasują do lokalnych notatek (mogą to być strony systemowe):'));
    const extra = element('ul'); result.unmatched_public_paths.forEach(route => extra.append(element('li', route))); panel.append(extra);
    panel.append(element('p', `Niedziałające linki z home: ${result.broken_home_links.length}. Widoczność online nie oznacza zgody na publikację.`));
  } catch (error) { announce(error.message); }
});
api('/api/session').then(session => { csrf = session.csrf; $('store-location').textContent = 'Lokalny magazyn decyzji i snapshotów (poza repozytorium): ' + session.local_store; return refresh(); }).catch(error => announce(error.message));
