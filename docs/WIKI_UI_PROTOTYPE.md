# Wiki Layout 2.0 — lokalny prototyp M1A.1

Data: 2026-10-22. Gałąź: `feat/wiki-layout-2`. Baza: `994d1c3b1826f8a0909240ffa886c04ab0e03ae9`. Implementacja lokalna, bez commita i publikacji.

Aktualizacja 2026-10-23: strona główna i katalogi pokazują [lokalne zatwierdzone artykuły](LOCAL_APPROVED_ARTICLES.md), a `/approved/` jest pełnym grupowanym spisem. Demo ma teraz adres `/demo/` i osobne katalogi/encje; jego wyszukiwarka nie pojawia się w głównej wiki. Historyczne opisy i adresy demonstracyjnych ekranów poniżej pochodzą z wcześniejszych iteracji. Do generowania używaj `npm run wiki:build` lub `npm run wiki:dev`: te polecenia czyszczą wyłącznie katalog `.wiki-preview` przed generowaniem, także po wycofaniu zgody. Bezpośrednie uruchomienie Eleventy z konfiguracją podglądu nie jest wspieraną ścieżką przebudowy.

## Uruchomienie

Z PowerShell w repozytorium `fundelverwiki`:

```powershell
cd C:\Users\dawid\OneDrive\Dokumenty\git\fundelverwiki
npm run wiki:dev
```

Otwórz `http://127.0.0.1:8081/`. Zatrzymanie: Ctrl+C. Po edycji plików uruchom komendę ponownie — ten pierwszy serwer nie ma hot reload. Jeśli poprzedni serwer nadal działa, zatrzymaj go przed kolejnym uruchomieniem. Port jest stały: 8081; nasłuch wyłącznie na 127.0.0.1.

Zależności npm są już obecne w tym środowisku. Na świeżym checkoutcie najpierw `npm ci` (pobiera zależności z lockfile). Repo deklaruje Node 22.x; lokalną weryfikację wykonano na dostępnym Node 24.22.0, więc zgodność z Node 22 nie została osobno uruchomiona.

Trzy główne ekrany:

- Home: `http://127.0.0.1:8081/`
- Katalog: `http://127.0.0.1:8081/catalog/characters/?group=faction`
- Organizacja: `http://127.0.0.1:8081/entities/guild/`

Scenariusz: otwórz Postacie, zmień grupowanie/frakcję/lokację, otwórz Gildię Szlaków, następnie członka lub dokument. Mira występuje w dwóch frakcjach i lokacjach, cały czas pod jednym URL. Lokacja Wzgórze Świateł pozwala zobaczyć stan zerowych wyników. Krąg Rzeki demonstruje stronę organizacji bez powiązanych dokumentów i lokacji. Przedmioty, Mapy i Kronika mają uczciwe puste katalogi.

## Implementacja i izolacja

- Nowy shell: stały zwijany panel desktop (od 1000 px), mobilny modalny drawer, podmenu, breadcrumbs, skip link i wspólna wyszukiwarka. Bez JS dostępne rozwinięte menu i pełne listy. Interaktywne filtry/search wymagają JS.
- Home: nazwa/opis z konfiguracji, wyszukiwanie, sześć kategorii i datowane materiały demo. Organizacja: Markdown oraz listy jawnie zatwierdzonych relacji.
- Frakcja ma `kind: organization`; `section: characters` wyznacza wejście nawigacyjne, nie rodzaj encji. Nie jest dokumentem. Wspólny katalog Organizacje mieści się w podmenu Postaci. Adres encji nie zależy od sekcji; docelowy adapter musi używać istniejących permalinków.
- `wiki-preview.config.cjs` jest osobną konfiguracją Eleventy. Wejście: tylko `prototype/site`; wspólne komponenty: `src/wiki-ui`; wyjście: ignorowane `.wiki-preview`. Nie importuje produkcyjnej `.eleventy.js`, `.env`, notatek, obrazów kampanii ani grafu.
- `wiki:build` i `wiki:dev` kompilują Sass i uruchamiają tę konfigurację. Nie wywołują produkcyjnych prebuild/get-theme, nie kasują `dist`, nie pobierają CDN. Nazwy nie pasują do produkcyjnego globu `build:*`.
- Każda strona ma komunikat demo i noindex; serwer zwraca no-store. To oznaczenia pomocnicze, nie ochrona sekretów. Izolację zapewniają osobne wejście i jawny fixture, a nie robots.
- `demo-search.json` obejmuje wyłącznie dziewięć fikcyjnych wpisów i ich zatwierdzone relacje. Nie pobieramy ani nie generujemy `searchIndex.json` dla rzeczywistych notatek. Dla małego fixture wyszukiwanie offline używa bezpiecznego adaptera JS: tytuł, aliasy, treść, normalizacja polska, rendering przez textContent. Nie przeniesiono starego UI DG z interpolacją innerHTML/podglądami HTML ani zależnością CDN. Przejście do FlexSearch przy większym publicznym zbiorze pozostaje przyszłą optymalizacją po bramce publikacyjnej.
- Walidator demo odrzuca niezatwierdzone/niewłaściwie typowane relacje i niedopuszczone konfiguracje CSS. **Nie jest produkcyjną bramką publikacji** i nie rozpoznaje sekretów fabularnych.

