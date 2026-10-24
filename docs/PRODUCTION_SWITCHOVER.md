# Wiki Layout 2.0 — przejście na Production

Stan: 2026-10-24. Zmiany końcowe są przygotowane lokalnie na `feat/wiki-layout-2`, względem `5e5e3ca`. Nie wykonano ich commita, pushu ani deploymentu. Działający zdalny Preview `5e5e3ca` nie zawiera jeszcze końcowych poprawek tekstów i testów opisanych poniżej.

## Co zostało przygotowane

- Stopka Preview: „Zatwierdzone treści · wersja podglądowa”. Stopka Production nadal wskazuje wydanie publiczne.
- Atlas: „Zatwierdzona mapa · 11 znaczników.”, bez nieaktualnego komunikatu o zablokowanym buildzie. Walidacja mapy i nieaktywnych odnośników nie została zmieniona.
- `npm run publication:test:browser` uruchamia stały zestaw na wygenerowanym artefakcie: artykuły i katalogi, wyszukiwanie publikacyjne, atlas/lokacje, mobilną mapę i zoptymalizowane ilustracje. Korzysta ze zwykłej zależności dev `playwright` (1.64.1 z lockfile), bez `.integration-checks` i `.publication-review`.
- Wyszukiwanie publikacyjne ma osobny tryb `--publication`: rzeczywisty indeks zatwierdzonych wpisów, brakujące strony z HTTP 404 dla GET/HEAD i działające szukanie na 404. Nie potrzebuje `/demo/`. Tryb prototypu zachowuje dotychczasowy test izolacji demo.
- Zachowano 28 wpisów z kanonicznymi URL, 19 oryginalnych zasobów bajt po bajcie, 38 zoptymalizowanych grafik, 6 kadrów przedmiotów oraz atlas z 11 znacznikami. Notatki, rejestry zgód/odmów, relacje, oryginalny vault i mechanizmy bezpieczeństwa nie były zmieniane.

## Wyniki odbioru

Sprawdzono buildy Preview i Production oraz testy wiki i publikacji. Końcową kontrolę wykonano również na Node 22.23.4, zgodnym z `package.json` i Vercel. Przeglądarka: Edge headless, Playwright 1.64.1. Wyniki końcowego uruchomienia są zapisane także w `PROJECT_STATUS.md`.

| Kontrola | Wynik |
|---|---|
| Wiki i organizacje | 22/22 PASS (19 standardowych + 3 organizacji) |
| Publikacja | 74/74 PASS |
| Preview / Production | PASS: po 112 plików, 38 tras, 28 rekordów search/graph, 19 oryginałów + 38 pochodnych |
| Artykuły/katalogi w przeglądarce | 111 kontroli stron i szerokości: 1440/390/320 px |
| Wyszukiwanie publikacyjne | 3 szerokości: polskie znaki, alias/treść, retry, XSS/URL, zamknięcie opóźnionego wyszukiwania, GET/HEAD 404 |
| Atlas i lokacje | 44 przejścia atlas → lokacja → atlas, kanoniczne linki i fallback bez JS |
| Mobilna mapa | Pion/poziom/obrót, dotyk i klawiatura, 320/390/700/844/932/1024 px; desktop |
| Ilustracje | 6 widoków, małe warianty, oryginał dopiero po kliknięciu, modal/fokus, oryginał bez JS |
| Zdalne HTTP 404 | Potwierdzono na istniejącym Preview w uwierzytelnionej przeglądarce: dokument `/preview-verification-not-found/` ma **404 Not Found**, typ `document`, w panelu Network |

Zdalny pomiar dotyczy konfiguracji routingu obecnego Preview `5e5e3ca`; `vercel.json` pozostaje bez zmian. Nie jest to anonimowe przekierowanie do logowania ani status zapytania paska Vercel (`fetch`). Lokalny runner odrębnie sprawdza GET/HEAD dla adresu z końcowym `/` i brakującego `.html`, zwracając szablon wiki z kodem 404. Nie eksportowano cookies ani sesji przeglądarki.

Podczas instalacji zależności npm nadal zgłaszał wcześniej odnotowane 16 podatności. Nie aktualizowano niezwiązanych zależności i nie uruchamiano kolejnego audytu projektu. Fizyczne telefony i feedback graczy pozostają poza zakresem tego domknięcia.

## Powtórzenie testów

W repozytorium `fundelverwiki`, na Node 22.x, po `npm ci`:

```powershell
npm run wiki:build
npm run wiki:test
node --test tests/wiki/organization.test.cjs
npm run publication:test

# Windows: użyj zainstalowanego Edge; nie wymaga instalowania drugiej przeglądarki.
$env:WIKI_BROWSER_EXECUTABLE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

$env:VERCEL_ENV = 'preview'
npm run publication:build
npm run publication:test:browser

$env:VERCEL_ENV = 'production'
npm run publication:build
npm run publication:test:browser
Remove-Item Env:VERCEL_ENV
```

Bez Edge: zainstaluj przeglądarkę przez `npx playwright install chromium` i pozostaw `WIKI_BROWSER_EXECUTABLE` nieustawione. Runner przeglądarkowy sam uruchamia i zatrzymuje lokalny serwer na wolnym porcie. Testy dotyczą artefaktu, nie używają prywatnej sesji Vercel. Nie uruchamiaj równolegle dwóch buildów do `.publication-build/production`.

Nie używaj legacy `npm run build` do tego wydania. Jego zabezpieczenie pozostaje aktywne. Pełne `publication:validate` nadal odrzuca niezatwierdzone i odrzucone wejścia całego repo; nie trzeba nadawać im zgód, aby wydać zatwierdzoną projekcję.

## Instrukcja wydania — istniejący projekt Vercel

Poniższe czynności są instrukcją na później, nie zostały wykonane w tej iteracji. Najpierw potrzebna jest zgoda DM na commit/push końcowych poprawek, a przed krokiem 4 osobna zgoda na Production.

1. **Zapisz poprawki i uruchom finalne Preview.** Zacommituj wyłącznie pliki końcowych poprawek i dokumentacji, bez nieśledzonego `.codex/` oraz ignorowanych artefaktów. Wypchnij `feat/wiki-layout-2`. W istniejącym projekcie `dprusiks-projects/fundelverwiki` poczekaj na Preview ze statusem Ready dla nowego SHA. Nie wybieraj starego `5e5e3ca` jako końcowego wydania — nie ma tych poprawek.
2. **Sprawdź ten konkretny deployment.** Potwierdź stopkę, opis atlasu, wyszukiwanie, jeden portret z oryginałem, mapę i stronę 404. Preview musi nadal mieć `noindex,nofollow` i `robots.txt` z `Disallow: /`. Zapisz SHA, URL/ID finalnego Preview oraz raport. Lokalny manifest SHA-256 jest tworzony przez generator poza katalogiem strony, w `.publication-build/`; nie kopiuj go do publicznego outputu.
3. **Sprawdź ustawienia istniejącego projektu.** Repo: `dprusik/fundelverwiki`; Production Branch: `main`; Root Directory: pusty (`./`); Node: 22.x. Repozytoryjny `vercel.json` ma `installCommand: npm ci`, `buildCommand: npm run publication:build`, `outputDirectory: .publication-build/production`. `PUBLICATION_SITE_URL` powinno być nieustawione lub równe `https://fundelverwiki.vercel.app`. Nie ustawiaj go na adres Preview i nie nadpisuj ręcznie `VERCEL_ENV`. Zachowaj istniejące domeny oraz ochronę Preview. Zapisz ID dotychczasowego deploymentu Production.
4. **Po akceptacji DM scal finalną gałąź do `main`.** Otwórz PR `feat/wiki-layout-2` → `main`, sprawdź finalny diff i zgodność źródeł z zaakceptowanym Preview. Scal PR. To uruchamia nowy build **Production** w tym samym projekcie i podmienia przypisane domeny po udanym wdrożeniu. Nie twórz nowego projektu Vercel, nie zmieniaj DNS i nie kopiuj lokalnego outputu na hosting.
5. **Sprawdź nowy produkcyjny build.** Deployment musi mieć środowisko Production, właściwy commit z `main` i status Ready/Current. W logu oczekuj `mode: production-candidate`, 28 rekordów search/graph, 19 oryginalnych assetów, 38 wariantów obrazów, 6 kadrów przedmiotów i 38 tras. Aktualny lokalny output ma 112 plików. Nie zastępuj tej komendy legacy buildem, jeżeli coś zawiedzie.
6. **Sprawdź domenę produkcyjną.** Na `https://fundelverwiki.vercel.app/`: strona główna, wyszukiwanie, portret/powiększenie, dziennik Tergona, atlas i przejście do lokacji. Potwierdź canonical dla kanonicznych tras, brak `noindex,nofollow`, `robots.txt` z `Allow: /` i sitemapą. Nieistniejący adres musi zwracać HTTP 404 i szablon wiki. Przykładowe żądania bez logowania:

   ```powershell
   curl.exe -sS -D - -o NUL https://fundelverwiki.vercel.app/preview-verification-not-found/
   curl.exe -sS https://fundelverwiki.vercel.app/robots.txt
   ```

