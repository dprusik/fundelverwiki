/* Read-only viewer: consumes projected DTO, never source HTML or arbitrary URLs. */
const $ = id => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
const node = (tag, attrs = {}) => { const item = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value); return item; };
const palette = { tavern: ['#F57C00', '🍺'], home: ['#27ae60', '⌂'], safe: ['#27ae60', '⌂'], merchant: ['#f39c12', '⚖'], danger: ['#8e44ad', '!'], dangerous: ['#8e44ad', '!'], temple: ['#3498db', '✦'], magic: ['#9b59b6', '✧'], castle: ['#7f8c8d', '♜'], number: ['#2f80ed', ''] };
(async () => {
  try {
    const embedded = $('map-data');
    let data;
    if (embedded) data = JSON.parse(embedded.textContent);
    else {
      const key = new URLSearchParams(location.search).get('entry');
      if (!/^entry-[a-f0-9]{20}$/.test(key || '')) throw Error('Nieprawidłowy identyfikator notatki.');
      const response = await fetch('/api/map/' + key); data = await response.json();
      if (!response.ok) throw Error(data.error);
    }
    const model = data.map, svg = $('map'), pins = [];
    if (data.unresolved_links && data.link_policy !== 'omit_unresolved') {
      $('policy').hidden = false;
      $('save-policy').addEventListener('click', async () => {
        $('save-policy').disabled = true;
        try {
          if (!$('confirm-policy').checked) throw Error('Najpierw potwierdź decyzję o pominięciu niedostępnych odnośników.');
          const session = await fetch('/api/session').then(response => response.json());
          const response = await fetch('/api/map-policy', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Review-Token': session.csrf }, body: JSON.stringify({ ...data.policy_review, confirm: true, link_policy: 'omit_unresolved' }) });
          const result = await response.json(); if (!response.ok) throw Error(result.error);
          $('policy-status').textContent = result.export_error ? 'Decyzja została zapisana, ale eksport nie powiódł się. Utwórz propozycję w panelu DM.' : `Zapisano decyzję. Propozycje: ${result.proposal.exported}. Plik lokalny: ${result.proposal.local_file}. Aktywne rejestry nie zostały zmienione.`;
        } catch (error) { $('policy-status').textContent = 'Nie udało się potwierdzić zapisu: ' + error.message; $('save-policy').disabled = false; }
      });
    }
    $('title').textContent = data.title || data.entry?.title || 'Mapa kampanii';
    $('status').textContent = data.unresolved_links ? `Podgląd: ${model.markers.length} znaczników. ${data.unresolved_links} odnośników nie ma zatwierdzonego celu — pozostają nieaktywne. Publikacja nadal podlega walidacji.` : 'Podgląd zatwierdzonych danych mapy. Produkcyjny build pozostaje zablokowany.';
    $('count').textContent = '(' + model.markers.length + ')'; $('content').hidden = false;
    svg.setAttribute('width', model.width); svg.setAttribute('height', model.height);
    const image = node('image', { x: 0, y: 0, width: model.width, height: model.height, preserveAspectRatio: 'none', href: model.image.src });
    image.addEventListener('error', () => { $('status').textContent = 'Nie udało się wczytać zatwierdzonego obrazu mapy.'; });
    svg.append(image); // Legacy world units stay distinct from natural image pixels.
    let view = { x: 0, y: 0, width: model.width, height: model.height };
    function draw() {
      svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
      const bounds = svg.getBoundingClientRect();
      svg.closest('.wiki-map-layout')?.style.setProperty('--wiki-map-height', `${bounds.height}px`);
      const scale = view.width / Math.max(bounds.width, 1);
      pins.forEach(({ pin, marker }) => pin.setAttribute('transform', `translate(${marker.x} ${model.height - marker.y}) scale(${scale})`));
    }
    function zoom(factor, ax = .5, ay = .5) {
      const width = Math.max(model.width / 32, Math.min(model.width * 32, view.width * factor));
      const ratio = width / view.width;
      view = { x: view.x + view.width * ax * (1 - ratio), y: view.y + view.height * ay * (1 - ratio), width, height: view.height * ratio }; draw();
    }
    function reset() { view = { x: 0, y: 0, width: model.width, height: model.height }; zoom(Math.pow(2, -model.initial_zoom_offset)); }
    function select(marker) {
      pins.forEach(({ pin, button, halo, marker: candidate }) => {
        const selected = candidate.id === marker.id;
        pin.setAttribute('aria-pressed', String(selected));
        button.setAttribute('aria-pressed', String(selected));
        halo.setAttribute('visibility', selected ? 'visible' : 'hidden');
        const list = $('markers');
        if (selected && list.scrollHeight > list.clientHeight && getComputedStyle(list).overflowY === 'auto') {
          const tile = button.getBoundingClientRect(), frame = list.getBoundingClientRect();
          if (tile.top < frame.top || tile.bottom > frame.bottom) list.scrollTo({ top: list.scrollTop + tile.top - frame.top, behavior: 'instant' });
        }
      });
      $('marker-name').textContent = marker.name; $('marker-description').textContent = marker.description;
      $('marker-link').replaceChildren();
      if (marker.url) { const link = document.createElement('a'); link.href = marker.url; link.textContent = 'Otwórz artykuł lokacji'; $('marker-link').append(link); }
      else $('marker-link').textContent = 'Brak przypisanego zatwierdzonego artykułu.';
      $('popup').hidden = false;
      const y = model.height - marker.y;
      if (marker.x < view.x || marker.x > view.x + view.width || y < view.y || y > view.y + view.height) { view.x = marker.x - view.width / 2; view.y = y - view.height / 2; draw(); }
    }
    let dragged = false;
    for (const marker of model.markers) {
      const [color, glyph] = palette[marker.type] || palette.number;
      const pin = node('g', { class: 'map-marker', role: 'button', tabindex: '0', 'aria-label': marker.name, 'aria-pressed': 'false', 'data-marker-id': marker.id });
      const halo = node('g', { class: 'map-selection', visibility: 'hidden', 'aria-hidden': 'true', 'pointer-events': 'none' });
      halo.append(node('circle', { cx: 0, cy: -18, r: 20, fill: 'none', stroke: '#141618', 'stroke-width': 7 }), node('circle', { cx: 0, cy: -18, r: 20, fill: 'none', stroke: '#E3C995', 'stroke-width': 3 }));
      pin.append(halo);
      pin.append(node('path', { d: 'M-11 -10 L0 0 L11 -10 Z', fill: marker.color || color, stroke: 'white' }), node('circle', { cx: 0, cy: -18, r: 14, fill: marker.color || color, stroke: 'white', 'stroke-width': 2 }));
      const label = node('text', { x: 0, y: -13 }); label.textContent = marker.number || marker.icon || glyph; pin.append(label);
      pin.addEventListener('click', event => { event.stopPropagation(); if (!dragged) select(marker); });
      pin.addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); select(marker); } });
      svg.append(pin);
      const li = document.createElement('li'), button = document.createElement('button'); button.textContent = marker.name; button.setAttribute('aria-pressed', 'false'); button.setAttribute('data-marker-id', marker.id); button.addEventListener('click', () => select(marker)); li.append(button); $('markers').append(li);
      pins.push({ pin, marker, button, halo });
    }
    $('zoom-in').addEventListener('click', () => zoom(.75)); $('zoom-out').addEventListener('click', () => zoom(1 / .75)); $('reset').addEventListener('click', reset);
    svg.addEventListener('wheel', event => { event.preventDefault(); const r = svg.getBoundingClientRect(); zoom(event.deltaY > 0 ? 1.15 : 1 / 1.15, (event.clientX - r.x) / r.width, (event.clientY - r.y) / r.height); }, { passive: false });
    svg.addEventListener('keydown', event => {
      if (event.target !== svg) return;
      if (event.key === '+' || event.key === '=') zoom(.75);
      else if (event.key === '-') zoom(1 / .75);
      else if (event.key === 'Home') reset();
      else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { view.x += ({ ArrowLeft: -.1, ArrowRight: .1 }[event.key] || 0) * view.width; view.y += ({ ArrowUp: -.1, ArrowDown: .1 }[event.key] || 0) * view.height; draw(); }
      else return;
      event.preventDefault();
    });
    const pointers = new Map(); let pinch = null, pressedMarker = null, skipClick = false;
    svg.addEventListener('pointerdown', event => { dragged = false; pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); pressedMarker = pointers.size === 1 ? event.target.closest('.map-marker')?.getAttribute('data-marker-id') : null; svg.setPointerCapture(event.pointerId); pinch = null; });
    svg.addEventListener('pointermove', event => {
      if (!pointers.has(event.pointerId)) return;
      const previous = pointers.get(event.pointerId), r = svg.getBoundingClientRect();
      if (Math.abs(event.clientX - previous.x) + Math.abs(event.clientY - previous.y) > 2) dragged = true;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) { const [a, b] = [...pointers.values()], distance = Math.hypot(a.x - b.x, a.y - b.y); if (pinch && distance) zoom(pinch / distance, ((a.x + b.x) / 2 - r.x) / r.width, ((a.y + b.y) / 2 - r.y) / r.height); pinch = distance; }
      else { view.x -= (event.clientX - previous.x) / r.width * view.width; view.y -= (event.clientY - previous.y) / r.height * view.height; draw(); }
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) svg.addEventListener(type, event => {
      if (type === 'pointerup' && !dragged && pressedMarker) { const marker = model.markers.find(item => item.id === pressedMarker); if (marker) { select(marker); skipClick = true; } }
      pointers.delete(event.pointerId); pinch = null; pressedMarker = null;
    });
    svg.addEventListener('click', event => { if (skipClick) { skipClick = false; return; } if (dragged || event.target.closest('.map-marker')) return; const r = svg.getBoundingClientRect(); $('coordinates').textContent = `x: ${Math.round(view.x + (event.clientX - r.x) / r.width * view.width)}, y: ${Math.round(model.height - view.y - (event.clientY - r.y) / r.height * view.height)}`; });
    new ResizeObserver(draw).observe(svg); reset();
  } catch (error) { $('status').textContent = 'Podgląd mapy zablokowany: ' + error.message; }
})();
