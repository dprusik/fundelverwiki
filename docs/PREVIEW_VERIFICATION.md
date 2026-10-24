# Weryfikacja Vercel Preview — 2026-10-24

Sprawdzana wersja: `5e5e3ca3cda6d9244a139d2c7f23424f65967700`, gałąź `feat/wiki-layout-2`.

Preview: https://fundelverwiki-2nru95b0l-dprusiks-projects.vercel.app/ . Wdrożenie Vercel: `CEp9nPQaXoJv5kQurKjMFg2e1Cdy`, wcześniej potwierdzone Ready. Produkcja nie była zmieniana. Wydajność portretów pozostawiono do oceny graczy zgodnie z decyzją DM.

## Zdalny Preview — zalogowana przeglądarka Vivaldi

| Kontrola | Wynik |
|---|---|
| Katalog przedmiotów | PASS: 5 widocznych kart, zachowane kanoniczne linki |
| Panel desktop | PASS: zwijanie i ponowne rozwijanie; Ctrl+K przy zwiniętym panelu |
| Wyszukiwanie | PASS: Zaerith daje postać i organizację; nieistniejące hasło daje komunikat braku wyników |
| Organizacja | PASS: Bregan d'arthe ma opis i odnośniki do Zaerith oraz Quentina |
| Pusty katalog | PASS: Kronika pokazuje 0 wpisów, komunikat i odnośnik do pełnego spisu |
| Mapy | PASS: katalog z jedną mapą; atlas Neverwinter z 11 znacznikami |
| Mapa i artykuły | PASS: wybór Zamek Never → opis → artykuł lokacji → powrót do atlasu; zachowany link do artykułu miasta |
| Nieistniejący adres | PASS: `/preview-verification-not-found/` wyświetla własną stronę błędu z nawigacją, Ctrl+K i odnośnikiem do Start |

Ostatnia kontrola potwierdza widok strony błędu, nie pomiar statusu HTTP w uwierzytelnionej odpowiedzi. Podczas wcześniejszego odbioru tej samej wersji potwierdzono też modal oryginalnego portretu, warianty WebP/srcset oraz noindex w zdalnym HTML; nie powtarzano tych kontroli w tym przeglądzie.

## Lokalny artefakt aktualnego commita

Nie utożsamiamy tych wyników z pełną zdalną regresją. Uwierzytelnienie Preview sprawia, że zwykły anonimowy klient HTTP nie widzi stron wiki; nie eksportowano sesji/cookies przeglądarki do narzędzi testowych.

- `VERCEL_ENV=preview npm run publication:build`: PASS, 105 plików, 38 tras, 28 rekordów search/graph, 19 zatwierdzonych oryginałów i 38 pochodnych. Końcowy walidator sprawdza komplet plików, referencje, hashe i tryb noindex.
- `wiki-approved-browser-check.cjs` przez istniejący wrapper integracyjny: PASS, **111 kombinacji stron i viewportów** (1440, 390, 320 px), zatwierdzone artykuły, katalogi, obrazy, lokalne linki, brak overflow, Ctrl+K, drawer, podstawowy fallback bez JS. Serwowano `.publication-build/production` na loopback 8088; po testach serwer zatrzymano.
- Test wyszukiwania: PASS na **3 viewportach** po dostosowaniu końcowego scenariusza do wydania publikacyjnego. Sprawdzono polskie znaki, tytuł/alias/treść, fragmenty wyników, błąd pobrania i retry, tekst HTML/XSS, niedopuszczone URL, brak wyników, Escape/fokus, opóźnioną odpowiedź oraz wyszukiwanie na stronie 404.

Oryginalny `wiki-search-browser-check.cjs` zakończył się timeoutem w końcowym scenariuszu po wejściu na `/demo/` (linia 110). Ten test jest przeznaczony dla prototypu, a kontrolowany renderer celowo nie publikuje demo. Zachowano oryginalny test bez zmian. Lokalny adapter w ignorowanym `.publication-review/search-production-check.cjs` korzysta z aktualnego indeksu artefaktu i sprawdza zamiast tego HTTP 404 dla `/demo/` oraz globalne szukanie wyłącznie w zatwierdzonym indeksie. Pozostałe scenariusze oryginalnego testu wykonano bez pomijania. Adapter serwera również pozostaje w ignorowanym katalogu.