Niezbędne miejsca przyszłej integracji DG potwierdzono przed implementacją: `layouts/index.njk` i `layouts/note.njk` wybierają navbar/filetree przed main; `common.header` jest wewnątrz main, a `gardenEntry` wybiera home. Docelowo wspólny shell zastąpi ten wybór pod flagą, a publiczny adapter dostarczy dane. W tej iteracji stare layouty, permalinki, Markdown i PNG są nietknięte; nie włączono nowego UI na rzeczywistych artykułach. Po etapie M1A.2 domyślne `npm run dev/build` są celowo blokowane przed starym generatorem do czasu certyfikacji kanałów publikacji; `wiki:dev/build` nadal uruchamiają odizolowany prototyp.

## Konfiguracja motywu

Edytuj wyłącznie demonstracyjny `src/wiki-ui/demo.json`: `campaign.name`, `description`, `theme.accent/background/surface/text/fontBody/fontHeading`, opcjonalnie `logo`. Nazwa Fundelver ani Forgotten Realms nie są zapisane w stylach lub komponentach.

Przykład logo: `"logo": "/assets/branding/atlas.svg"`. Własny plik dodaj do `src/wiki-ui/assets/` i jawnie dopisz do manifestu `assets` w demo.json z approved=true i alt; tylko zasoby z manifestu są kopiowane do assets/branding. Używaj lokalnych przeglądanych obrazów. Fonty konfigurowane są jako nazwy zainstalowanych fontów i fallbacki, bez automatycznego pobierania fontów. Kolory i fonty są walidowane przed interpolacją do tokenów CSS. Pozostałe semantyczne tokeny, w tym panel i szerokość treści, znajdują się w wiki.scss. Zmiana palety wymaga ponownego sprawdzenia kontrastu.

## Weryfikacja wykonana

```powershell
npm run wiki:build
npm run wiki:test
```

Build: sukces, osobne wyjście HTML/CSS/JS/JSON, bez rzeczywistych treści. Cztery testy Node: 4/4 PASS — zgoda/typy/końce relacji, wiele grup i jeden URL, search title/body/alias/Łódź, integralność wygenerowanych linków i brak produkcyjnego indeksu.

Test przeglądarkowy `scripts/wiki-browser-check.cjs`: PASS w headless Microsoft Edge (Chromium), przez Playwright z lokalnego toolingu. Wymaga działającego `wiki:dev` oraz dostępnego modułu Playwright. Powtórzenie w tym środowisku:

```powershell
$env:WIKI_PLAYWRIGHT_MODULE='C:/Users/dawid/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:WIKI_BROWSER_EXECUTABLE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
node scripts/wiki-browser-check.cjs
```

Na innym komputerze ustaw ścieżki do własnego Playwright/przeglądarki; jeśli Playwright jest normalnie dostępny dla require i ma Chromium, zmienne nie są potrzebne. Nie dodano nowych zależności do package-lock.

Sprawdzono: 1440×1000, 390×844, overflow przy 320×720, drawer i nieaktywne tło, pętla focusu, Escape/restore, nawigacja zamykająca drawer, przejście drawer→search, zwinięcie desktop, zmiana breakpointu, filtrowanie/grupowanie, puste wyniki, reload/reset, wyszukiwanie aliasu i tekst HTML jako zapytanie, katalog bez JS, brak pobierania produkcyjnego indeksu i brak błędów JS. Przegląd screenshotów potwierdził czytelny układ home/katalogu/frakcji.

Historyczne screenshoty home/katalogu/frakcji sprawdzono w poprzednim odbiorze; nie są dołączone do kandydata.