7. **Zapisz wynik i przekaż link graczom.** Zaktualizuj status projektu: commit/deployment, data, wykonane kontrole i ewentualne uwagi. Nie traktuj samego Ready jako potwierdzenia całej listy z kroku 6.

Zamiast scalenia istnieje też w Vercel opcja Deployments → `…` → **Promote to Production** dla finalnego Preview. Vercel dokumentuje pełny rebuild z produkcyjnymi zmiennymi. Preferujemy jednak ścieżkę przez `main`, aby stan repozytorium odpowiadał produkcji i kolejny push na `main` nie przywrócił starej wersji. Nie wystarczy przypisać produkcyjnej domeny do gotowego artefaktu Preview: ten zawiera buildowe `noindex` i blokadę robots. [Promowanie wdrożeń](https://vercel.com/docs/deployments/promoting-a-deployment), [środowiska Vercel](https://vercel.com/docs/deployments/environments).

## W razie problemu przy wydaniu

Jeżeli build się nie powiedzie, nie obchodź walidacji — popraw problem na gałęzi i ponownie przejdź finalne Preview. Zapisane ID poprzedniej produkcji pozwala ocenić możliwość Instant Rollback, lecz starszy artefakt musi nadal odpowiadać aktualnym decyzjom publikacyjnym DM. Legacy Digital Garden nie jest automatycznie bezpiecznym rollbackiem. Nie cofaj zgód/odmów ani bramki bezpieczeństwa w celu odzyskania starego wyglądu. [Instant Rollback](https://vercel.com/docs/deployments/promoting-a-deployment#instant-rollback).

## Dodatkowe poprawki wizualne - 2026-10-24

Menu boczne używa grafiki `rosedim.png` jako róży wiatrów. Do builda trafia zoptymalizowany WebP 320 px (37 612 B); róża SVG w hero pozostaje bez zmian. Kafle katalogu postaci pokazują zatwierdzone portrety. Sześć zatwierdzonych wpisów przedmiotów otrzymało osobne kadry samej ilustracji, bez tekstu karty. Oryginalne obrazy artykułów pozostają bez zmian.

Aktualny lokalny build: 112 plików, 38 tras, 28 rekordów search/graph, 19 oryginałów, 38 dotychczasowych wariantów, 6 kadrów katalogowych i 11 znaczników. Zmiany nie zostały wysłane do Preview.

## Location tile images

`src/wiki-ui/templates/approved-card.njk` reuses the same approved illustration as a thumbnail on location tiles. Parent location directory tiles use that illustration too. The current approved publication data contains no location illustration asset, so there are currently 0 location thumbnails; unapproved or inferred images are not used.


## Portrait catalog sizing and section routes

Character catalog portraits now use the faction-card footprint (96 x 116 px), object-fit cover, and the same top-biased crop/scale as portraits in article headers. The Playwright check asserts dimensions and crop settings.

The visible section labels are Polish. Their section URLs remain `/catalog/<id>/`: `catalog.cjs` defines English technical IDs (for example `characters`) and the page/navigation templates build the URL from that ID. Article URLs come separately from `src/wiki/public-entries.json` and preserve the existing Obsidian permalinks such as `/postacie/bekrit/`. Localizing section routes later should keep the current `/catalog/...` URLs resolvable, for example through redirects.


## Dependency advisory snapshot

`npm audit` checked against the npm registry on 2026-10-24: 16 findings (2 moderate, 13 high, 1 critical), with no dependency changes made. Main groups: critical `shell-quote` via `npm-run-all`; high `axios`/`follow-redirects`, `brace-expansion`, `js-yaml`, `markdown-it`, `sharp`, `image-size`, `picomatch`, `source-map-js`, `nanoid`, and Vite; moderate `@vitest/mocker`. The static Vercel build command invokes the publication generator directly and does not run `npm-run-all`, the legacy `axios` theme-fetch script, Vite, or Vitest. `markdown-it`, `js-yaml`, and `sharp` do execute in the build on approved content/assets, so malformed or hostile reviewed inputs could affect build availability. The generated site is static; these findings do not imply those package code paths run for visitor requests. npm reported no available fix for the current sharp/libvips advisory set. Full auto-fix was intentionally not run.


## Final sidebar copy

Updated the sidebar rail note to the requested campaign line: "To kiedy level up?". This is included in the follow-up commit for the final Preview.