## Ustalenia i otwarte punkty

Nie stwierdzono błędu blokującego w sprawdzonym zakresie. Pozostały drobne nieaktualne etykiety UI: stopka zdalnej wiki mówi „podgląd lokalny”, a atlas zawiera komunikat „Produkcyjny build pozostaje zablokowany”. Są to teksty odziedziczone po prototypie; obecny generator produkcyjny istnieje, a blokada dotyczy starego kanału Digital Garden. W tym przeglądzie nie zmieniano szablonów ani nie wykonywano deploymentu.

Otwarte: feedback graczy, pierwsze ładowanie portretów w ich sieciach, fizyczne telefony/Safari, pełny audyt dostępności i osobny odbiór produkcji. Testy mobilne opisane powyżej były emulacją w Edge headless. Ten raport nie zastępuje publikacyjnych zgód, audytu bezpieczeństwa ani akceptacji release/manifestu.

## Domknięcie wskazanych poprawek — 2026-10-24

Powyższy raport opisuje historyczny odbiór zdalnego `5e5e3ca`. Podczas końcowych poprawek zweryfikowano również status dokumentu w Network uwierzytelnionej przeglądarki: `/preview-verification-not-found/` na tym Preview rzeczywiście zwraca **404 Not Found** (typ `document`). Reguł Vercel nie zmieniano. Nie pomylono tej odpowiedzi z anonimowym przekierowaniem logowania ani zapytaniem `fetch` paska Vercel.

Nieaktualne etykiety poprawiono lokalnie. Publikacyjny scenariusz wyszukiwania jest teraz normalnym trybem `scripts/wiki-search-browser-check.cjs --publication`, uruchamianym przez `npm run publication:test:browser`; nie korzysta z adapterów ignorowanych ani ze stron demo. Odrębny tryb prototypu nadal zachowuje test izolacji demo. Dalsze wyniki i dokładna instrukcja wydania: [PRODUCTION_SWITCHOVER.md](PRODUCTION_SWITCHOVER.md). Końcowych zmian jeszcze nie wysłano do Vercel ani do Production.

## Dodatkowe poprawki graficzne po odbiorze - 2026-10-24

Lokalnie podmieniono róże wiatrów w menu bocznym na zoptymalizowany asset na bazie `rosedim.png`. Kafle katalogów postaci pokazują portrety z zatwierdzonych artykułów; kafle sześciu przedmiotów pokazują kadry samej ilustracji wycięte z zatwierdzonych kart. Kadry nie zawierają tytułu ani tekstu karty. Nie zmieniono oryginalnych 19 zasobów, decyzji DM, relacji, permalinków ani vaulta.

Build kandydata produkcyjnego PASS: 112 plików, 38 tras, 28 rekordów search/graph, 19 oryginałów, 38 wcześniejszych wariantów, 6 kadrów katalogowych i 11 znaczników. Testy: wiki/org 22/22, publikacja 74/74 oraz przeglądarka PASS. Zmiany nie zostały jeszcze wysłane do Preview.

## Końcowe sprawdzenie kandydata — 2026-10-24

Po wycofaniu z publikacji wpisu Gerwazego i jego portretu oraz zatwierdzeniu poprawionej pisowni „Fulmareth” aktualny kandydat ma 27 wpisów i 18 oryginalnych zasobów publicznych. Źródłowe `rosedim.png` i jawnie dopuszczony pochodny `rosedim.webp` są śledzone w repozytorium; generator emituje wyłącznie pochodny WebP. Mechanizmy bramki produkcyjnej pozostały bez zmian.

