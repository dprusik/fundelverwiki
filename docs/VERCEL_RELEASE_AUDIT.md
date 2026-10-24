# Audyt i procedura wydania Wiki Layout 2.0 na Vercel

Data audytu: 2026-10-24. Stan: **NO-GO dla produkcji; GO wyłącznie dla lokalnego preview**.

## Ustalenia

- `npm run publication:build-preview` używa adaptera `prepareLocalArticles()` i osobnych szablonów `production/site/`. HTML, katalogi, search, graph, sitemap, RSS i obrazy powstają z zatwierdzonych DTO, jawnych relacji i zatwierdzonych bajtów assetów. Pending i denied pozostają poza projekcją.
- Sanitizator Markdown ma `html: false`, sprawdza każdy link i obraz względem bieżących zgód, odrzuca aktywne HTML, nierozpoznane wikilinki i niezaufane cele. Nie jest to sanitizator dowolnego HTML; szablony Nunjucks pozostają częścią audytowanego kodu.
- Renderer preview ma dokładną allowlistę tras i plików, sprawdza hashe assetów/runtime, brak symlinków, komplet search/graph i noindex. Rozszerzono kontrolę o host kanoniczny sitemap/feed, HTML `srcset` i CSS `url()`.
- Jedynym hostem akceptowanym przez obecną konfigurację generatora jest `https://fundelverwiki.vercel.app`. Host stagingowy wymaga osobnej, jawnej konfiguracji przed testami stagingowymi; zmienna środowiskowa nie może wybrać dowolnej domeny.
- Motyw Dark Archive ustawia DragonBanner równocześnie jako banner i logo menu (`src/wiki-ui/campaign-theme.json`). Maska Bekrita jest kopiowana do środowiska prototypu, ale nie jest wskazana przez aktywny motyw ani szablony wydania. Zatwierdzona karta przedmiotu Bekrit's Mask to inny plik.
- DragonBanner i maskę skopiowano bajtowo do `src/site/img/user/lorekeeper/`, aby istniejący panel DM mógł je ocenić osobno. Obie pozycje mają stan `pending`; nie zmieniono `public-assets.json`, `public-system.json` ani historii decyzji. Hash DragonBanner: `428745c881c0de3e3ea48e1ada4b03db6091971545936b05e499b3b30632c5e3`. Hash maski: `64304fec70a322c86efdf23e1747dac9969a673833b0def3a206b824b6bd1973`.
- W `wiki-production.config.cjs` DragonBanner pojawia się dopiero, gdy jego dokładny URL występuje w zweryfikowanym `local.files`; brak zgody oznacza brak grafiki w HTML i output. Maska nie jest włączana do motywu. Po indywidualnym zatwierdzeniu bannera kolejny kontrolowany preview pokaże banner i logo. Wymaga to ponownego testu i walidacji hashy.
- `package.json` deklaruje Node `22.x`; bieżące testy wykonano na Node `v24.22.0`, npm `11.19.1`. `npm ls --depth=0` nie wykazał brakujących zależności. Lockfile używa npm lockfile v3, ale Vercel ma `npm install`, nie reprodukowalne `npm ci`. Nie wykonano czystej instalacji na Node 22.
- `vercel.json` nadal wskazuje `npm run build` i `dist`. Ten kanał wchodzi w `assertProductionBuildAllowed()` i pozostaje zablokowany. Nie ma osobnego, certyfikowanego projektu/configu release ani reguł cache. Generator preview zawsze tworzy `noindex,nofollow` i `Disallow: /`.
- RSS jest poprawny, ale pusty: żaden zatwierdzony wpis nie ma daty `published_at`. Ostatni preview ma 65 plików, 38 tras, 28 rekordów search, 28 węzłów graph, 17 zatwierdzonych assetów i brak dwóch pending dekoracji.

### Decyzje DM dla assetów

Do osobnego przeglądu w `npm run publication:review` → **Zasoby**:

| Materiał | ID review | SHA-256 | Użycie |
|---|---|---|---|
| DragonBanner | `asset-1256c741d3f2a0c7d642` | `428745c881c0de3e3ea48e1ada4b03db6091971545936b05e499b3b30632c5e3` | Aktywny motyw: banner i miniatura logo |
| Maska Bekrita | `asset-7a71166caed13c72f914` | `64304fec70a322c86efdf23e1747dac9969a673833b0def3a206b824b6bd1973` | Nie jest obecnie używana przez motyw; osobny kandydat do późniejszego użycia |