Nie wykonano: Safari/iOS/Android na sprzęcie, Firefox, NVDA/VoiceOver, pełnego axe/WCAG, produkcyjnego builda (usuwa dist i pobiera motyw), pełnej regresji renderowania PNG i starej wiki. Brak zmian w ich źródłach potwierdza Git, nie zastępuje to przyszłego testu po integracji. Nie wdrożono Auth, Realtime, edycji map ani produkcyjnej polityki publikacji. Testowy katalog ma pojedynczy wybór wartości w każdym wymiarze; wielokrotny wybór i OR wewnątrz wymiaru pozostają dalszym zakresem.

## Zmienione / dodane pliki

Zmodyfikowane: `.gitignore`, `package.json`, `README.md`, `docs/WIKI_UX_SPEC.md` (wcześniej nieśledzony dokument użytkownika, aktualizacja w miejscu).

Nowe:

- `wiki-preview.config.cjs`
- `scripts/wiki-preview.mjs`, `scripts/wiki-browser-check.cjs`
- `src/wiki-ui/demo.json`, `model.cjs`, `search.mjs`, `client.js`, `wiki.scss`, `assets/atlas.svg`
- `src/wiki-ui/templates/shell.njk`, `character-card.njk`
- `prototype/site/index.njk`, `catalog.njk`, `entities.njk`, `organizations.njk`, `search-data.njk`, `404.njk`
- `tests/wiki/demo.test.mjs`
- `docs/WIKI_UI_PROTOTYPE.md`, `docs/PROJECT_STATUS.md`
- Historyczne screenshoty były lokalnymi artefaktami i zostały pominięte w kandydacie.

Wcześniejszy lokalny audyt i dokumenty planistyczne pozostawiono poza pakietem integracyjnym, gdy zawierały prywatny materiał lub odnośniki do nieprzenoszonych artefaktów. Nie wykonano commita, push, deploymentu ani operacji w vault/.obsidian.

## Następny krok

Ocena trzech ekranów przez użytkownika. Dopiero później produkcyjna allowlista treści/załączników, projekcja relacji i bramka wszystkich kanałów publikacji, a następnie integracja shellu z DG i regresja prawdziwych publicznych wpisów. Rzeczywisty full-text pozostaje zablokowany dla nowego interfejsu do czasu wykonania tej bramki i jej testów. Kontrakt Maps opisany jest w WIKI_UX_SPEC.md; nie działa jeszcze viewer wskazujący marker.


## Rozszerzenie M1A — widoki postaci i lokacji (2026-10-22)

Zaimplementowano na tej samej gałęzi `feat/wiki-layout-2`, bez commita. Produkcyjne notatki/obrazy, nawigacja, klient wyszukiwarki i konfiguracja motywu pozostają bez zmian. Dostępne pod tym samym `npm run wiki:dev` i istniejącymi adresami encji:

- `/entities/mira/`: portret + jawnie publiczny status Żyje, role/summary, frakcje/lokacje, pełny dotychczasowy Markdown.
- `/entities/oskar/`: brak portretu, jawny status Nieznany.
- `/entities/lea/`: portret, brak statusu (bez automatycznej etykiety Nieznany).
- `/entities/harbor/`: ilustracja, powiązane Mira i Oskar z opisem relacji i portretem/inicjałem.
- `/entities/ridge/`: brak ilustracji i brak powiązanych postaci; neutralny stan pusty.

Trzy nowe schematyczne ilustracje SVG służą tylko demonstracji; nie są docelowymi portretami kampanii. Manifest `assets` dopuszcza wyłącznie istniejące lokalne pliki z jawnie zatwierdzonym SRC i alt. Postacie/lokacje odnoszą się do ID zasobu. Status ma zamknięty zbiór alive/dead/missing/unknown i osobne approved=true. Błędne statusy, referencje i niezatwierdzone obrazy blokują build demo. To rozszerzenie walidatora prototypu, nie deklaracja wdrożenia produkcyjnej bramki.

Opis związku z lokacją jest polem description dotychczasowej krawędzi located_in. Odwrócona lista wybiera wyłącznie źródła kind=character; organizacja powiązana z przystanią nie tworzy automatycznie powiązań jej członków. Nie dodano drugiego rejestru relacji. Obie lokacje Miry prowadzą do jednego kanonicznego adresu. „Pokaż na mapie” jest wyłączonym przyciskiem z wyjaśnieniem, bez requestów Maps.

Aktualne testy: build PASS; `npm run wiki:test` **7/7 PASS** (w tym statusy/zgoda, zatwierdzone zasoby i path traversal, zgodność treści Markdown i relacji odwrotnych). `scripts/wiki-entity-browser-check.cjs` PASS w headless Edge: 1440×1000, 390×844 i reflow przy 320×720; załadowane ilustracje, brak overflow, warianty brakujących danych, linki postać↔lokacja i działanie bez JS. Dotychczasowy `scripts/wiki-browser-check.cjs` ponownie PASS. Brak błędów JS.