Ponowna lokalna weryfikacja: `wiki:build` PASS; wiki i organizacje 23/23; `publication:test` 75/75. Build Preview i Production PASS (105 plików, 37 tras, 27 rekordów wyszukiwania/grafu, 18 oryginalnych zasobów, 33 warianty zoptymalizowane, 6 miniaturek przedmiotów, 11 znaczników). `publication:test:browser` PASS dla obu trybów: 108 kontroli stron, wyszukiwanie i GET/HEAD 404, 44 przejścia atlas–lokacja, widoki mobilne, miniatury i powiększenia. Pierwsza próba bez wskazania przeglądarki zakończyła się błędem uruchomienia scenariusza; ponowienie w Edge headless PASS.

Ten wynik dotyczy lokalnego artefaktu. Odpowiadający mu zdalny Preview i ochrona `noindex`/robots wymagają potwierdzenia po pushu końcowego commita.

## Deployment Vercel i Node 24 — 2026-10-24

Push commita `f2caa6c0c0035dd63fd13f91de952645f98cf5f4` uruchomił Vercel Preview `Ztxph74Xusge4Uhjo3GutC1SzCvQ`; GitHub status Vercel zmienił się z `pending` na `failure`. Logów nie udało się pobrać, bo lokalny Vercel CLI nie ma uwierzytelnionej sesji. Deklarację `engines.node` podniesiono do `24.x` (Vercel wspiera tę wersję jako domyślną). Po czystym `npm ci` na Node 24.22.0/npm 11.19.1 ponownie przeszły buildy wiki, Preview i Production oraz zestawy wiki (20), organizacji (3), publikacji (75) i oba przeglądarkowe. Wersja Node nie została potwierdzona jako przyczyna poprzedniej awarii; nowy zdalny Preview wymaga deploymentu po wypchnięciu poprawki.

## Location tile images

`src/wiki-ui/templates/approved-card.njk` reuses the same approved illustration as a thumbnail on location tiles. Parent location directory tiles use that illustration too. The current approved publication data contains no location illustration asset, so there are currently 0 location thumbnails; unapproved or inferred images are not used.


## Portrait catalog sizing and section routes

Character catalog portraits now use the faction-card footprint (96 x 116 px), object-fit cover, and the same top-biased crop/scale as portraits in article headers. The Playwright check asserts dimensions and crop settings.

The visible section labels are Polish. Their section URLs remain `/catalog/<id>/`: `catalog.cjs` defines English technical IDs (for example `characters`) and the page/navigation templates build the URL from that ID. Article URLs come separately from `src/wiki/public-entries.json` and preserve the existing Obsidian permalinks such as `/postacie/bekrit/`. Localizing section routes later should keep the current `/catalog/...` URLs resolvable, for example through redirects.


## Final sidebar copy

Updated the sidebar rail note to the requested campaign line: "To kiedy level up?". This is included in the follow-up commit for the final Preview.

## Aktualizacja kandydata Preview — 2026-10-24

Po końcowym odbiorze zaktualizowano wpis Bekrita (ten sam permalink i zatwierdzony portret). Na polecenie DM wycofano z publicznej projekcji wpis Gerwazego oraz jego nieużywany gdzie indziej portret; notatka źródłowa i plik obrazu pozostały w repozytorium. Wynikowy kandydat zawiera 27 artykułów, 18 oryginalnych publicznych zasobów, 33 zoptymalizowane warianty, 6 miniatur przedmiotów i 11 znaczników atlasu. Bramka legacy nie została zmieniona.

Weryfikacja lokalna bieżącego kandydata: `wiki:build` PASS, `wiki:test` 20/20 PASS, `publication:build` PASS (105 plików, 37 tras), `publication:test` 75/75 PASS i `publication:test:browser` PASS (108 kontroli artykułów, wyszukiwanie na 3 viewportach, 44 przejścia atlasu, widoki mobilne, obrazy). Te wyniki dotyczą lokalnego artefaktu; zdalny Preview wymaga potwierdzenia po utworzeniu deploymentu z finalnego commita.