Każdy asset wymaga niezależnej decyzji DM, publicznego alt i zgodnego hash. Samo dodanie do review nie zatwierdza ani nie publikuje materiału. Panel i jego lokalne magazyny decyzji pozostają prywatne.

## Konfiguracja release — wymagany kontrakt

Nie przełączono `vercel.json` i nie dodano komendy wdrożeniowej. Przed jej utworzeniem wymagany jest osobny, recenzowany kontrakt release:

1. Osobna komenda/config projektu release wskazuje wyłącznie nowy generator; Vercel nie może uruchamiać starego Eleventy/Digital Garden. Legacy `assertProductionBuildAllowed()` zostaje nietknięty.
2. Build przyjmuje wyłącznie zatwierdzony model, aktywne hashe i osobno zatwierdzone assety. Pending/denied nie są kopiowane ani wykorzystywane w HTML, search, graph, sitemap, feed, CSS, JS ani innych kanałach.
3. Konfiguracja jawnie wiąże: `https://fundelverwiki.vercel.app`, canonical origin, wersję Node, lockfile, commit źródłowy, hashe rejestrów i zatwierdzony renderer. Staging używa odrębnego hosta i nie jest dopuszczany przez produkcyjną allowlistę.
4. Dotychczasowe permalinki są niezmiennym wejściem. Każda trasa jest porównywana z aktywnym rejestrem i poprzednim manifestem. Zmiana lub kolizja blokuje build.
5. `noindex`/`Disallow: /` zostają wyłączone wyłącznie w jawnie wybranym trybie release; tryb preview pozostaje zawsze nieindeksowalny. Build fail-closed przy braku trybu lub nieznanym hoście.
6. Przed komendą release DM zatwierdza aktualną konfigurację, wynik niezależnego audytu oraz dokładny manifest hashy artefaktu. Akceptacja wiąże się z jednym commitem, lockfile, rejestrami, domeną i manifestem; zmiana któregokolwiek elementu unieważnia akceptację.
7. Artefakt jest niezmienny i odtwarzalny: przechowuje commit, wersję Node/npm, hash lockfile, rejestrów, konfiguracji, plików i podsumowanie walidatora poza katalogiem serwowanym. Release nie kopiuje cache'u roboczego.

Katalog publiczny musi przejść allowlistę plików i tras, sprawdzenie permalinków, same-origin w XML, referencji HTML/CSS/srcset, assetów, search, graph, feedu, metadanych robots oraz skan canary pending/denied. Zbiór wyjściowy i manifest są wejściem do osobnej akceptacji, nie automatycznym pozwoleniem.

## Plan testów przed GO

1. Odtworzyć zależności przez `npm ci` na wspieranym Node 22.x i potwierdzić brak diffu lockfile.
2. Uruchomić testy publication/wiki, regresje przeglądarkowe istniejących layoutów oraz nowy test produkcyjnego outputu.
3. Zbudować staging na osobnej domenie z `noindex`, `Disallow: /`, bez publicznego aliasu; sprawdzić desktop/mobile, search, profile, lokacje/mapy, nawigację, cache i canonical URL.
4. Uruchomić skan wszystkich plików outputu oraz canary pending/denied we wszystkich kanałach. Sprawdzić, że zatwierdzone obrazy Dark Archive są dokładnie tymi bajtami, które obejrzano i zaakceptowano.
5. Odtworzyć dwa buildy z identycznego commita, Node, lockfile, rejestrów i konfiguracji; porównać manifesty. Nie ignorować timestampów bez jawnej normalizacji.
6. Wykonać niezależny przegląd źródeł, końcowego artefaktu i zachowania hostingu. Dopiero wtedy zebrać osobne akceptacje konfiguracji/audytu/artefaktu i włączyć komendę release.

## Cache, wydanie i rollback