Nowy test uruchamia się przy działającym serwerze z tymi samymi zmiennymi Playwright/Edge co wcześniejszy:

```powershell
node scripts/wiki-entity-browser-check.cjs
```

Przy uruchomieniu próba startu drugiego serwera zwróciła EADDRINUSE. Zweryfikowano, że już działający lokalny serwer udostępnia zaktualizowane strony, i użyto go do testów. Nie zatrzymywano istniejącego procesu użytkownika. Jeśli serwer już działa, wystarczy odświeżyć stronę po `npm run wiki:build`.

Historyczne screenshoty wariantów postaci i lokacji sprawdzono w poprzednim odbiorze; nie są dołączone do kandydata.

Pliki zmienione w tym rozszerzeniu: `src/wiki-ui/model.cjs`, `demo.json`, `wiki.scss`, `wiki-preview.config.cjs`, `prototype/site/entities.njk`, `tests/wiki/demo.test.mjs`, `docs/WIKI_UX_SPEC.md`, `docs/WIKI_UI_PROTOTYPE.md`, `docs/PROJECT_STATUS.md`. Dodano `src/wiki-ui/templates/{character-profile,location-profile}.njk`, `src/wiki-ui/assets/{mira,lea,harbor}.svg`, `scripts/wiki-entity-browser-check.cjs` i 10 powyższych PNG. Dotychczasowy skrypt przeglądarkowy odświeżył sześć wcześniejszych screenshotów regresji w wiki-layout-2.

Ograniczenia: nadal wyłącznie fixture demonstracyjny; bez implementacji Maps/Lore Managera i bez produkcyjnego indeksowania. Nie wykonano testów na rzeczywistych telefonach i czytnikach ekranu ani pełnego WCAG. Nie wykonano deploymentu ani push, nie zmieniono vaulta/.obsidian ani istniejących notatek.


## M1A.2 — stan zasilania prototypu

Przygotowano odrębny adapter metadanych i walidację w src/helpers/wiki/publication.cjs, bez podłączenia rzeczywistych danych do tego UI. Rejestry zgód są puste, więc publication:validate/data na aktualnym repo mają odmówić działania; to oczekiwane zabezpieczenie. Stare polecenia produkcyjne blokują generowanie wszystkich kanałów, a nie tylko search. Nie zmieniono żadnego z przyjętych komponentów UX, fixture demo ani klienta wyszukiwania. Build demo i 7 testów pozostają PASS. Wyniki 13 testów bezpieczeństwa, lista kontrolna DM i luki: [PUBLICATION_READINESS.md](PUBLICATION_READINESS.md).

## Lokalny podgląd zatwierdzonej mapy

Od 2026-10-22 prototyp zawiera jeden odizolowany widok z aktywnych rejestrów DM: `/dnd/wiki/neverwinter/`. Link jest w katalogu Mapy. Podgląd używa zawężonego adaptera, który sprawdza aktualny hash notatki i obrazu, a do strony przekazuje tylko zatwierdzony wpis, DTO mapy i obraz. Demo search nie indeksuje tych danych; pozostałe ekrany oraz wyszukiwarka nadal używają wyłącznie fikcyjnych fixtures. Artykuł Markdown nie jest jeszcze renderowany.

Mapa zachowuje 11 punktów i zaakceptowaną politykę nieaktywnego linku, gdy nie ma zatwierdzonego celu. Na desktopie lista znaczników stoi obok mapy, na telefonie pod nią. Kliknięcie znacznika pokazuje opis. Strona działa na tym samym neutralnym motywie i shellu prototypu, ale jawny komunikat oznacza ją jako lokalny podgląd. Serwer `wiki:dev` działa wyłącznie na `127.0.0.1:8081`; zrzuty kontrolne pozostają w ignorowanym `.wiki-preview/`.

Aktualna walidacja: `npm run wiki:build`, `npm run wiki:test` 8/8 oraz `npm run publication:test` 48/48. Headless Edge 1440/390 px: 11 punktów, opis otwierany kliknięciem, brak linków do niezatwierdzonego celu, brak błędów JS i poziomego overflow. Adapter lokalny nie oznacza zgody na pozostałe 102 materiały ani gotowości kanałów produkcyjnych; blokada builda Digital Garden pozostaje aktywna.