Przed release trzeba dodać osobną konfigurację projektu Vercel z jawnymi nagłówkami: HTML krótko cache'owany lub rewalidowany, pliki o hashowanych nazwach immutable, a search/graph/sitemap/feed rewalidowane. Obecny output używa nazw stałych (`approved-search.json`, `graph.json`, `sitemap.xml`, `feed.xml`), więc bezpieczny wariant początkowy to `Cache-Control: no-cache, must-revalidate` dla tych plików i HTML. Cache nie zastępuje natychmiastowego wycofania: nie wolno w nim polegać przy cofnięciu zgody.

Procedura wdrożenia po uzyskaniu GO: utworzyć staging deploy z przypiętego commita i zatwierdzonej konfiguracji; zaakceptować staging; zbudować i zweryfikować dokładny release artefakt; odnotować jego manifest oraz akceptację DM; wdrożyć ten sam, niezmienny wynik do projektu produkcyjnego i dopiero po smoke testach przypisać domenę. Nie używać aliasu produkcyjnego przed kontrolą domeny/canonical/cache.

Rollback przywraca poprzedni deployment tylko wtedy, gdy ponowna walidacja potwierdzi, że jego źródła, decyzje DM, hashe, permalinki i manifest nadal są aktualne. Wycofana zgoda lub denied unieważniają stary artefakt; wtedy należy zbudować nowy bez niedozwolonego materiału zamiast przywracać historyczny output. Po rollbacku sprawdzić alias, cache, sitemap, search i publiczne URL-e.

## Decyzja

**NO-GO na Vercel.** Brakuje decyzji DM dla DragonBanner (konieczny do odtworzenia wyglądu motywu), konfiguracji i komendy release, stagingowego hosta, czystej instalacji Node 22, jawnych reguł cache, reprodukowalnego manifestu i akceptacji konkretnego artefaktu. Pięć decyzji `denied` i 67 wejść `pending` nadal blokują pełną walidację. Lokalny preview pozostaje bezpiecznym, nieindeksowalnym testem i nie jest kandydatem wdrożeniowym.

Nie wykonano push, deploymentu, zatwierdzeń DM ani zmian w vault/.obsidian.

### Testy i ograniczenia walidacji

Końcowe wyniki tej iteracji: `publication:test` 70/70, `wiki:test` 19/19, `publication:build-preview` PASS (65 plików / 38 tras) i `wiki:build` PASS (58 stron). Jedenaście istniejących regresji Playwright/Edge przeszło na izolowanym UI preview: ogólny desktop/mobile, encje, search, zatwierdzone artykuły, portrety, mapa↔lokacje, mapa mobile, sticky header, zwijane katalogi, organizacje i Dark Archive. Test katalogu uwzględnia widoczność Bekrit's Mask.

Testy browserowe dotyczą UI `.wiki-preview`; nie są testem konfiguracji Vercel, cache hostingu ani niezależnym dowodem bezpieczeństwa końcowego HTML nowego preview. Walidator wiąże search/graph/RSS/sitemap z zatwierdzonym modelem i ogranicza HTML do zatwierdzonych tras/zasobów, ale nie porównuje całego renderowanego HTML artykułu bajt po bajcie z niezależnym oczekiwanym HTML. Dlatego końcowy artefakt nadal wymaga przeglądu i jawnej akceptacji manifestu, a staging pozostaje wymagany. Pełne `publication:validate` BLOCKED: 67 `UNAPPROVED_INPUT`, 5 `DENIED_INPUT`.

Korekta wcześniejszego opisu w tym dokumencie: host nie jest już dowolnym HTTPS — bieżący generator ogranicza go do `https://fundelverwiki.vercel.app`. DragonBanner i maska są obecnie pending i nie trafiają do outputu; po aktywnej zgodzie DragonBanner jest warunkowo włączany jako banner/logo. Maska nie jest używana przez aktualny motyw.
Dodatkowa bramka techniczna: `src/wiki/public-system.json` nadal nie zawiera aktywnych zgód, a istniejący inventory DM skanuje `src/site`, nie nowy renderer `production/site/` ani jego konfigurację/skrypty. Audyt kodu wykonano niezależnie, ale nie istnieje jeszcze trwały, zatwierdzony certyfikat dla kompletu wejść generatora. Trzeba go ustanowić przed release razem z akceptacją manifestu końcowego HTML.
Końcowe utwardzenie po niezależnym review: odrzucane są również zewnętrzne `form action`, linki `ping` i `meta refresh`; testy tych przypadków są częścią 70 testów publikacji. Pełna treść HTML artykułu nadal musi być oceniona w konkretnym manifeście release, jak wskazano wyżej.
## Dokumentacja Vercel użyta do planu

- [Environments](https://vercel.com/docs/deployments/environments) — rozdziela Local, Preview i Production; opisuje też Custom Environments, zależne od planu.
- [Cache-Control headers](https://vercel.com/docs/caching/cache-control-headers) oraz [vercel.json headers](https://vercel.com/docs/project-configuration/vercel-json) — źródła konfiguracji i priorytetów cache; po wdrożeniu trzeba sprawdzić rzeczywiste nagłówki odpowiedzi.
- [vercel rollback](https://vercel.com/docs/cli/rollback) — rollback i ponowne promowanie deploymentu. Ten mechanizm hostingu nie zastępuje ponownej walidacji zgód i artefaktu.
## Aktualizacja po decyzji DM — 2026-10-24

DM zatwierdził oba materiały przez istniejący lokalny review, z indywidualnym opisem alt i importem zatwierdzonego diffu. DragonBanner (`asset-1256c741d3f2a0c7d642`, SHA-256 `428745c881c0de3e3ea48e1ada4b03db6091971545936b05e499b3b30632c5e3`) jest używany jako banner i logo Dark Archive. Maska Bekrita (`asset-7a71166caed13c72f914`, SHA-256 `64304fec70a322c86efdf23e1747dac9969a673833b0def3a206b824b6bd1973`) nie należy do aktywnego motywu, lecz może być publikowana jako zatwierdzony asset. Pozostałe decyzje i materiały nie zostały zmienione.

Po imporcie: `publication:build-preview` PASS (67 plików, w tym oba assety; 38 tras; 28 rekordów search i graph; 19 zatwierdzonych assetów), `publication:test` 70/70 PASS, `wiki:test` 19/19 PASS. `publication:validate` nadal BLOCKED (65 `UNAPPROVED_INPUT`, 5 `DENIED_INPUT`). Build preview nadal ma `noindex,nofollow` i `Disallow: /`; żaden push ani deployment nie został wykonany. Ocena produkcyjnego Vercel pozostaje **NO-GO** do czasu spełnienia bramek audytu i release.

## Aktualny odbiór produkcyjnego generatora — 2026-10-24

Wykorzystano istniejący zatwierdzony adapter i renderer. `npm run publication:build` tworzy produkcyjny output w `.publication-build/production`; komenda preview nadal jest odrębna i nieindeksowalna. `vercel.json` kieruje Vercel do `npm ci`, tej komendy i tego katalogu, dodaje konserwatywne nagłówki cache oraz zachowuje obecne routingi. Wersja Node pozostaje `22.x` z `package.json`; build lokalny zweryfikowano na Node 24.22.0, bez lokalnej instalacji Node 22.

Aktualny build PASS: 67 plików, 38 tras, 39 canonical HTML, 28 wpisów search, 28 węzłów grafu, 19 zatwierdzonych assetów i atlas Neverwinter z 11 znacznikami. W plikach HTML nie ma `noindex,nofollow`, `robots.txt` wskazuje sitemapę i zezwala na indeksowanie, oba zasoby Dark Archive zachowują zatwierdzone hashe, a wynik nie zawiera pending/denied canary. `publication:test` 72/72 oraz `wiki:test` 19/19 PASS.

`publication:validate` nadal zwraca 65 `UNAPPROVED_INPUT` i 5 `DENIED_INPUT` dla pełnego inventory. To nie zmienia zakresu kontrolowanego buildu: renderer korzysta z zatwierdzonej projekcji i nie wymaga zmiany ani ponownego przeglądu tych decyzji. Zachowano stary `assertProductionBuildAllowed()` i nie dodano certyfikatów ani osobnego systemu release. Konfiguracja repozytorium jest gotowa do wykorzystania przez istniejący projekt Vercel, ale nie sprawdzono faktycznego deployu, ustawień konta ani zachowania domeny po wdrożeniu. Nie wykonano pushu ani deploymentu.
