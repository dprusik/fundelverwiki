# Fundelver Wiki — stan M1A.1 / M1A.2

## Harrag i Rozjebany Lewiatan — kandydat publikacyjny, 2026-10-25

Na zgodę DM dodano artykuł Harraga pod /postacie/harrag/ i uzupełniono istniejący artykuł Rozjebanego Lewiatana, zachowując jego permalink oraz zatwierdzony opis znacznika atlasu. Dodano dwa jawnie zatwierdzone obrazy i wzajemne linki. Publiczne artykuły pomijają robocze sekcje oraz prywatne metadane szkiców; źródłowe szkice pozostały bez zmian.

Zgody zaktualizowano przez istniejący review/import wyłącznie dla dwóch artykułów i dwóch zasobów. Kandydat zawiera 27 artykułów, 19 oryginalnych zasobów i 11 znaczników. Pozostałe zgody, decyzje odmowne i wycofania nie zmieniły się. Rozszerzono istniejące generowanie wariantów obrazów o WebP, aby ilustracja lokacji otrzymała miniatury i powiększenie oryginału.

Kontrole lokalne: publication:test 86/86, wiki:test 20/20, wiki:build PASS i publication:build PASS (112 plików, 37 tras). Testy przeglądarkowe obejmują pełną regresję publikacji oraz oba artykuły, wzajemne linki, miniatury i powiększenia na desktop/mobile. Przygotowano lokalny commit; push i deployment nie zostały wykonane.

## Zakończenie odbioru manualnego UI — 2026-10-24

Użytkownik zgłosił wykonanie testów manualnych i przekazanie uwag po pozytywnej ocenie ostatniej iteracji portretów. Odbiór bieżącego układu uznajemy za zakończony w tym zakresie; nie rozszerzamy tego na pełny audyt dostępności ani produkcyjne bezpieczeństwo publikacji. Uaktualniono WIKI_LAYOUT_STATUS_AND_NEXT_STEPS.md, którego wcześniejszy raport nadal wymieniał brak opisu frakcji i niedokończony odbiór wizualny; oznaczono go jako historyczny.

Ten akapit opisuje plan sprzed końcowego przeglądu integracyjnego; jego status został uaktualniony w sekcji końcowego kandydata poniżej.

## Ilustracje, placeholdery i modal portretu — 2026-10-24

Na polecenie DM dodano wspólny entity-header dla demo i rzeczywistych artykułów: postać ma pionowy slot portretu obok tytułu/statusu/zatwierdzonego summary; lokacja ma szeroką ramkę ilustracji pod tytułem/summary. Bez grafiki slot zachowuje rozmiar i pokazuje neutralny symbol oraz Brak portretu/Brak ilustracji, zgodnie z nową decyzją DM (zastępuje wcześniejsze pomijanie pustej kolumny). Na mobile nagłówek postaci składa się do jednej kolumny. Krótkie opisy nie są automatycznie wyciągane z narracji. Adapter local-articles przekazuje wyłącznie istniejące zweryfikowane portrait_asset_id/illustration_asset_id, summary i jawny status; referencja bez aktualnej zgody na zasób nadal blokuje projekcję.

Po doprecyzowaniu DM istniejąca grafika w artykule każdej z 7 zatwierdzonych postaci jest traktowana jako portret. character-portrait.cjs wybiera pierwszy obraz z już zweryfikowanego HTML, wyłącznie gdy jego URL jest w zweryfikowanym local.files; jawny portret ma pierwszeństwo. Nie pobiera niczego z oryginalnego vaulta ani niezatwierdzonego repo. Samodzielny akapit tej grafiki znika tylko z prezentacji, aby nie powielać ilustracji; narracja, inne obrazy i źródłowy Markdown pozostają. Miniatura korzysta z cover i przybliżenia CSS 1.18; plik źródłowy nie jest kadrowany ani zmieniany. To jawne odstępstwo dla miniatury zaakceptowane przez DM, nie zmiana kart przedmiotów.

Kliknięcie portretu/ilustracji otwiera natywny dialog z pełną oryginalną grafiką (contain, bez transformacji) i odnośnikiem Otwórz oryginał. Escape, Zamknij i backdrop zamykają modal, fokus wraca do portretu bez skoku scrolla. Ctrl+K zamyka grafikę przed otwarciem wyszukiwarki, bez nakładania modali. Bez JS portret jest zwykłym linkiem do zatwierdzonego oryginału. Placeholdery pozostają dla lokacji bez ilustracji i dla demonstracyjnych brakujących portretów.

Build PASS (58 stron), wiki:test 18/18 PASS (w tym dobór zatwierdzonego obrazu, zachowanie narracji i późniejszych ilustracji), publication:test 60/60 PASS (dodatkowy test bezpiecznej projekcji metadanych nagłówka). Nowy wiki-portrait-browser-check PASS: 28 kontroli (7 postaci × desktop/mobile/pion/poziom/320 px), modal/original URL/proporcje/contain, Escape/przycisk/backdrop/klawiatura/fokus, przejście modal→search i link bez JS. Dotychczasowa regresja encji PASS; 111 kontroli zatwierdzonych artykułów PASS; motyw 24 warianty PASS. W teście motywu doprecyzowano selektor kontrastu do search-dialog po dodaniu drugiego dialogu. Zrzuty Bekrita i pełnej grafiki desktop/mobile sprawdzono wizualnie; w ignorowanym .publication-review. Bez zmian źródeł/zgód, commita/push/deploymentu; fizyczne telefony nie były testowane.

## Kafle lokacji w artykule Neverwinter — 2026-10-24

Na prośbę DM spis 11 lokacji w artykule miasta ma teraz tę samą prezentację kart co pozostałe katalogi. Użyto istniejącego collapsible-catalog: licznik, Rozwiń/Zwiń, startowo zwinięte powyżej 6 wpisów i wewnętrzny scroll do min(60dvh, 600px). Każda karta prowadzi do dotychczasowego kanonicznego artykułu. Atlas pozostaje osobnym widokiem.

Markdown i rejestry bez zmian. Nowa funkcja locationDirectoryView w warstwie prezentacji zastępuje wyłącznie kompletną samodzielną listę jawnych canonical links do zweryfikowanej grupy; zachowuje tekst przed i po liście. Nie zastępuje list z narracją, niestandardowymi etykietami, innym celem lub zagnieżdżonych. Nagłówek listy jest zastępowany kontrolką wyłącznie przy dokładnym dopasowaniu, pozostała treść jest zachowana. Jeśli listy nie rozpoznano, pozostaje oryginalne renderowanie artykułu.

Build PASS (58 stron), wiki:test 17/17 PASS z kontrolą zachowania narracji i nierozpoznanych list. Rozszerzony wiki-map-locations-browser-check PASS: 11 kart/kanonicznych linków, zwijanie, limit i klawiaturowe przewijanie, 44 przejścia atlas→lokacja→atlas w desktop/mobile/pion/poziom/320 px oraz otwieranie kart bez JS. Regresja zatwierdzonych artykułów 111 kontroli PASS. Mobilne zrzuty rozwiniętych kart sprawdzono wizualnie; pozostają w ignorowanym .publication-review. Bez zmian źródeł, zgód, vaulta, commita/push/deploymentu.

## Rozdzielenie artykułów lokacji i atlasu — 2026-10-24

Po zgodzie DM na wypróbowanie osobnych widoków Neverwinter pozostaje kanonicznym artykułem pod /dnd/wiki/neverwinter/: zawiera spis 11 miejsc i przycisk Otwórz mapę, bez osadzonego viewera. Osobny atlas /maps/neverwinter/ zawiera interaktywną mapę i znaczniki oraz odnośnik do artykułu, bez powielania jego Markdownu. Lokacje prowadzą do artykułu miasta, Mapy do atlasu. Każde z 11 miejsc zachowuje swój URL/odnośnik do miasta i otrzymuje prezentacyjny przycisk do mapy, na której ma zatwierdzony znacznik. Wyszukiwarka/globalny spis nadal wskazują kanoniczne artykuły; nie dodano drugiej notatki miasta ani lokacji.

Nowy atlas.cjs tworzy oba widoki wyłącznie z już zweryfikowanych local.maps. atlas-navigation.json wiąże przyjazny slug z trwałym owner_id; brak wpisu konfiguracji używa stabilnego map.id. Sprawdzane są niebezpieczne/zdublowane slugi i kolizje z kanonicznymi URL, a skonfigurowane ścieżki atlasu są zarezerwowane w adapterze. Konfiguracja bez zatwierdzonej mapy nie emituje widoku. Do JSON viewera trafia wyłącznie DTO mapy i minimalny odnośnik do artykułu, bez jego HTML lub metadanych źródła. W artykule pomijany jest tylko dokładnie rozpoznany stary nagłówek interfejsu „Interaktywna mapa <tytuł>”, zastąpiony przyciskiem; inne zatwierdzone treści pozostają. Nie zmieniono Markdownu, rejestrów, hashy, danych mapy ani zgód w tej iteracji.

Nowe szablony: map-article.njk i article-map-links.njk; map-preview.njk generuje teraz wyłącznie atlas. Wspólne atlasLinksForArticle obsługuje wiele zatwierdzonych map wskazujących tę samą lokację bez duplikowania artykułu. Zachowano pionowy/poziomy układ panelu znaczników, jego wysokość i scroll, opis nad listą, zaznaczenie, pan/zoom i linki do lokacji. Nie wdrożono Maps 2.0, warstw DM ani współdzielenia.

Build PASS (58 stron), wiki:test 16/16 PASS (separacja widoków, bezpieczne URL, kolizje, brak niezatwierdzonego widoku, minimalny JSON i wiele map dla jednej lokacji), publication:test 59/59 PASS. Przeglądarka: 44 przejścia atlas→lokacja→atlas, katalogi, artykuł↔atlas i fallback bez JS PASS; regresja zatwierdzonych artykułów 111 kontroli PASS; mobilna mapa w obu orientacjach/po obrocie PASS; kontrola motywu 24 warianty PASS. W nowym teście no-JS doprecyzowano selektor do main noscript, ponieważ shell ma własny noscript; po korekcie cały scenariusz PASS. Mobilne zrzuty obu widoków sprawdzono wizualnie, pozostają w ignorowanym .publication-review. Brak testów fizycznych telefonów, commita/push/deploymentu. Produkcyjna bramka bez zmian.

## Artykuł miejsca jako katalog lokacji — 2026-10-24

Po doprecyzowaniu DM hierarchia znajduje się na poziomie artykułów: wykorzystano istniejący wpis Neverwinter pod /dnd/wiki/neverwinter/, bez tworzenia drugiego artykułu miasta. Dodano w jego Markdownzie sekcję z 11 jawnymi wikilinkami do miejsc. Źródła dzieci już zawierają położenie/link do Neverwinter; ich bajtów nie zmieniono. Mapa pozostaje częścią tego samego artykułu. Zatwierdzono przez review/export/import wyłącznie zmieniony wpis Neverwinter; geometria i linki znaczników bez zmian, rejestr formalnych relacji bez zmian.

Główny /catalog/locations/ pokazuje teraz katalog miejsca Neverwinter zamiast płaskiej listy 11 dzieci. Dawny samodzielny spis Lokacje pozostaje dostępny w „Pozostałych wpisach”, bez usuwania istniejącego URL. Nowy location-navigation.json definiuje jawnie wybrane stabilne ID rodzica i dzieci; location-navigation.cjs projektuje je wyłącznie przez już zweryfikowany katalog i linki z wyrenderowanej zatwierdzonej treści rodzica. Nie wyciąga hierarchii z nazw folderów, niezatwierdzonych notatek ani markerów. Po wycofaniu rodzica grupa znika; po wycofaniu dziecka lub usunięciu zatwierdzonego linku powiązanie nie jest emitowane. Model nie wiąże katalogu z identyfikatorem mapy: artykuł miejsca może odsyłać do wielu map bez duplikowania dziecka lub jego kanonicznego URL. Nie wdrożono nowych funkcji Maps 2.0.

Ścieżki dzieci: Start → Lokacje → Neverwinter → nazwa miejsca. Artykuł Neverwinter również wraca breadcrumbem do Lokacji. Globalny spis i wyszukiwarka nadal udostępniają wszystkie zatwierdzone artykuły. Nie zmieniono ich adresów ani liczby zatwierdzonych rekordów (28 notatek/17 zasobów; 70 pending).

Build PASS (57 stron), wiki:test 14/14 PASS, publication:test 59/59 PASS. Test modelu obejmuje brak zatwierdzenia rodzica/dziecka, usunięty link, nieobecny artykuł, duplikat konfiguracji, fikcyjny prywatny identyfikator i dwa odnośniki do map przy jednym mieście. Przeglądarka: 44 przejścia mapa→lokacja→mapa oraz katalog→artykuł Neverwinter→dziecko, breadcrumbs i wariant bez JS PASS; regresja zatwierdzonych stron 111 kontroli PASS. Mobilny katalog i spis w artykule sprawdzono wizualnie. Źródłowy vault/.obsidian i główny workspace bez zmian; bez commita/push/deploymentu.

## Lokacje ze znaczników Neverwinter — 2026-10-24

Na jawne polecenie DM utworzono 11 notatek w src/site/notes/DND/Lokacje/Neverwinter/, po jednej dla każdego istniejącego znacznika. Tytuły i krótkie opisy pochodzą wyłącznie z zatwierdzonej mapy; każdy artykuł zawiera jawne położenie i wikilink do istniejącego wpisu/mapy Neverwinter. Nie dopisano lore, mieszkańców, afiliacji ani ilustracji i nie tworzono relacji na podstawie nazw/folderów. Brakujących artykułów nie zastąpiono kopią istniejącej encji. Nowe kanoniczne adresy: /dnd/wiki/lokacje/neverwinter/<slug>/.

W istniejącym źródle mapy zmieniono wyłącznie 11 atrybutów data-url na odpowiadające nowe artykuły. Nazwy/opisy/kolejność/ID znaczników, współrzędne, typy, kolory, obraz i permalink mapy zachowane. Przegląd i import objęły dokładnie 11 nowych wpisów oraz aktualizację źródła mapy, z historią w prywatnym magazynie; nie zatwierdzano innych materiałów. Stan aktywny: 28 notatek i 17 zasobów, 70 wejść pending; brak przerwanego importu i błędów aktywnych zgód. Rejestr relacji pozostaje bez zmian. Wszystkie 11 znaczników ma aktywny kanoniczny cel, 0 nierozwiązanych linków mapy. Lokacje trafiają do katalogu i zatwierdzonej wyszukiwarki.

Build PASS (57 wyjść), wiki:test 13/13 PASS z rozszerzoną kontrolą celów mapy, publication:test 59/59 PASS. Nowy wiki-map-locations-browser-check PASS: 44 przejścia mapa→lokacja→mapa (11 miejsc × 1440/390/844/320 px), zgodność nazw/opisów, katalog, brak overflow/błędów JS i artykuł bez JS. Dotychczasowy wiki-map-mobile-browser-check PASS: pion/poziom/obrót, wysokość i scroll panelu, zaznaczanie. Mobilny artykuł sprawdzono wizualnie; zrzuty w ignorowanym .publication-review. Oryginalny vault/.obsidian i główny workspace bez zmian. Produkcyjna bramka pozostaje aktywna, bez Maps 2.0, commita/push/deploymentu.

## Wewnętrzny scroll katalogów postaci i frakcji — 2026-10-24

Po akceptacji analizy ograniczono rozwiniętą siatkę wspólnego komponentu catalog-disclosure do min(60dvh, 600px), z fallbackiem 60vh. Overflow-y:auto uruchamia pionowy scroll tylko przy przekroczeniu limitu; krótkie sekcje zachowują naturalną wysokość. Nagłówek/licznik/kontrolka zwijania pozostają poza obszarem przewijania. Obszar ma tabindex=0 i role=region z nazwą od nagłówka; można przewijać klawiaturą, kółkiem i dotykiem także bez JS. Pozostawiono natywne przekazywanie przewijania do strony na końcu listy; nie dodano blokady overscroll. Zmiana dotyczy istniejących zwijanych katalogów postaci i organizacji, bez ingerencji w artykuły, mapę, źródła lub zgody.

Build i wiki:test 13/13 PASS. Rozszerzony wiki-catalog-disclosure-browser-check PASS: 24 kontrole sekcji w 1440/390/320/844 px, pion/poziom, z JS i bez; limit wysokości, brak poziomego overflow, End na regionie bez skoku strony/nagłówka, gest dotykowy, niezmienione liczby/linki i zwijanie. Syntetyczne listy 1 i 50 wpisów potwierdzają brak zbędnego scrolla oraz limit dla dużej listy. Mobilny zrzut rozwiniętej sekcji sprawdzono wizualnie; zrzuty pozostają w ignorowanym .publication-review. Brak testów fizycznego telefonu, commita/push/deploymentu; aktualizacja wyłącznie lokalnego podglądu.

## Zwijane katalogi postaci i frakcji — 2026-10-24

Na stronie /catalog/characters/ listy „Wszystkie postacie” i „Frakcje i organizacje” korzystają ze wspólnego komponentu details/summary; /organizations/ używa go dla katalogu organizacji. Nagłówek pokazuje nazwę, liczbę wpisów i Rozwiń/Zwiń. Listy do 6 wpisów są początkowo otwarte, większe zwinięte. Natywna kontrolka działa myszą, dotykiem i Enter/Space także bez JavaScript. Karty, ich kolejność i kanoniczne adresy pozostają w HTML, a wyszukiwarka bez zmian. Puste sekcje zachowują jawny komunikat zamiast pustej kontrolki. Zmiana nie dotyczy kart osób wewnątrz artykułu frakcji.

Build i wiki:test 13/13 PASS. Nowy wiki-catalog-disclosure-browser-check PASS: 18 kontroli sekcji przy 1440/390/320 px z JS i bez, klawiatura, kliknięcie, liczby/linki, brak overflow; syntetyczne granice liczebności 1/6/7/50. Dotychczasowa regresja zatwierdzonych katalogów i artykułów PASS: 78 kontroli. Mobilny zrzut zwiniętego katalogu sprawdzono wizualnie; zrzuty pozostają w ignorowanym .publication-review. Zmieniono wyłącznie prezentację, bez źródeł lore, rejestrów zgód, commita/push/deploymentu.

## Korekta tytułu dziennika — 2026-10-24

Na polecenie DM poprawiono tytuł na „Dziennik Tergona - wpis I” w jawnym frontmatterze i metadanych zatwierdzonego wpisu. Pozostawiono dotychczasową nazwę pliku i permalink, aby zachować wikilinki i adresy. Treść dziennika bez zmian. Aktualną zgodę dla jednego wpisu zastosowano przez review/export/import z zachowaniem historii. Nie zmieniono algorytmu wyszukiwarki; zrezygnowano z proponowanego rozszerzenia zgodnie z korektą DM.

Build i wiki:test 13/13 PASS. Odczyt indeksu i rzeczywistej funkcji searchEntries potwierdził wynik dla „Tergona”; HTML ma poprawiony h1, a URL pozostaje dotychczasowy. Bez zmian vaulta, commita/push/deploymentu.

Data: 2026-10-22. Gałąź: `feat/wiki-layout-2`. Ostatni commit / baza: `994d1c3b1826f8a0909240ffa886c04ab0e03ae9`. Zmiany lokalne bez commita. Repozytorium nie zawiera własnego AGENTS.md; obowiązujące instrukcje odczytano z AGENTS.md katalogu nadrzędnego. AGENTS.md sąsiedniego Lorekeepera nie jest instrukcją nadrzędną dla tego repo.

## Faktycznie wykonane

- Osobny prototyp Eleventy/Nunjucks/SCSS w `.wiki-preview`, bez odczytu rzeczywistych notatek i bez zmian produkcyjnych layoutów/PNG.
- Panel zwijany desktop, drawer mobile, podmenu, breadcrumbs, home, katalog postaci i strony encji/organizacji.
- Dziewięć fikcyjnych wpisów i jawne relacje, demo search tytuł/treść/alias; pełne listy bez JS.
- Konfigurowalne tokeny kolorów/fontów/logo, neutralna nazwa kampanii.
- Specyfikacja zaktualizowana o reprezentację organizacji i kontrakt lokacja–wiele map–oficjalne znaczniki.
- Lokalny build `wiki:build`: PASS. Testy Node `wiki:test`: 4/4 PASS. Playwright + headless Edge: PASS dla desktop/mobile, 320 px, drawer/focus, wyszukiwania, filtrów i no-JS. Sześć historycznych screenshotów sprawdzono wizualnie; pominięto je w kandydacie.

Instrukcje, pełna lista plików, wyniki i ograniczenia: [WIKI_UI_PROTOTYPE.md](WIKI_UI_PROTOTYPE.md). Serwer testowy po odbiorze zatrzymano; uruchomienie lokalne: `npm run wiki:dev`.

## Niewykonane / niepotwierdzone

Nie wdrożono produkcyjnej bramki publikacji, indeksu prawdziwych notatek, zmian starego DG, Maps 2.0, Lore Managera ani automatycznego zasilania publicznym lore. Nie uruchomiono starego produkcyjnego builda ani pełnej regresji istniejącej wiki. Brak testów na rzeczywistych telefonach, innych silnikach i czytnikach ekranu; nie deklarujemy pełnego odbioru WCAG ani zgodności Node 22 na podstawie testu na Node 24.

## Kolejne kroki i blokady

Prototyp gotowy do lokalnej oceny; brak blokady uruchomienia. Następne: odbiór wizualny, decyzje o docelowej konfiguracji, produkcyjny przegląd publicznych materiałów i implementacja bramki przed integracją z rzeczywistymi treściami. Zachowano zastane nieśledzone audyty i dokumenty. Brak zmian vault/.obsidian, deploymentu, commita i push.


## Rozszerzenie widoków postaci/lokacji — wykonane 2026-10-22

Na tej samej gałęzi dodano opcjonalne portrety, osobno zatwierdzane publiczne statusy i prezentację relacji postaci. Lokacje mają opcjonalną ilustrację, odwróconą listę powiązanych postaci z miniaturami/opisem związku oraz nieaktywne miejsce Pokaż na mapie. Użyto dotychczasowych krawędzi relacji, bez inferencji obecności w lokacji i bez zmiany istniejących URL/body Markdown. Zasoby są kopiowane wyłącznie z jawnego manifestu demo. Nawigacja, wyszukiwarka i motyw bez zmian.

Aktualne wyniki: build PASS; testy Node 7/7 PASS; nowy test przeglądarkowy encji PASS (1440/390/320 px, brak portretu/statusu/ilustracji/postaci, linki, no-JS); stara regresja przeglądarkowa PASS. Dziesięć historycznych screenshotów sprawdzono wizualnie; pominięto je w kandydacie. Pełny raport i lista zmian w WIKI_UI_PROTOTYPE.md.

Istniejący serwer na 8081 był już uruchomiony; po nieudanej próbie startu drugiego (EADDRINUSE) potwierdzono aktualną treść i wykorzystano istniejący serwer, bez zatrzymywania procesu użytkownika. Polecenie uruchomienia nie zmieniło się. Produkcyjne zasilanie nadal zablokowane do wdrożenia bramki; brak Maps 2.0, Lore Managera, testów sprzętowych i pełnego odbioru dostępności. Brak commita, deploymentu i push.


## M1A.2 — bezpieczne przygotowanie danych (2026-10-22)

Baza Git i gałąź bez zmian. Zaimplementowano inwentaryzację repo publikacyjnego, pięć pustych rejestrów jawnych zgód, walidator fingerprintów/flag/dependencji, metadanych/statusów i niezależnych relacji, adapter allowlisty dla UI bez treści full-text oraz twardą blokadę produkcyjnego generatora i standardowych skryptów zapisujących dist. Prototyp i źródłowe notatki bez zmian. Nie podłączono shellu do prawdziwego lore.

Fakty: 31 notatek, wszystkie dg-publish=true; 34 zasoby; 39 systemowych wejść src/site. Lokalne dist: 31 HTML i obecność 31 URL w search/graph/sitemap, 0 w feed, 34 identyczne kopie zasobów. Nie zweryfikowano online ani aktualnej zgody DM. Wszystkie 104 rekordy pending, 0 zgód i 0 potwierdzonych odmów; nie utożsamiamy tego ze zgodą. Raporty używają opaque ID bez prywatnych nazw/treści.

Wyniki: publication:test 13/13 PASS; wiki:build PASS; wiki:test 7/7 PASS. publication:validate i publication:data na realnym repo oczekiwanie BLOCKED (104 niezatwierdzone wejścia). npm run build oczekiwanie BLOCKED w prebuild przed rimraf; dist zachował wszystkie 86 plików i ten sam digest. Test rzeczywistego Eleventy na fikcyjnych danych potwierdził, że dg-publish=false/brak bez globalnej bramki nie wyklucza pliku. Własny test blokady .eleventy.js potwierdził brak wyjść wszystkich kanałów, nie ich selektywną implementację.

Blokady przed realną integracją: indywidualne decyzje DM o notatkach i załącznikach, publiczne ID/metadata/relacje oraz przyszłe public-only renderowanie każdego kanału. Bieżący adapter ma body=false, fulltext=false, production_channels=false. Stare dist i wcześniejszy hosting nie są oczyszczone ani objęte ochroną tego buildu. Brak deklaracji produkcyjnego bezpieczeństwa, deploymentu, commita, push, zmian vaulta/.obsidian, Maps lub Lore Managera.

Dokładny raport: [PUBLICATION_READINESS.md](PUBLICATION_READINESS.md). Lista do decyzji jest lokalnym materiałem review, nie dołączonym do kandydata. Nowe polecenia: publication:inventory/test/validate/data; bezpieczny lokalny prototyp nadal wiki:dev. Dwie kwestie zgłoszone DM: lista jawnie zatwierdzonych materiałów i aktualny publiczny URL wiki. Nie zgadywano odpowiedzi.


## M1A.2B — wygodny przegląd i porównanie online (2026-10-22)

Zaimplementowano osobne lokalne narzędzie DM: `npm run publication:review`, 127.0.0.1:8082, czytelne nazwy/ścieżki, grupy folderów, podgląd tekstu/obrazów, zależności, diff, jawne zatwierdzenie/odmowa i zachowana historia. Domyślny magazyn prywatnych decyzji i snapshotów jest poza repo/OneDrive w LocalAppData, pokazany w panelu. Techniczne przeglądy kodu są odróżnione od zgód na treść dla graczy. Propozycje eksportu są nowymi lokalnymi plikami; aktywne decyzje src/wiki nie są nadpisywane. Istniejące pliki i wcześniejsze decyzje pozostawiono. Rzeczywistych materiałów nie zatwierdzano automatycznie ani ręcznie podczas implementacji (0 nowych decyzji DM).

Odczyt publicznej witryny https://fundelverwiki.vercel.app wykonany 19:06 UTC: home/sitemap/searchIndex/graph/feed HTTP 200, 31/31 lokalnych URL-i notatek HTTP 200 i tekst main zgodny z lokalnym dist, 27 identycznych zasobów, 1 różny SVG, 6 zasobów nieodpytywanych pod zgadywanymi adresami, 1 publiczny URL poza zbiorem notatek. Nie wyprowadzano zgody DM z obecności online. Potencjalnie spoilerowe nazwy/treści nie trafiły do publicznych raportów; szczegóły nazw i dodatkowego URL dostępne są w lokalnym panelu.

Aktualne testy: publication:test 21/21 PASS; review-browser-check PASS na syntetycznych materiałach (1440 i 390 px, grupy techniczne, content review, dependency changes, diff, historyczna odmowa, eksport i XSS-as-text); wiki:test 7/7 PASS. Odczyt silnika na realnym repo potwierdził 31/34/39 wejść bez nowych zgód. Testy przeglądarkowe nie dotykały decyzji realnego DM. Brak deklaracji gotowości produkcyjnej z fixture.

Blokada produkcyjnej .eleventy.js i skryptów pozostała bez zmian; nie zintegrowano shellu i nie zmieniono aktualnego prototypu. Kolejny etap: jawne scalenie przejrzanych decyzji, public-only staging i Markdown, bezpieczny search, filtrowane graf/relacje/feed/sitemap, kontrolowane kopie zasobów, a następnie testy rzeczywistych zatwierdzonych wpisów/permalinków/PNG. Brak Maps 2.0, vault/.obsidian, commita, push i deploymentu.

Instrukcja i uproszczony proces: [PUBLICATION_WORKFLOW.md](PUBLICATION_WORKFLOW.md). Różnice online: [ONLINE_COMPARISON.md](ONLINE_COMPARISON.md). Nowe pliki i ograniczenia są wymienione w instrukcji. Pierwszy szczegółowy snapshot publicznych URL-i zachowano w ignorowanym .publication-review/online; nowy prywatny magazyn nie został wypełniony decyzjami realnego DM.

## M1A.2C — integracja decyzji DM z rejestrami (2026-10-22)

Zaimplementowano osobny importer propozycji: lokalny diff (czytelne ścieżki, zgody/odmowy, SHA, metadane, zależności), świadome apply z hashem planu, status aktywnych zgód i potwierdzane odzyskiwanie przerwanego zapisu. Eksport v2 wiąże propozycję z repo, bazą rejestrów i konkretnymi lokalnymi zdarzeniami. Import sprawdza najnowszą decyzję, bieżące bajty, zgodność aktywnej rewizji oraz pełny scalony model; odrzuca stare/conflictujące propozycje i nierozwiązane zależności. Niepełny formularz nie usuwa statusów, aliasów, dat, referencji obrazów ani relacji. Odmowy i poprzednie metadane zachowuje prywatny dziennik importu. Zmieniony załącznik wymaga własnego przeglądu, bez ponownego zatwierdzania niezmienionej notatki.

Weryfikacja: **publication:test 36/36 PASS** (15 nowych testów importu, w tym pełny proces CLI i awaria zapisu/rollback); **wiki:test 7/7 PASS**; test przeglądarkowy panelu DM PASS (headless Edge, 1440/390 px, wyłącznie syntetyczne materiały). `publication:validate` na rzeczywistym repo oczekiwanie BLOCKED / UNAPPROVED_INPUT:104; `npm run build` oczekiwanie BLOCKED / PRODUCTION_CHANNELS_NOT_CERTIFIED przed rimraf. Node 24.22.0; Node 22, utrata zasilania i rzeczywiste urządzenia nie były testowane. Rzeczywiste rejestry nie zostały zmienione; 104 pending i 0 nowych decyzji lokalnych DM. Nie deklarujemy gotowości produkcyjnej na podstawie fixture.

Ponowny odczyt dwóch wcześniej ujawnionych endpointów online 19:35–19:38 UTC potwierdził: różnica SVG to wyłącznie CRLF/LF (bez normalizacji źródła i bez zgody na publikację); dodatkowy URL to systemowy widok braku treści, zgodny z lokalnym szablonem, ale zwracający HTTP 200. Szczegółowe hashe i metoda w ONLINE_COMPARISON.md. Nie kopiowano treści kampanii do raportów i nie uznano wersji online za właściwą.

Nowe pliki tej iteracji: `src/helpers/wiki/import.cjs`, `registry-store.cjs`, `scripts/publication-import.cjs`, `tests/security/import.test.cjs`. Zmienione: `src/helpers/wiki/review.cjs` (eksport/rewizja), `publication.cjs` (walidacja scalonego modelu i blokada nieukończonego importu), `tools/publication-review/index.html` (instrukcja), package.json, .gitignore, README oraz docs/{PROJECT_STATUS,PUBLICATION_READINESS,PUBLICATION_WORKFLOW,WIKI_UX_SPEC,ONLINE_COMPARISON}.md. Zachowano zastane zmiany; bez commita/push/deploymentu. Notatki, permalinki, PNG, vault/.obsidian, prototyp Wiki UX i produkcyjne layouty bez zmian.

Dalej: rzeczywisty przegląd i jawny import decyzji DM; public-only staging/renderer Markdown i pełny parser zależności; kontrolowany search, graph/backlinki/relacje, sitemap/feed i kopie zasobów/pochodnych; testy rzeczywistych zatwierdzonych wpisów i czystego artefaktu; semantyka systemowej strony braku treści i kontrola hostingu/cache. Samo wypełnienie rejestrów nie usuwa produkcyjnej blokady. Instrukcje CLI i granice odzyskiwania: [PUBLICATION_WORKFLOW.md](PUBLICATION_WORKFLOW.md).
## Poprawka informacji zwrotnej panelu DM (2026-10-22)

Po zgłoszeniu kliknięcia Zatwierdź bez widocznego potwierdzenia sprawdzono magazyn i działający serwer: brak zapisanych decyzji, a wcześniejsze eksporty były puste. Nie ustalono historycznego błędu konkretnego żądania; panel nie przechowywał jego diagnostyki. Odtworzono możliwość zamaskowania nieudanej decyzji późniejszym komunikatem o pustym eksporcie.

Dodano trwałe komunikaty bezpośrednio przy przyciskach decyzji i eksportu, focus/przewinięcie do wyniku, wskazanie brakującego podglądu lub metadanych i czytelne objaśnienia błędów API. Eksport nie przykrywa błędu przy decyzji, blokuje niezakończone zaznaczenie, a backend odmawia utworzenia pustej propozycji. Zapis potwierdzony przez API nie jest przedstawiany jako nieudany, jeśli zawiedzie samo odświeżenie listy. Zaznaczenie nie stanowi zgody; nie dodano żadnych automatycznych decyzji.

Testy: publication:test **37/37 PASS**; rozszerzony review-browser-check **PASS 1440/390 px**, obejmujący widoczność błędu przy przycisku, brak podglądu/metadanych, pusty/niedokończony eksport, zachowanie komunikatu i potwierdzenie udanego zapisu. Wyłącznie syntetyczne materiały. Zmienione: tools/publication-review/{index.html,review.js,review.css}, src/helpers/wiki/review.cjs, tests/security/review.test.cjs, scripts/review-browser-check.cjs i dokumentacja procesu/postępu. Produkcyjna bramka, rejestry realnych materiałów, vault i prototyp wiki bez zmian.

Działający wcześniej proces Node ma stary moduł w pamięci: dla pełnej poprawki należy zatrzymać panel Ctrl+C, ponownie uruchomić npm run publication:review i odświeżyć stronę Ctrl+F5. Nie zatrzymywano procesu użytkownika ani nie zapisywano zgód w jego imieniu.
## Naprawa uruchomienia panelu z prawem zapisu (2026-10-22)

Po LOCAL_REVIEW_ERROR potwierdzono EPERM podczas próby utworzenia pustego pliku diagnostycznego w lokalnym magazynie. Przyczyną był serwer uruchomiony przez agenta w ograniczonym środowisku bez prawa zapisu poza workspace. Zatrzymano wyłącznie własną sesję panelu i, po uzyskaniu zgody na wykonanie poza ograniczeniem, uruchomiono ją ponownie. Próba zapisu pustego pliku zakończyła się REVIEW_STORE_WRITE_OK; plik diagnostyczny usunięto. Nie utworzono decyzji DM. Endpoint listy potwierdził HTTP 200 i nadal 104 pending.

API panelu mapuje teraz EPERM/EACCES/EROFS na REVIEW_STORE_WRITE_DENIED i ENOSPC na REVIEW_STORE_FULL, bez ujawniania ścieżek lub treści wyjątków. Frontend wyświetla konkretne objaśnienia, uwzględniające możliwość częściowego zapisu grupy. Dodano test syntetycznej odmowy zapisu po poprawnym otwarciu podglądu i potwierdzeniu sesji: publication:test **38/38 PASS**. Zmienione: scripts/publication-review.cjs, tools/publication-review/review.js, tests/security/review.test.cjs i dokumentacja. Rzeczywiste zgody, rejestry i bramka produkcji bez zmian. Zwykły terminal użytkownika poza sandboxem wystarcza; nie przenosić magazynu do publicznych wyjść.
## Wspólny przegląd notatek i załączników (2026-10-22)

Uproszczono lokalny panel DM: podgląd notatki zawiera karty jej bezpośrednich załączników, obrazy z powiększeniem, tekstowy SVG/kod, pola alt i jawny zakres zgody. Jeden przycisk może zapisać notatkę i wskazane załączniki jako odrębne decyzje przez istniejące API, bez osłabienia hashy/tokenów/rewizji. Gdy notatka ma aktualną zgodę, nie jest ponownie zatwierdzana. Przycisk nad listą zbiera unikalne wymagające przeglądu załączniki wszystkich aktualnie lokalnie zatwierdzonych notatek. Odrzucone pliki są domyślnie wyłączone, zmienione wymagają jawnego potwierdzenia zastąpienia. Zachowano indywidualny tryb i historię. Wspólny opis alt jest opcjonalny, ręcznie podany i stosowany wyłącznie na żądanie do zaznaczonych pustych pól.

Testy: nowy scripts/review-attachments-browser-check.cjs PASS w headless Edge 1440/390 px na syntetycznych źródłach: deduplikacja wspólnych zasobów, wykluczenia, wspólny alt, zgoda notatka+zasób jednym requestem, kolejka istniejących zgód bez ponawiania notatek, odrzucony zasób, stare hashe, ponowny przegląd zmienionego obrazu, SVG bez wykonania i brak przepełnienia mobile. Dotychczasowy review-browser-check PASS; publication:test 38/38 PASS. Nie jest to odbiór produkcyjnych kanałów ani test uwagi osoby przeglądającej.

Zmienione: tools/publication-review/{index.html,review.js,review.css}, nowy scripts/review-attachments-browser-check.cjs oraz docs/PUBLICATION_WORKFLOW.md i PROJECT_STATUS.md. Bez zmian backendu, aktywnych rejestrów i zgód DM podczas implementacji; kontrola stanu wykazała 18 wcześniejszych lokalnych decyzji. Nowy frontend jest już serwowany przez działający panel 8082; wystarczy odświeżenie Ctrl+F5, bez restartu procesu z prawem zapisu. Odświeżenie usuwa niezapisane formularze, nie historię. Nie zmieniano vaulta, prototypu wiki ani bramki produkcyjnej; brak commita/push/deploymentu. Nierozwiązany odnośnik i nieobsługiwany HTML wcześniejszej propozycji nadal wymagają odrębnego wyjaśnienia, nie kolejnej zgody na te same bajty.
## Rozdzielenie trybów zatwierdzania po zgłoszeniu błędu (2026-10-22)

Potwierdzono, że wspólny zapis użytkownika zakończył się sukcesem: 18 notatek i 17 załączników mają lokalne zgody (35 zdarzeń). Późniejszy błąd brakującego podglądu dotyczył starego przycisku indywidualnego i pozostawionego zaznaczenia notatki na liście, nie nieudanego zapisu załączników. Nie ponawiano zgód i nie zmieniano aktywnych rejestrów.

Rozdzielono tryby panelu: wspólny przegląd czyści wyłącznie zaznaczenia i potwierdzenia formularza listy, blokuje jej checkboxy i ukrywa stare przyciski decyzji. Tryb indywidualny jest dostępny po jawnym powrocie. Backendowa historia pozostaje zachowana. Po udanym zapisie grupy i przy pustej kolejce załączników dostępne jest bezpośrednie tworzenie propozycji z zapisanych decyzji. Żadne drugie zatwierdzanie nie jest wymagane.

Oba testy przeglądarkowe PASS (headless Edge, syntetyczne źródła, 1440/390 px). Nowa regresja obejmuje pozostawione zaznaczenie nieotwartej notatki, przełączenie trybu, ukrycie/ochronę starego przycisku i eksport po udanym wspólnym zapisie bez tworzenia kolejnych decyzji. Zmiany: tools/publication-review/{index.html,review.js}, scripts/review-{browser-check,attachments-browser-check}.cjs i dokumentacja. Nie zmieniono API, produkcyjnej bramki ani rzeczywistych decyzji; bez commita/push/deploymentu.
## Weryfikacja kolejnej propozycji DM (2026-10-22)

Nowa lokalna propozycja v2 zawiera 35 aktualnych zgód: 18 notatek i 17 załączników. Podgląd importu pozostaje BLOCKED / MERGED_REGISTRIES_INVALID. Dwie konkretne blokady: ACTIVE_CONTENT_CHANNEL_NOT_SUPPORTED dla notatki zawierającej dawną mapę HTML z danymi znaczników oraz UNAPPROVED_WIKILINK dla odnośnika do celu nieobecnego w zinwentaryzowanych źródłach (także po bezpiecznej normalizacji ścieżki). Nie jest to brak zapisu decyzji użytkownika. Podstawowy ekstraktor nie wykrywa obecnie braków w swoich rozpoznawanych zależnościach, ale nie stanowi kompletnej kontroli własnych atrybutów mapy data-map-*/data-url/data-description. Nie odblokowano takiego HTML ani map i nie uznano tych danych za publiczny model znaczników.

Pozostałych 69 wejść nie zatwierdzano automatycznie. Nie zastosowano propozycji ani nie zmieniono aktywnych rejestrów, źródeł, permalinków lub decyzji DM. Nie trzeba powtarzać przeglądu tych samych 35 materiałów. Dalsza integracja wymaga osobnego bezpiecznego kontraktu dla legacy map/HTML i decyzji o niedostępnym celu odnośnika; nie obchodzimy walidatora dla wymuszenia importu. Nazwy i adresy potencjalnie niepublicznych celów nie zostały skopiowane do raportu.
## Istniejąca mapa — parser, walidacja i lokalny viewer (2026-10-22)

Mapa pozostaje obowiązkową częścią migracji. Dodano legacy-map.cjs: ściśle rozpoznany format kontenera i markerów jest dekodowany do DTO, bez wykonywania lub szerokiego dopuszczenia HTML. Walidator sprawdza źródło/hash/zgodę, zatwierdzony obraz, granice współrzędnych, dozwolone atrybuty/typy/kolory i cele data-url. Nieznane pola, skrypty, ukryta dodatkowa treść, niebezpieczne adresy i mieszanie wielu map są blokowane. Pozostały HTML nadal jest odrzucany.

Lokalny panel DM udostępnia read-only SVG viewer z pan/zoom, klawiaturą, pinch, opisami i listą punktów. Widok korzysta wyłącznie z zatwierdzonej notatki/obrazu i bezpiecznej projekcji; nie zwraca URL-i niezatwierdzonych celów. Osobna, jawna decyzja o pominięciu niedostępnych linków może zostać zapisana pod mapą z kontrolą tokenu/hashu/rewizji. Dopisuje historię i generuje nową propozycję, bez zmiany źródła lub stosowania rejestrów. Podczas implementacji nie zapisano takiej rzeczywistej decyzji automatycznie; nadal 35 wcześniejszych lokalnych zgód, aktywne rejestry niezmienione.

Sprawdzono rzeczywistą zatwierdzoną mapę: zachowane 11 punktów, world 3250x2264, oryginalny obraz 4250x3284, działające opisy, brak błędów JS i overflow przy 390 px. Wszystkie 11 odnośników wskazuje niedostępny cel i w podglądzie jest nieaktywne; decyzja DM wymagana przed ścisłą projekcją. Niezależna blokada wikilinku w innym wpisie pozostaje. Źródłowe Markdown/obraz/współrzędne/permalinki niezmienione.

Weryfikacja: publication:test **46/46 PASS** (8 nowych testów map), wiki:test **7/7 PASS**, nowy map-browser-check PASS (1440/390 px, mysz/klawiatura/dotyk/pinch, odnośniki i jawna decyzja wyłącznie na fixture), obie regresje panelu DM PASS. Dwa historyczne screenshoty fikcyjnej mapy sprawdzono wizualnie; pominięto je w kandydacie. Nie kopiowano rzeczywistych opisów punktów do raportów/screenshotów. Node 24.22.0; brak osobnego testu Node 22/fizycznych telefonów.

Nowe pliki: src/helpers/wiki/{legacy-map,legacy-map-review}.cjs, tools/publication-review/{map.html,map.js,map.css}, tests/security/legacy-map.test.cjs, scripts/map-browser-check.cjs, docs/LEGACY_MAP_MIGRATION.md oraz syntetyczne screenshoty. Zmiany: publication/review/import helpers, scripts/publication-review.cjs, review.js, package.json, README, WIKI_UX_SPEC, PUBLICATION_READINESS, PUBLICATION_WORKFLOW i PROJECT_STATUS. Produkcyjny campaignMap.njk nie był modyfikowany ani odblokowany. Brak Maps 2.0, edycji znaczników, zmian vault/.obsidian, commita/push/deploymentu.

Panel został zrestartowany poza sandboxem z dotychczasowym magazynem i prawem zapisu. Podgląd: http://127.0.0.1:8082/map-review/?entry=entry-c217c245e1b90f6b78f8. Szczegóły i blokady: [LEGACY_MAP_MIGRATION.md](LEGACY_MAP_MIGRATION.md). Produkcyjny shell, raw Markdown, search/graph/feed/sitemap i kontrolowane kopiowanie nadal wymagają osobnego wdrożenia; działający podgląd nie jest deklaracją gotowości produkcyjnej.

## M1A — mapa w lokalnym prototypie Wiki Layout 2.0 (2026-10-22)

Po jawnej decyzji DM zaimportowano do aktywnych rejestrów wpis mapy i jej zatwierdzony obraz. Status rejestrów: 2 approved, 102 pending, brak przerwanego importu. Nie zmieniono notatki Markdown, obrazu ani istniejącego permalinku. Polityka `omit_unresolved` zachowuje 11 punktów, a linki bez zatwierdzonego celu pozostawia nieaktywne.

Prototyp `wiki:dev` korzysta z nowej, zawężonej funkcji `prepareLocalMapPreviewData`: waliduje źródło mapy i obraz, a projektuje tylko te dwa zatwierdzone rekordy. Oczekujące wpisy nie trafiają do modelu ani wyszukiwarki demonstracyjnej. Strona powstaje pod kanonicznym adresem `/dnd/wiki/neverwinter/`; katalog Mapy zawiera do niej wyraźnie oznaczony link „Zatwierdzone mapy kampanii”. Podgląd ma etykietę lokalną i nie jest produkcyjnym renderowaniem Digital Garden. Bramka `.eleventy.js` i `prebuild` pozostaje bez zmian.

Weryfikacja: `npm run wiki:build`, `npm run wiki:test` **8/8 PASS**, `npm run publication:test` **48/48 PASS**. Edge headless: 1440 i 390 px, 11 znaczników, otwieranie opisu, zero aktywnych linków do brakującego celu, brak błędów JS i poziomego przepełnienia. Porównano obraz w buildzie z zatwierdzonym zasobem bajt w bajt. Dwa zrzuty kontrolne są wyłącznie w ignorowanym `.wiki-preview/`.

Uruchomienie: `npm run wiki:dev`; lokalny adres mapy: http://127.0.0.1:8081/dnd/wiki/neverwinter/. Ograniczenia: globalne wyszukiwanie wciąż obejmuje wyłącznie fixture demo, nie dodano treści artykułu Markdown do adaptera, nie zabezpieczono wszystkich produkcyjnych kanałów i nie wdrożono Maps 2.0. Bez deploymentu, commita, push, zmian vaulta i `.obsidian`.

## Zatwierdzone artykuły w nowym układzie (2026-10-23)

Przejrzano istniejące lokalne decyzje i przygotowano świeży eksport poprawnego podzbioru po zmianie bazy rejestrów przez import mapy. Zastosowano 32 nowe rekordy (16 notatek i 16 załączników); mapa i jej obraz były już zastosowane. Aktywne rejestry mają teraz **17 notatek i 17 załączników, 70 wejść pending**, bez przerwanego importu i bez innych błędów walidacji aktywnych zgód. Nie dodano żadnej nowej decyzji DM. Jeden wpis z zapisaną lokalną zgodą nadal pominięty z powodu nierozwiązanego wikilinku; jego historia pozostaje zachowana.

Nowy katalog http://127.0.0.1:8081/approved/ udostępnia 16 rzeczywistych artykułów i mapę pod dotychczasowymi kanonicznymi URL. Mapa zawiera również zatwierdzoną część Markdown. Adapter kontroluje tokeny linków i obrazów, referencje i osadzenia wiki, ukryte cele, hashe i sygnatury obsługiwanych obrazów rastrowych. Kopiuje zweryfikowane bajty bez ponownego passthrough źródeł. Nie przekazuje surowych notatek do silnika szablonów. Jeden h1 na stronę; tabele i kod mają lokalne przewijanie. Nowy build czyści własny katalog podglądu, aby wycofane treści nie pozostawały pod starymi adresami. Produkcyjne bramki nie zostały zmienione.

Weryfikacja: **publication:test 54/54 PASS**, **wiki:test 8/8 PASS**, build PASS. Edge headless: **51 kontroli stron/viewportów** (17 wpisów × 1440/390/320 px), obrazy, linki i brak błędów JS/przepełnienia, dodatkowo artykuł bez JS. Dotychczasowe wiki-browser-check i wiki-entity-browser-check PASS. Zrzuty rzeczywistych zatwierdzonych stron pozostają w ignorowanym prywatnym katalogu kontroli poza serwowanym wynikiem; sprawdzono wizualnie desktop i mobile. Niezależny audyt publikacji wskazał obsłużone błędy odczytu i kolizje wielkości liter; nie wykazał blokującego wycieku w ścieżce npm build. Kontrola bramki legacy potwierdziła PRODUCTION_CHANNELS_NOT_CERTIFIED oraz niezmieniony digest dist.

Szczegóły i ograniczenia: [LOCAL_APPROVED_ARTICLES.md](LOCAL_APPROVED_ARTICLES.md). Wyszukiwarka nadal tylko demo; search/graf/backlinki/feed/sitemap i publiczny hosting nie są certyfikowane. Node 24; brak oddzielnego testu Node 22, sprzętowych telefonów i pełnego odbioru dostępności. Nie zmieniono źródłowych notatek, obrazów ani vaulta/.obsidian. Istniejące procesy użytkownika pozostawiono; podgląd 8081 odczytuje odświeżony wynik. Bez commita/push/deploymentu.

## Uporządkowanie katalogów i oddzielenie demo (2026-10-23)

Strona główna `/`, sześć katalogów `/catalog/…/`, organizacje `/organizations/` i pełny spis `/approved/` korzystają teraz z zatwierdzonych metadanych. Wpisy są sortowane alfabetycznie według polskich reguł. Pełny spis ma rozłączne grupy: 7 postaci, 1 organizacja, 6 przedmiotów, 1 dokument, 1 wpis o lokacjach i 1 mapa. Kronika uczciwie pozostaje pusta; nie przenoszono dziennika z zatwierdzonej kategorii dokumentów ani nie dopisywano dat i relacji. W katalogu postaci organizacja jest pokazana w osobnej podsekcji; liczba 8 obejmuje oba typy. Artykuły prowadzą breadcrumbs do własnej kategorii lub organizacji, zachowując kanoniczne URL i oryginalne tytuły.

Demonstracyjne ekrany przeniesiono pod `/demo/`, w tym katalogi, encje i organizacje. Wyszukiwarka występuje tylko w demo. Główna część nie sugeruje, że wyszukiwanie obejmuje prawdziwą kampanię. Klient obsługuje nawigację bez elementów wyszukiwarki. Zarezerwowano prefiks `/demo/` przed kolizjami z zatwierdzonym artykułem. Nie zmieniono rejestrów zgód, źródłowych Markdown/obrazów, bramki produkcyjnej ani publicznego hostingu.

Weryfikacja: build PASS (45 wyjść), **wiki:test 11/11 PASS**, **publication:test 55/55 PASS**. Przeglądarka: **78 kontroli stron/viewportów** (katalogi i 17 wpisów, 1440/390/320 px), liczby kart, brak demo w głównych listach, drawer/Escape, skrót klawiszowy bez dialogu, obrazy i linki, dodatkowo katalog i artykuł bez JS. Regresje demo i encji PASS po przeniesieniu tras. Sprawdzono wizualnie desktop strony głównej i mobilny katalog postaci. Po drobnej korekcie tekstów liczników powtórzono build i testy Node. Dokumentacja opisuje nowe adresy. Bez commita/push/deploymentu.

## Wyszukiwanie zatwierdzonych treści (2026-10-23)

Główna wiki ma wyszukiwanie po tytułach, przejrzanych aliasach i wyrenderowanej treści 17 wpisów. Nowy `/approved-search.json` pochodzi z tego samego zweryfikowanego modelu co artykuły. Uwzględnia publiczne nazwy/opisy punktów mapy; nie kopiuje surowych celów, atrybutów HTML, komentarzy, frontmatteru, nazw źródeł i hashy. Nie rozpoznaje tekstu wewnątrz obrazków (jawny komunikat w oknie). Demo zachowuje osobny indeks i zakres, bez fallbacku po błędzie danych głównej wiki.

Przycisk Szukaj, formularz na stronie głównej i Ctrl+K/Cmd+K otwierają dostępny dialog z fragmentami wokół dopasowania, limitem 30 wyników i możliwością ponowienia nieudanego pobrania. Wyniki wykorzystują textContent i kontrolowane lokalne URL; polskie znaki można pomijać w zapytaniu. Usunięcie/ukrycie/wycofanie zgody wymaga przebudowy i odświeżenia strony, zgodnie ze snapshotowym charakterem podglądu. Stary wynik jest usuwany przed kolejną walidacją.

Weryfikacja: build PASS (46 wyjść), **publication:test 59/59 PASS**, **wiki:test 13/13 PASS**, nowy search-browser-check PASS przy 1440/390/320 px (tytuł/alias/treść, snippet, URL/XSS-as-text, błąd i retry, drawer/focus/Escape, puste/brak wyników, spóźniona odpowiedź, rzeczywiste dane i osobne demo). Regresja 78 kontroli zatwierdzonych stron i dotychczasowy test demo PASS. Screenshoty syntetycznych wyników desktop/mobile sprawdzono wizualnie i zachowano poza serwowanym katalogiem w ignorowanym magazynie. Niezależny audyt wykrył i zweryfikował poprawkę ekstrakcji bloków kodu; brak nierozwiązanych potwierdzonych usterek w jego zakresie.

Dokumentacja: [WIKI_SEARCH.md](WIKI_SEARCH.md). Istniejący podgląd 8081 nie odpowiadał podczas końcowych testów; uruchomiono własną sesję wiki:dev i potwierdzono HTTP 200 dla home oraz indeksu 17 wpisów. Bramka produkcyjna pozostaje aktywna. Brak zmian zgód, notatek, obrazów, vaulta/.obsidian; bez commita/push/deploymentu. Publiczny hosting, graf/backlinki i sitemap/feed nadal wymagają osobnej integracji. Node 22, fizyczne urządzenia i pełny odbiór dostępności nie były osobno testowane.

## Dark Archive — izolowana warstwa wizualna (2026-10-23)

Motyw zaimplementowano wyłącznie w worktree `.worktrees/dark-archive-theme`, gałąź `feat/dark-archive-theme`. Baza Git: 994d1c3 + dokładny snapshot zaakceptowanego, niezacommitowanego prototypu z feat/wiki-layout-2. Oryginalny workspace i publikacyjna migracja pozostają bez zmian; manifest oraz kontrola hashy opisują odziedziczone pliki osobno od patcha motywu. Lokalny podgląd: http://127.0.0.1:8083/.

Rozdzielono wybór motywu kampanii, semantyczne tokeny, styl komponentów i dekoracje. Cały interfejs jest ciemny: sidebar/drawer, artykuły, katalogi, relacje, filtry i wyszukiwarka. Użyto stalowych ikon SVG, subtelnych linii kartograficznych i metalicznej tekstury CSS, jasnego tekstu i oszczędnych akcentów czerwieni/błękitu. Nie zmieniono skryptów zachowania, modeli relacji, permalinków, źródeł, zatwierdzeń ani integracji danych.

Finalny osobny smoczy banner nie jest dostępny. Konfiguracja banner=null nie generuje obrazu ani pustej przestrzeni; komponent hero/header czeka na jawnie dostarczony zasób. Nie generowano zastępstwa ani nie wycinano go z referencyjnych makiet. Treściowe ilustracje i PNG zachowują bajty oraz proporcje.

Weryfikacja: lokalny build PASS, wiki:test 13/13 PASS, 26 par kontrastu PASS (najmniejszy tekst 4,63:1; granice kontrolek 3,33:1), 24 kontrole motywu przy 1440/390/320 px PASS, dotychczasowe regresje demo/encji/wyszukiwarki PASS oraz 78 kontroli zatwierdzonych stron PASS. Przeglądano długi artykuł, focus, drawer/search, brak bannera i wyłączone tekstury. Niezależny przegląd UI wskazał jedną korektę licznika na mobile; poprawiono i ponowiono kontrolę motywu. Integralność: 124 pliki chronione i 210 plików źródłowego workspace niezmienione.

Raport, pełna lista plików, paleta/tokeny i screenshoty desktop/mobile home/katalog/NPC/lokacja: [DARK_ARCHIVE_THEME.md](DARK_ARCHIVE_THEME.md). Zrzuty NPC/lokacji demonstrują istniejące komponenty na fikcyjnych danych. Brak testu Node22, sprzętowych telefonów i pełnego odbioru czytników ekranu; nie deklarujemy kompletnej zgodności WCAG. Nie uruchamiano zablokowanego produkcyjnego buildu. Bez commita/push/deploymentu; patch nie został przeniesiony do głównego katalogu roboczego.

Korekta po ocenie użytkownika: ograniczono błękit na rzecz neutralnego grafitu i stali. Zmieniono wyłącznie tokeny motywu, odświeżono 13 screenshotów i raport palety. Powtórzono lokalny build, 26 par kontrastu i 24 kontrole przeglądarkowe — PASS. Najniższy kontrast sprawdzanego tekstu 5,33:1; granice kontrolek 3,72:1. Czerwony i niebieski akcent dekoracyjny zachowano. Podgląd nadal na 8083.

Dalsza korekta fantasy: Palatino w nagłówkach, rycinowy kompas, ornamenty pod tytułami i narożniki kart; neutralna paleta bez zmian. Dekoracje są kodem SVG/CSS, nie zastępstwem brakującego bannera. Build, kontrast26, kontrola motywu24 i regresja demo PASS, screenshoty odświeżone. Zmiany nadal wyłącznie w worktree motywu.

Kolejna korekta na prośbę użytkownika: złoto zamiast szarych akcentów. Token metal=#B69A66, accent=#C5A66C, link=#D0B77F. Lokalne czerwone/niebieskie detale występują w znaku archiwum, nad hero, na krawędziach wyszukiwania i w aktywnej nawigacji; linki relacji mają czytelny błękit. Dodano warianty tekstowe dragon-red-ink=#E5938F i dragon-blue-ink=#83B9D5. Grafitowe powierzchnie bez zmian. Powtórzono build, 34 pary kontrastu (minimum tekstu 5,02:1), 24 kontrole motywu i integralność — PASS. Wszystkie screenshoty odświeżono. Ta korekta zastępuje wcześniejsze ograniczenie złota w pierwotnej specyfikacji zgodnie z najnowszą instrukcją użytkownika.

Podłączono wskazany DragonBanner.png z examples. Hero: oryginalny banner obok treści na desktopie; podstrony: mały znak wodny; mobile: ukryty. Dodano tylko jawne kopiowanie tego pojedynczego zasobu UI, bez zmian integracji danych i rejestrów. Hash źródła i kopii w buildzie zgodny. Lokalny build, wiki:test13/13, kontrast34 i kontrola motywu24 PASS, screenshoty odświeżono; fallback bez bannera zachowuje położenie wyszukiwania. Integralność123 chronione + config wyłącznie jedna rejestracja UI, oryginalne210 plików bez zmian. Wcześniejsze informacje o brakującym zasobie są historyczne.

Rozbudowano sekcje postaci na stronach organizacji w worktree motywu. Demo członkostwa używa kart z portretem/inicjałem, opisem, publicznym statusem i linkami lokacji. Rzeczywiste odnośniki frakcji prezentowane są jako Postacie wymienione we wpisie, bez inferencji członkostwa i zmian rejestrów. Miniatury pochodzą z już zatwierdzonych ilustracji. Dokumentacja: [ORGANIZATION_LAYOUT.md](ORGANIZATION_LAYOUT.md). Build, wiki:test13, nowe testy3 i browser9 przy 1440/390/320/no-JS PASS; screenshoty rzeczywistej frakcji i demo odświeżone. Integralność123/210 bez zmian, oryginalny workspace nietknięty. Bez commita/push/deploymentu.

## Status layoutu i dalsze kroki (2026-10-23)

Utworzono zbiorczy [status Wiki Layout 2.0 i plan kolejnych kroków](WIKI_LAYOUT_STATUS_AND_NEXT_STEPS.md). Następnym krokiem merytorycznym jest przygotowanie opisu samej frakcji i przeprowadzenie go przez wymagany proces przeglądu treści. Dopiero potwierdzone informacje o członkostwie powinny trafić do rejestru relacji; obecne karty rzeczywiste pokazują wyłącznie postacie wymienione we wpisie. Po dodaniu tekstu należy ocenić dłuższy układ desktop/mobile i zebrać końcowe uwagi wizualne. Zmiany pozostają w izolowanym worktree, bez commita, push ani deploymentu.

### Wznowienie pracy — 2026-10-23

Ponownie uruchomiono lokalny podgląd na 127.0.0.1:8083. Build PASS (46 wyjść), wiki:test 13/13 PASS, testy organizacji 3/3 PASS, organization-browser-check 9/9 PASS i kontrast 34 par PASS. Pierwsze testy uruchomiono omyłkowo podczas przebudowy; błędy brakujących plików nie wystąpiły po zakończeniu buildu.

Pełny skrypt integralności nie przechodzi obecnie porównania oryginalnego workspace ze starym snapshotem. Osobna kontrola wszystkich hashy wykazała tam różnice w docs/PROJECT_STATUS.md i src/site/notes/Przedmioty.md; nie cofano tych zmian ani nie aktualizowano bazowego manifestu. Wszystkie 123 chronione pliki w worktree motywu nadal są identyczne ze snapshotem.

Źródłowy wpis frakcji zawierał wyłącznie dwa wikilinki, bez opisu. Poproszono DM o informacje znane graczom potrzebne do przygotowania tekstu; na tym etapie nie dopisano lore ani nie zmieniono rejestrów zgód. Brak commita, push i deploymentu.

### Opis frakcji — 2026-10-23

Po dostarczeniu treści przez DM i poleceniu dodania przygotowanego opisu uzupełniono wpis frakcji w worktree Dark Archive. Zachowano permalink i oba wikilinki; zarzuty zamachów pozostały podejrzeniem, bez inferencji członkostwa. Zastosowano aktualną zgodę tylko dla zmienionego wpisu przez mechanizm review/export/import, bez ręcznej podmiany hashy. Pozostałe zgody i rejestr relacji bez zmian.

Build PASS (46 wyjść), wiki:test 13/13 PASS, testy organizacji 3/3 PASS, przeglądarka 9/9 PASS (1440/390/320 px oraz no-JS). Sprawdzono wizualnie mobilny zrzut z opisem i kartami. Podgląd: http://127.0.0.1:8083/postacie/bregan-d-arthe/. Oryginalny vault i główny workspace nie były zmieniane; bez commita, push i deploymentu. Historyczny snapshot integralności poprzedza tę jawną zmianę notatki i rejestru zgody, więc jego pełnego wyniku nie należy obecnie przedstawiać jako PASS.

### Bardziej kompaktowe karty — 2026-10-23

**Korekta zakresu po doprecyzowaniu DM:** poniższa zmiana kart UI została cofnięta. Prośba dotyczyła obrazów kart przedmiotów z zasadami wewnątrz artykułów.

Na prośbę DM zmniejszono karty UI w warstwie Dark Archive: padding 24→18 px (16 px mobile), nagłówki katalogów 1.6→1.35 rem, miniatury frakcji 96→80 px (72→60 px mobile) i odstępy siatek. Karty powiązanych postaci przy lokacjach mają mniejszy padding i miniatury. Zachowano tekst artykułów, proporcje ilustracji i obszary akcji 44 px. Nie skalowano obrazów kart osadzonych w artykułach; pytanie doprecyzowujące zakres pozostało bez odpowiedzi podczas tej iteracji, przyjęto karty UI.

Build oraz testy wiki 13/13 i organizacji 3/3 PASS; kontrola motywu 24 warianty i organizacji 9 wariantów PASS (1440/390/320 px, w tym no-JS). Mobilny widok frakcji sprawdzono wizualnie. Źródła kampanii i zgody bez zmian w tej iteracji. Zmiana tylko w worktree motywu, bez commita/push/deploymentu.

### Skala obrazów kart zasad przedmiotów — 2026-10-23

Przywrócono poprzednie rozmiary kafelków, kart postaci i ikon. Artykuły zatwierdzonej kategorii items otrzymują klasę prezentacyjną item-rules-cards, która ogranicza obrazy do 520 px szerokości i szerokości dostępnej kolumny. Obrazy zachowują oryginalne proporcje i bajty; na wąskich ekranach wykorzystują dostępną szerokość. Karta zaklęcia towarzysząca przedmiotowi podlega temu samemu ograniczeniu. Pozostałe artykuły i ilustracje bez tej klasy nie są zmieniane.

Build PASS, wiki:test 13/13 PASS. Kontrola przeglądarkowa wszystkich sześciu zatwierdzonych wpisów przedmiotów przy 1440/390/320 px: 18 wariantów stron, 21 odczytów obrazów, limit szerokości/proporcje/brak overflow PASS. Desktopowy zrzut Staff of War z obiema kartami sprawdzono wizualnie; zrzuty są w ignorowanym .publication-review. Bez zmian lore, zgód, vaulta, commita/push/deploymentu.

### Zaznaczenie znacznika z kafelka mapy — 2026-10-23

Wspólny read-only viewer mapy synchronizuje teraz wybrany kafelek i znacznik przez aria-pressed. Wybrany punkt ma trwały podwójny pierścień, a kafelek wyróżniony brzeg i pogrubienie. Wybór działa po kliknięciu kafelka/znacznika i Enter/Space, pozostaje po zmianie fokusu i zoomie/resetowaniu widoku; kolejny wybór usuwa poprzednie wyróżnienie. Zachowano istniejące przesuwanie widoku do punktu poza kadrem. Nie zmieniono współrzędnych, źródeł ani polityki linków; brak funkcji Maps 2.0.

Build PASS, wiki:test 13/13 PASS. Rozszerzony map-browser-check PASS na syntetycznych danych (wybór wszystkich kafelków, jedna aktywna para, klawiatura, utrata fokusu, reset, dotychczasowy pan/zoom/pinch i polityka linków, 1440/390 px). Rzeczywisty lokalny podgląd: wszystkie 11 kafelków przy 1440/390/320 px, 33 wybory PASS, bez błędów JS/przepełnienia. Desktopowy zrzut sprawdzono wizualnie; pozostaje w ignorowanym .publication-review. Zmieniono tools/publication-review/map.js i map.css, src/wiki-ui/wiki.scss oraz scripts/map-browser-check.cjs. Bez zmian zgód i lore, commita/push/deploymentu.

### Maska Bekrita w rogu menu — 2026-10-23

Aktualizacja po ocenie DM: zamiast maski wybrano istniejący dragon-banner.png jako decorations.logo. Obraz w rogu menu ma stały obszar 48×54 px i object-fit:contain, bez przycinania. Jawne rozmiary obrazu zapobiegają rozciąganiu wiersza grid przez naturalne proporcje bannera. Build i kontrola 1440/390/320 px, panelu zwiniętego, drawera/Escape, linku Start i identyczności bajtów PASS; zrzut sprawdzono wizualnie. Nie zmieniono bannera w treści ani źródeł kampanii, bez commita/push/deploymentu. Poniżej historia poprzedniego wariantu z maską.

Na wskazanie DM znak archiwum obok nazwy wiki zastąpiono miniaturą dostarczonej ilustracji maski. Skopiowano bez zmian lorekeeper/examples/illustrations/bekrits-mask.png do src/wiki-ui/themes/assets/bekrit-mask.png. Jedna jawna rejestracja passthrough kopiuje wyłącznie ten zasób brandingu. Nie wykorzystano obrazu całej karty zasad ani nie włączono kopiowania katalogu ilustracji. Banner w treści bez zmian.

Opcjonalne decorations.logo w campaign-theme.json wybiera lokalny obraz brandingu; theme.cjs waliduje jego adres. Brak logo zachowuje dotychczasową ikonę. Miniatura mieści się w obszarze 48×54 px, zachowuje proporcje i pusty alt przy etykietowanym odnośniku Start. Działa w rozwiniętym i zwiniętym sidebarze oraz mobilnym drawerze.

Build PASS (46 stron, 9 kopiowanych plików), wiki:test 13/13 PASS. Kontrola logo 1440/390/320 px, zwiniętego panelu, drawera/Escape, linku Start, konfiguracji i identyczności bajtów PASS; zrzut rogu menu sprawdzono wizualnie. Pierwsza ścisła asercja wysokości wskazała subpikselowe zaokrąglenie 54.09375 px; kontrola dopuszcza różnicę poniżej 1 px. Bez zmian źródeł lore/rejestrów zgód, commita/push/deploymentu. Historyczny skrypt integralności nadal opisuje wcześniejszy snapshot i nie obejmuje tego dodatkowego jawnego zasobu UI.

### Pozioma lista znaczników na mobile — 2026-10-23

**Wariant zastąpiony po doprecyzowaniu DM:** docelowa jest wysokość panelu równa wysokości mapy i pionowe przewijanie listy, opisane poniżej.

Do 700 px kafelki znaczników w lokalnej wiki tworzą poziomo przewijaną listę. Lista i każdy kafelek mają szerokość ramki mapy; przewijanie jest ograniczone do listy, ze scroll-snap i bez poziomego przepełnienia strony. Opis wybranego punktu znajduje się pod listą. Desktop zachowuje pionową listę obok mapy. Lista ma nazwę dostępną i tabindex; przy wyborze znacznika na mapie jego kafelek jest dosuwany do widocznego obszaru bez przewijania całej strony. Zaznaczenie kafelka i punktu pozostaje zsynchronizowane.

Build PASS; wiki:test 13/13 PASS; dotychczasowy map-browser-check PASS na syntetycznych danych. Nowy scripts/wiki-map-mobile-browser-check.cjs PASS: 320/390/700 px, rzeczywisty gest dotykowy, klawiatura, ujawnienie ostatniego wybranego kafelka, położenie opisu, zgodność szerokości z mapą i brak overflow; desktop 1440 px zachowuje pionową listę. Test oczekuje zakończenia natywnej inercji i scroll-snap przed kolejną akcją. Mobilny screenshot sprawdzono wizualnie, pozostaje w ignorowanym .publication-review. Fizyczny telefon nie był testowany. Bez zmian źródeł/zgód, commita, push i deploymentu.

### Panel znaczników wysokości mapy — korekta mobile, 2026-10-23

### Przypięty pasek menu i wyszukiwania — 2026-10-23

Górny pasek ma position:sticky/top:0 na telefonie i desktopie. Warstwa z-index:2 pozostaje pod panelem bocznym, backdropem i modalnym drawerem; zachowano nieprzezroczyste tło. Zmienna wysokości paska 76/68 px ustala scroll-margin dla kotwic treści, tak aby nagłówki/skip link nie trafiały pod pasek. Przeglądarkowe próby wykazały skok strony przy globalnym scroll-padding na html; zamiast tego zastosowano scroll-margin tylko w treści. Przy odtwarzaniu fokusu po drawerze/wyszukiwaniu i ustawianiu pola wyszukiwania użyto preventScroll.

Build i wiki:test 13/13 PASS. Nowy wiki-sticky-header-browser-check PASS: 1440/390/844/320 px, przewijanie długiego artykułu, hit testing paska, wyszukiwarka i drawer po przewinięciu, fokus i zachowanie pozycji, zwinięty sidebar, kotwica main poniżej paska. Istniejące regresje wiki-browser-check i wiki-search-browser-check PASS przez wrapper Dark Archive. Mobilny screenshot sprawdzono wizualnie; zrzuty pozostają w ignorowanym .publication-review. Bez zmian treści i zgód, commita/push/deploymentu; brak testów fizycznych telefonów.

### Historia dopracowania panelu mapy

Najnowsza korekta DM: opis wybranego punktu jest nad listą znaczników również w orientacji poziomej (w całym zakresie mobilnego panelu, także dotykowe 1024×600). Usunięto osobny wyjątek tylko dla pionu. Wysokość ramki listy i pionowy scroll zachowane. Build oraz wiki-map-mobile-browser-check PASS: oba położenia ekranu i obrót w obie strony, pozycja opisu nad ramką, dotyk/klawiatura/selekcja/wysokość, desktop bez zmian. Poziomy zrzut sprawdzono wizualnie, bez wdrożenia/commita/push. Poniższe rozróżnienie położenia opisu między orientacjami jest historyczne.

Kolejna korekta DM: w orientacji pionowej do 999 px opis wybranego punktu pojawia się nad ramką znaczników, pod mapą. Orientacja pozioma zachowuje opis poniżej listy. Wysokość ramki i jej pionowy scroll nie zmieniają się po otwarciu opisu. Build i wiki:test 13/13 PASS; rozszerzone asercje wiki-map-mobile-browser-check PASS dla położenia opisu w obu orientacjach, również po obrocie telefonu w obie strony, oraz dotychczasowych gestów/klawiatury/wysokości/selekcji. Mobilny zrzut sprawdzono wizualnie; pozostaje w ignorowanym .publication-review. Bez zmian treści, zgód, commita/push/deploymentu.

Aktualizacja dla orientacji poziomej: ograniczenie panelu obejmuje teraz cały zakres mobilnego menu do 999 px oraz dotykowe ekrany poziome o wysokości do 600 px. Poprzednia granica 700 px pomijała telefon po obrocie. Nie zmieniono szerokości kolumn mapy; panel zachowuje wysokość SVG i pionowy scroll także obok mapy. Build i wiki:test 13/13 PASS. Rozszerzony wiki-map-mobile-browser-check PASS dla 320/390/700 px oraz poziomych 844×390, 932×430 i 1024×600; sprawdzono obrót 390×844→844×390→390×844, dotyk/klawiaturę, wybór punktu, stałą wysokość i brak overflow. Desktop 1440×1000 bez zmiany. Poziomy screenshot sprawdzono wizualnie, pozostaje w ignorowanym .publication-review. Brak testu fizycznego telefonu. Poniżej historia pierwszej korekty.

Po wyjaśnieniu DM usunięto poziomy pasek. Do 700 px osobna ramka znaczników ma szerokość i wysokość widocznej ramki SVG mapy. Wysokość jest przekazywana zmienną CSS aktualizowaną przez istniejący ResizeObserver/draw, więc reaguje na zmianę szerokości/orientacji. Nagłówek pozostaje nieruchomy, lista ma pionowy overflow-y:auto; opis wybranego punktu jest poza ramką, poniżej, i nie zmienia jej wysokości. Wybranie punktu na mapie dosuwa jego kafelek w lokalnym scrollu listy. Desktop zachowuje dotychczasowy układ.

Build PASS, wiki:test 13/13 PASS; zaktualizowany wiki-map-mobile-browser-check PASS (320/390/700 px, zmiana viewportu 390→600 px, wysokość/szerokość, pionowy gest dotykowy, klawiatura, ostatni kafelek, stabilna ramka po otwarciu opisu, brak poziomego overflow; 1440 px bez ograniczania listy). Regresja syntetycznej mapy map-browser-check PASS. Mobilny zrzut sprawdzono wizualnie i zachowano w ignorowanym .publication-review. Bez zmian współrzędnych, treści, zgód, vaulta, commita/push/deploymentu; brak testów fizycznego telefonu.

## Końcowy kandydat scalenia — 2026-10-24

Kandydat oparto na głównym HEAD e65fcc0a, zachowując Wiki Layout 2.0 z worktree 994d1c3b. Wspólne sekcje równoległych wersji tego pliku były zgodne. Zachowano nowszą i pełniejszą historię worktree; starszy, krótki wpis głównej gałęzi o dalszym kroku został oznaczony jako historyczny. Kopia wersji głównej pozostała w prywatnym pakiecie.

Przegląd rejestrów objął 18 notatek wskazanych w poprzednim raporcie: 11 nowych lokacji i 7 notatek drużyny/postaci. Ustalenie porównania z e65fcc0a: te 7 notatek było już w bazie, więc rzeczywisty diff względem głównego HEAD ma 11 nowych notatek, nie 18. Z 18 sprawdzonych notatek 13 ma aktywne zgody DM z pasującymi hashami; 5 nie ma aktywnej zgody i pozostaje poza projekcją publiczną. Wszystkie 3 zmienione notatki mają aktywne zgody z pasującymi hashami. Rejestrów nie zmieniano.

Nowszy Przedmioty.md z głównego workspace zachowano dokładnie; nie ma aktywnego wpisu zgody i nie trafia do zatwierdzonego preview. Pełna walidacja całego repozytorium nadal blokuje publikację z powodu pozostałych niezatwierdzonych wejść.

Przestarzałe odnośniki Dark Archive do nieprzenoszonych baseline, zrzutów i historycznego testu integralności uporządkowano. Raport diffu: docs/DIFF_REVIEW.md. Szczegółowe wyniki końcowej walidacji, buildu preview i regresji przeglądarkowej podaje ten raport.

Stan historyczny przed integracją: kandydat nie był jeszcze scalony. Blokada produkcyjnego buildu pozostawała aktywna; nie wykonano wtedy pushu ani deploymentu. Aktualny stan opisuje poniższa sekcja „Uzgodnienie Wiki Layout 2.0”.

## Uzgodnienie Wiki Layout 2.0 — 2026-10-24

Finalny kandydat został uzgodniony z bieżącym workspace gałęzi `feat/wiki-layout-2`. Preflight 84 rozbieżności wykazał 49 nowych ścieżek i 35 zmian istniejących plików; nie było konfliktów źródłowej treści ani zgód wymagających decyzji. Zachowano nowszy `Przedmioty.md`, aktualne permalinki oraz komplet 45 aktywnych hashy zatwierdzeń kandydata. Trzy zmienione notatki mają zgodne aktywne zgody.

Dodane `.gitattributes` wyłącza konwersję końców linii dla notatek, aby zachować bajty powiązane ze zgodami. W rezultacie Git pokazuje surową różnicę bajtów dla 29 śledzonych notatek względem HEAD: 26 różni się wyłącznie końcami linii, a 3 to zatwierdzone zmiany treści. Hashe aktywnych zgód są zgodne; źródła zachowano bajtowo względem bieżącego workspace.

Późniejsze decyzje DM oznaczają pięć notatek jako `denied`; historia wcześniejszej decyzji `approved` dla jednej z nich została zachowana jako zdarzenie zastąpione. Odmowy nie nadały zgody innym oczekującym materiałom. Lokalna projekcja ma 28 artykułów, 17 zasobów i 28 rekordów wyszukiwania; pięć denied i dziewięć pending nie ma tras, linków w katalogach ani rekordów wyszukiwania.

Wyniki: `wiki:build` PASS (58 stron), `wiki:test` PASS (18/18), `publication:test` PASS (60/60), test organizacji PASS (3/3). Wszystkie 11 regresji przeglądarkowych przeszło na Playwright 1.64.1 i Edge headless, w tym mobile/desktop, Dark Archive/DragonBanner, wyszukiwanie, encje, mapa, nawigacja i sticky header. `publication:validate` BLOCKED zgodnie z projektem: 65 `UNAPPROVED_INPUT`, 5 `DENIED_INPUT`.

Integracja Wiki Layout 2.0 i Dark Archive została ukończona lokalnie na gałęzi `feat/wiki-layout-2`. Produkcyjny build pozostaje zablokowany; nie wykonano pushu ani deploymentu. Oryginalny vault i `.obsidian` nie były modyfikowane. Następny etap implementacji podglądu publikacyjnego opisuje sekcja poniżej.

## Kontrolowany build z zatwierdzonego modelu — 2026-10-24

Dodano `npm run publication:build-preview`, oddzielny generator stron, katalogów, wyszukiwarki, grafu jawnych relacji, sitemap, feedu i zatwierdzonych rastrowych assetów. Renderowanie korzysta z `prepareLocalArticles()` i nowych szablonów `production/site/`; demo oraz surowe wejściowe drzewo Eleventy nie są kopiowane. Katalog wyjściowy przechodzi dokładną kontrolę dozwolonych plików i tras, odnośników, zakresów kanałów oraz hashy assetów i runtime. Manifest hashy jest przechowywany poza katalogiem strony.

Build tworzy wyłącznie lokalny, nieindeksowalny preview pod ignorowanym `.publication-build/preview-*`. Ma `noindex,nofollow` oraz `Disallow: /`. Nie jest podłączony do Vercel ani `dist`. Dotychczasowy `npm run build` i `assertProductionBuildAllowed()` pozostały bez zmian. Pięć denied i niezatwierdzone materiały nie wchodzą do projekcji. Nie zatwierdzano żadnych nowych treści ani assetów.

Wynik bieżący: preview 65 plików, 38 tras, 28 rekordów wyszukiwarki, 28 węzłów grafu, 17 zatwierdzonych assetów, 0 elementów RSS. `wiki:test` 19/19 PASS, `publication:test` 65/65 PASS, test wyjściowego katalogu 5/5 PASS, smoke test Edge desktop/mobile PASS. Pełna `publication:validate` pozostaje BLOCKED: 65 `UNAPPROVED_INPUT`, 5 `DENIED_INPUT`. Banner DragonBanner i maska Bekrita są pominięte: nie mają aktywnych rekordów w rejestrze zatwierdzonych assetów. `PUBLICATION_SITE_URL` akceptuje HTTPS, ale wymaga jeszcze allowlisty hosta przed jakimkolwiek release.

Szczegóły i pozostałe wymagania przed release: [PRODUCTION_BUILD.md](PRODUCTION_BUILD.md). Produkcyjny build pozostaje zablokowany. Nie wykonano pushu ani deploymentu dla tej iteracji.

## Widoczność maski w katalogu przedmiotów — 2026-10-24

Na prośbę DM Bekrit’s Mask została ukryta wyłącznie z listy `/catalog/items/` w preview prototypu i kontrolowanym preview publikacyjnym. Jej zatwierdzony artykuł, permalink `/przedmioty/bekrits-mask/`, wyszukiwarka i pełny spis zatwierdzonych wpisów pozostają bez zmian. Nie zmieniono notatki ani rejestru zgód. `wiki:test` 19/19 PASS; oba buildy preview PASS; kontrola HTML potwierdziła ukrycie na liście i zachowanie artykułu/search. Lokalny podgląd: http://127.0.0.1:8086/.

Aktualizacja 2026-10-24: DM poprosił o całkowite wycofanie Bekrit’s Mask z Production po znalezieniu jej przez „Wszystkie wpisy”. Jawnie odmówiono publikacji artykułu oraz jego unikalnej karty, zachowując źródłowe pliki. Usunięto prezentacyjną regułę ukrywania z katalogu. Build produkcyjny nie zawiera permalinku, obrazu ani rekordu wyszukiwarki dla tego wpisu. `publication:build` PASS; `publication:test` 75/75; `wiki:test` 20/20. Wymagany deployment, by zmiana stała się widoczna na domenie.

## Przygotowanie wydania Vercel — 2026-10-24

Przeprowadzono audyt nowego generatora i Vercel: [VERCEL_RELEASE_AUDIT.md](VERCEL_RELEASE_AUDIT.md). Wynik to **NO-GO dla wdrożenia**. `vercel.json` nadal uruchamia zablokowany legacy build do `dist`; generator tworzy wyłącznie lokalny preview z `noindex,nofollow` i `Disallow: /`. Nie zmieniono `assertProductionBuildAllowed()`, nie wykonano pushu ani deploymentu.

DragonBanner jest używany w Dark Archive jako banner i logo menu. Maska Bekrita nie jest używana przez aktywny motyw. Oba bajtowo zgodne pliki są teraz osobnymi materiałami `pending` w istniejącym review DM: `asset-1256c741d3f2a0c7d642` (DragonBanner) oraz `asset-7a71166caed13c72f914` (maska). Nie dopisano zgód. Generator pokaże DragonBanner po zatwierdzeniu jego dokładnego assetu; maska pozostaje poza wyglądem motywu.

Wzmocniono walidację outputu: kontrola origin sitemap/feed, referencji HTML `srcset` i CSS `url()`, oraz jawny host `https://fundelverwiki.vercel.app`. Build preview PASS (65 plików; 38 tras; 28 search i 28 graph; 17 zatwierdzonych assetów); dwie nowe grafiki pending nie wystąpiły w artefakcie ani referencjach. `publication:test` 70/70, `wiki:test` 19/19. Pełna walidacja nadal BLOCKED: 67 `UNAPPROVED_INPUT`, 5 `DENIED_INPUT`.

Zależności są obecne (`npm ls --depth=0` bez braków), lecz sprawdzone środowisko to Node 24.22.0/npm 11.19.1, a projekt wymaga Node 22.x; czyste `npm ci` na Node 22 pozostaje niezweryfikowane. Nie ma jeszcze osobnej konfiguracji release, stagingowego hosta ani reguł cache Vercel. Plan testowania, akceptacji dokładnego manifestu, stagingu, wydania i bezpiecznego rollbacku znajduje się w raporcie audytu.
## Decyzja DM — DragonBanner i maska Bekrita — 2026-10-24

DM jawnie zatwierdził dwa zasoby przez lokalny przegląd i import z potwierdzonym diffem. Aktywne wpisy mają status `approved`: DragonBanner `asset-1256c741d3f2a0c7d642` (SHA-256 `428745c881c0de3e3ea48e1ada4b03db6091971545936b05e499b3b30632c5e3`) oraz maska Bekrita `asset-7a71166caed13c72f914` (SHA-256 `64304fec70a322c86efdf23e1747dac9969a673833b0def3a206b824b6bd1973`). Zgody zachowały się w prywatnej historii, a importer zapisał receipt transakcji. Pozostałe materiały nie otrzymały zgody.

Po imporcie `publication:status` wykazuje 47 approved, 65 pending i 5 denied; pięć odmów pozostało bez zmian. `publication:build-preview` PASS: 67 plików, 38 tras, 28 wpisów wyszukiwania i węzłów grafu, 19 zatwierdzonych assetów, 0 elementów RSS; obie grafiki znajdują się w artefakcie. `publication:test` 70/70 i `wiki:test` 19/19 PASS. `publication:validate` pozostaje BLOCKED z 65 `UNAPPROVED_INPUT` i 5 `DENIED_INPUT`. Ocena wdrożenia nadal NO-GO; produkcyjna blokada pozostała aktywna.

## Produkcyjny build Wiki Layout 2.0 — 2026-10-24

Dodano `npm run publication:build` jako produkcyjny tryb tego samego generatora i modelu zatwierdzonych DTO, którego używa `publication:build-preview`. Preview pozostał nieindeksowalny. Build produkcyjny zapisuje zwalidowany katalog do `.publication-build/production`; `vercel.json` używa `npm ci`, `npm run publication:build` i tego katalogu. Zachowano dotychczasowy projekt/domenę Vercel, stare `npm run build` i `assertProductionBuildAllowed()`.

Build PASS: 67 plików, 38 tras w sitemapie, 39 plików HTML z canonical, 28 wpisów wyszukiwania, 28 węzłów grafu, 19 zatwierdzonych assetów, jeden atlas Neverwinter z 11 znacznikami, 0 wpisów RSS. HTML nie ma `noindex,nofollow`; `robots.txt` zezwala na indeksowanie i wskazuje sitemapę. Walidator sprawdza pełny zestaw plików, trasy, relacje, referencje, canonical, sitemap, RSS oraz hashe assetów/runtime. Canary pending/denied nie występują.

`publication:test` 72/72 i `wiki:test` 19/19 PASS; `publication:build-preview` również PASS. Pełne `publication:validate` nadal zgłasza 65 `UNAPPROVED_INPUT` i 5 `DENIED_INPUT`; produkcyjny generator publikuje wyłącznie zweryfikowany zatwierdzony model i nie wymaga zmian pozostałych decyzji DM. Lokalny build był uruchomiony na Node 24.22.0, a Vercel powinien użyć Node 22.x wskazanego w `package.json`; Node 22 nie był dostępny w tej sesji do lokalnego sprawdzenia. Nie wykonano pushu ani deploymentu.

## Przygotowanie Vercel Preview — 2026-10-24

`npm ci` wykonano z lockfile pod Node 22.23.4; `package-lock.json` pozostał bez zmian. `npm run publication:build` PASS: 67 plików, 38 tras, 28 rekordów wyszukiwania i grafu oraz 19 zatwierdzonych assetów. Build uruchomiony z `VERCEL_ENV=preview` korzysta z tego samego generatora, lecz tworzy wariant `noindex,nofollow` i `robots.txt` z `Disallow: /`; kontrola 39 stron HTML potwierdziła brak canonical i obecność noindex. Produkcyjny tryb nadal generuje indeksowalne strony z canonical i sitemapą. Stary `assertProductionBuildAllowed()` pozostał nietknięty.

`publication:test` PASS 72/72, `wiki:test` PASS 19/19. Bezpośrednie `npm test` nie jest poprawnym runnerem dla obecnego zestawu: Vitest znajduje pliki używające `node:test`, a także prywatne kopie worktree; wywołanie kończy się „No test suite found” i nie jest wynikiem regresji projektu. `npm ci` zgłosiło 16 podatności w zależnościach (2 moderate, 13 high, 1 critical); zależności nie były aktualizowane w tej iteracji.

`vercel.json` jawnie ustawia install/build/output, a Vercel dokumentuje, że `buildCommand` i `outputDirectory` z pliku nadpisują te wartości z ustawień projektu. `package.json` wskazuje Node `22.x`. Nie ma lokalnego linku `.vercel` ani CLI/sesji konta, więc nie potwierdzono Production Branch, Root Directory ani ustawień deploymentu istniejącego projektu. Przed uruchomieniem Preview trzeba w panelu sprawdzić, że `feat/wiki-layout-2` nie jest Production Branch; Vercel przypisuje Preview/Production według tej konfiguracji. Nie wykonano pushu ani deploymentu.

## Punkt wznowienia — Vercel Preview

Pracę wznowić od lokalnego commita `e6d7289` na `feat/wiki-layout-2`. Nie wykonano pushu ani deploymentu. Przed uruchomieniem Preview sprawdzić w istniejącym projekcie Vercel, czy Production Branch nie jest `feat/wiki-layout-2` i czy Root Directory wskazuje repozytorium `fundelverwiki`; następnie wypchnąć commit na gałąź preview i zweryfikować wynik buildu oraz `noindex,nofollow`. Nie promować do Production. Osobno: podczas poprzednich testów ekran użytkownika na chwilę gasł; przyczyna nie została ustalona.

## Weryfikacja projektu Vercel i powtarzalnego Preview — 2026-10-24

Odczytano istniejący panel Vercel: projekt `fundelverwiki` jest połączony z `dprusik/fundelverwiki`, Production śledzi `main`, Root Directory jest pusty (główny katalog repozytorium). Ustawień nie zmieniano. `git ls-remote` potwierdził zdalny `main` na `e65fcc0a` i brak gałęzi `feat/wiki-layout-2`.

Ponowne `publication:test` 72/72 i `wiki:test` 19/19 PASS. Powtórny build z `VERCEL_ENV=preview` wykrył kolizję stałego `production.manifest.json` przy zapisie z `wx`. Generator używa teraz unikalnego UUID dla manifestów stałego katalogu wyjściowego i jawnie oznacza manifest Vercel Preview jako `vercel-preview`; zachowuje wcześniejsze manifesty poza katalogiem strony. Dwa kolejne buildy Preview po poprawce PASS: po 67 plików, 38 tras, 28 rekordów search/graph i 19 assetów; walidator trybu preview sprawdził noindex i blokadę robots. Testowane w tej sesji na Node 24.22.0; poprzedni test Node 22 pozostaje odrębnym dowodem historycznym.

Nie wykonano commita, pushu ani deploymentu. Poprawka manifestu i dokumentacja czekają na zgodę na commit oraz wysłanie gałęzi Preview. Nie promować do Production.

## Vercel Preview uruchomiony — 2026-10-24

Po jawnej zgodzie DM utworzono commit `4110b41` (poprawka manifestów i dokumentacja) i wypchnięto `feat/wiki-layout-2` do `origin`. Nie dodawano nieśledzonego `.codex/`. Automatyczny deployment Vercel `HFmutfniuVYr2sDgzy4fisYCNZet` zakończył się statusem **Ready** jako **Preview**, dla SHA `4110b41a9b2b0c97d9551763914241c30c4359ad` (21 s).

Adres: https://fundelverwiki-m2y9k4khz-dprusiks-projects.vercel.app/ . W zalogowanym Vivaldi potwierdzono stronę główną i branding, wyszukiwanie Neverwinter (14 wyników), przejście do kanonicznego artykułu, osobny atlas oraz listę 11 znaczników. Wdrożony `robots.txt` zawiera `User-agent: *` i `Disallow: /`. Anonimowy HTTP zwraca 302 do Vercel Authentication i `X-Robots-Tag: noindex`; ochrony nie zmieniano. Nie wykonano pełnej regresji przeglądarkowej na zdalnym Preview ani testów fizycznego telefonu.

Production w panelu nadal wskazuje poprzednie wdrożenie `e65fcc0` z `main`; nie scalano gałęzi ani nie promowano Preview. Ten wpis wynikowy jest lokalną aktualizacją dokumentacji po wdrożeniu.

## Korekta formatowania dziennika Tergona — przygotowana lokalnie, 2026-10-24

DM zgłosił ramkę i inny krój pisma w akapicie po zdaniu o uklęknięciu przy chorym. Przyczyną był pojedynczy tabulator na początku kolejnego akapitu: Markdown renderował go jako `pre/code`. Usunięto dokładnie jeden bajt tabulatora w repozytoryjnej kopii `Dziennik Terogona - wpis I.md`, zachowując pozostałe bajty, CRLF, treść, permalink i oryginalny vault. Nie zmieniano globalnego renderera ani stylów bloków kodu.

Sprawdzenie przy użyciu `renderApprovedMarkdown` PASS: poprzedni HTML zawierał blok kodu, nowy zwykły akapit; pełny widoczny tekst artykułu jest identyczny. Porównanie bajtów z HEAD potwierdza usunięcie wyłącznie jednego tabulatora. `git -c core.whitespace=cr-at-eol diff --check` PASS. Rejestru zgody nie zmieniano: hash źródła wymaga teraz celowanego ponownego zatwierdzenia i importu przed następnym buildem. Nie wykonano commita ani pushu korekty; zdalny Preview nadal zawiera poprzednią wersję.

### Zgoda DM i weryfikacja przed publikacją korekty

DM jawnie polecił opublikować przygotowaną korektę. Przez istniejący `createReview` zapisano ponowny przegląd jednego źródła; eksport ograniczono do tego wpisu, sprawdzono diff i zastosowano `publication:import` z potwierdzeniem konkretnego planu. Import zmienił wyłącznie SHA-256 i `reviewed_at` artykułu, zachowując pozostałe metadane, ID, URL, relacje i zgodę obrazu. Transakcja: `ccee550c-8e53-414a-a2e0-6c85c036b8c6`.

Build w trybie `VERCEL_ENV=preview` PASS (67 plików, 38 tras, 28 search/graph, 19 assetów). Kontrola końcowego HTML dziennika potwierdziła zwykły akapit zamiast `pre/code`. `publication:test` 72/72 i `wiki:test` 19/19 PASS. Zakres publikacji: gałąź `feat/wiki-layout-2` i Vercel Preview; bez scalenia do `main` i promocji Production.

## Lżejsze ilustracje — przygotowane lokalnie, 2026-10-24

Po zgłoszeniu wolnego ładowania potwierdzono, że portrety pobierały pełne PNG 2,7–3,9 MB, ilustracja dziennika 3 MB, a logo 1,4 MB. Nowy `image-variants.cjs` korzysta z już zainstalowanego `@11ty/eleventy-img`, bez zmian zależności projektu. Tworzy WebP (quality 82, szerokości 96/320/640/960/1440, bez powiększania i kadrowania) wyłącznie z zatwierdzonych bajtów zwróconych przez `prepareLocalArticles`. Nie odczytuje innych plików ani sieci. Karty przedmiotów i obraz mapy są wyłączone z optymalizacji.

Generator kontrolowany zapisuje 38 pochodnych pod URL zawierającymi pełny SHA-256 ich bajtów. Są częścią dokładnej allowlisty i walidacji hashy outputu; usunięcie zgody usuwa też pochodne przy kolejnym czystym buildzie. Transformacja HTML podmienia `src`, dodaje `srcset`/`sizes`, asynchroniczne dekodowanie i wymiary ilustracji; ilustracje w artykułach są ładowane leniwie. Portrety, małe logo i karty postaci mają rozmiar pobierania dobrany do slotu. Oryginały zachowują identyczne bajty i URL. Powiększenie korzysta z oryginalnego `href`, również bez JavaScript; modal nie pobiera oryginału przed kliknięciem. Treści notatek, rejestry zgód i polityka cache Vercel pozostały bez zmian.

`publication:test` 74/74, `wiki:test` 19/19 PASS. Build Preview PASS: 105 plików, 38 tras, 28 search/graph, 19 oryginalnych assetów i 38 pochodnych. Nowy `wiki-image-performance-browser-check.cjs` PASS w Edge headless przy 1440/390/320 px: dobór wariantu, brak pobrania oryginału przed kliknięciem, modal z oryginałem, Escape/fokus, brak overflow i błędów JS oraz oryginał bez JS. Bekrit pobiera 30 518 B zamiast 3 076 810 B; ilustracja dziennika 116 760 B na desktopie, 53 820 B przy 390 px i 15 002 B przy 320 px zamiast 3 036 921 B. To pomiar wybranego pliku/transferu, nie gwarancja czasu ładowania na Vercel. Zrzuty portretu i ilustracji na telefonie sprawdzono wizualnie; są w ignorowanym `.publication-review/image-performance`. Mapa 6,3 MB oraz karty nadal używają pełnych oryginałów.

Optymalizacja jest lokalna; nie wykonano commita, pushu ani nowego deploymentu. Rzeczywista wydajność zdalnego Preview pozostaje do sprawdzenia po publikacji.

### Publikacja optymalizacji w Preview — 2026-10-24

Po jawnej zgodzie DM zapisano i wypchnięto commit `5e5e3ca` na `feat/wiki-layout-2`. Vercel zakończył deployment `CEp9nPQaXoJv5kQurKjMFg2e1Cdy` statusem Ready jako Preview: https://fundelverwiki-2nru95b0l-dprusiks-projects.vercel.app/ . W zalogowanej przeglądarce sprawdzono wygląd portretu Bekrita, działanie modalu i odnośnik do oryginalnego PNG. Odczyt źródła zdalnego HTML potwierdził `/img/optimized/`, WebP, `srcset` i `noindex,nofollow`. Nie mierzono zdalnego czasu pobierania ani prędkości na fizycznym telefonie. Nie zmieniano Production, nie scalano gałęzi. Ten wpis wynikowy jest lokalną aktualizacją dokumentacji po wdrożeniu.

## Weryfikacja aktualnego Preview — 2026-10-24

DM pozostawił dalszą ocenę szybkości portretów do feedbacku graczy i polecił wrócić do przeglądu Preview. Zdalnie sprawdzono katalog przedmiotów, panel desktop i Ctrl+K, wyszukiwanie i brak wyników, organizację i linki do postaci, pustą Kronikę, atlas/11 znaczników i obustronne przejście do artykułu lokacji oraz własną stronę błędu z globalnym szukaniem i linkiem do Start. Lokalny bieżący artefakt przeszedł build, 111 kontroli stron/viewportów oraz testy wyszukiwarki na 3 szerokościach. Oryginalny test wyszukiwarki oczekiwał demo; dla wydania publikacyjnego jawnie sprawdzono jego brak i działające szukanie na 404, bez zmiany testu prototypu.

Szczegóły, rozdzielenie wyników lokalnych/zdalnych, timeout historycznego scenariusza i ograniczenia: [PREVIEW_VERIFICATION.md](PREVIEW_VERIFICATION.md). Nie wykryto błędu blokującego w sprawdzonym zakresie; odnotowano nieaktualne etykiety „podgląd lokalny” i komunikat o zablokowanym buildzie w atlasie. Szablonów, zgód i produkcji nie zmieniano. Raport pozostaje lokalny, bez commita/pushu/deploymentu.

## Końcowe poprawki i przygotowanie przejścia na Production — 2026-10-24

Na polecenie DM poprawiono stopkę Preview na „Zatwierdzone treści · wersja podglądowa” i status atlasu na „Zatwierdzona mapa · 11 znaczników.”. Zmiany dotyczą tekstów, nie walidacji ani reguł dostępu. `vercel.json`, legacy guard, rejestry DM, notatki, permalinki, oryginalne assety i vault pozostały bez zmian.

Na działającym Preview `5e5e3ca` potwierdzono w panelu Network rzeczywiste **HTTP 404 Not Found** dla dokumentu `/preview-verification-not-found/`. Nie trzeba naprawiać routingu. Nowy zwykły runner `npm run publication:test:browser` obsługuje artefakt publikacyjny i uruchamia istniejące kontrole, w tym `wiki-search-browser-check.cjs --publication` bez zależności od `/demo/` i ignorowanych adapterów. Dodano Playwright 1.64.1 do devDependencies i lockfile; nie aktualizowano pozostałych zależności. Lokalna kontrola GET/HEAD obejmuje brakującą trasę katalogową i `.html`, szablon wiki, szukanie oraz powrót do Start.

Buildy Preview i Production PASS (105 plików, 38 tras, 28 rekordów search/graph, 19 oryginalnych assetów i 38 pochodnych, atlas z 11 znacznikami). Oryginały w output porównano bajt po bajcie. Końcowe kontrole wykonano na Node 22.23.4: wiki + organizacje 22/22, publikacja 74/74; przeglądarka Edge/Playwright: 111 kombinacji stron/viewportów, 3 szerokości wyszukiwania, 44 przejścia atlas–lokacja–atlas, mobilny panel/obrót/dotyk, 6 widoków ilustracji i oryginały bez JS PASS. Wcześniejszy przebieg npm na Node 24.22.0 również przeszedł. Nie testowano fizycznych telefonów.

Procedura uruchomienia testów, zakres zmian, wynik 404 i instrukcja finalne Preview → istniejący projekt Vercel → `main`/Production: [PRODUCTION_SWITCHOVER.md](PRODUCTION_SWITCHOVER.md). Odbiór wskazanych poprawek jest domknięty lokalnie; do wydania pozostaje zapis/wysłanie końcowego commita, finalne Preview i jawna decyzja o Production. Nie wykonano commita, pushu, scalenia ani deploymentu tej iteracji. Nowego audytu całego projektu nie rozpoczynano.

## Dodatkowe poprawki graficzne przed finalnym Preview - 2026-10-24

Menu boczne używa teraz grafiki `rosedim.png` jako róży wiatrów. Asset zoptymalizowano do WebP 320 px (37 612 B); dekoracja hero zachowała dotychczasowy SVG. Kafle katalogu postaci pokazują miniatury zatwierdzonych portretów, a sześć kafli przedmiotów używa kadrów samej ilustracji bez tekstu karty. Oryginalne obrazy artykułów i notatki nie zostały zmienione.

Build kandydata Production PASS: 112 plików, 38 tras, 28 search/graph, 19 oryginalnych zasobów, 38 wcześniejszych wariantów, 6 miniatur przedmiotów i 11 znaczników. `wiki:build` PASS; wiki i organizacje 22/22; publikacja 74/74. Playwright PASS: 111 kontroli stron/viewportów, miniatury i asset róży, wyszukiwanie na 3 szerokościach z HTTP 404 GET/HEAD, 44 przejścia atlas-lokacja, mapa mobilna i sześć testów obrazów.

Zmiany pozostają lokalne względem Preview `5e5e3ca`. Nie wykonano commita, pushu ani wdrożenia; decyzje DM, permalinki i vault pozostały bez zmian. Końcowy Preview powinien powstać z nowego commita przed decyzją o Production.

## Location tile images

`src/wiki-ui/templates/approved-card.njk` reuses the same approved illustration as a thumbnail on location tiles. Parent location directory tiles use that illustration too. The current approved publication data contains no location illustration asset, so there are currently 0 location thumbnails; unapproved or inferred images are not used.


## Portrait catalog sizing and section routes

Character catalog portraits now use the faction-card footprint (96 x 116 px), object-fit cover, and the same top-biased crop/scale as portraits in article headers. The Playwright check asserts dimensions and crop settings.

The visible section labels are Polish. Their section URLs remain `/catalog/<id>/`: `catalog.cjs` defines English technical IDs (for example `characters`) and the page/navigation templates build the URL from that ID. Article URLs come separately from `src/wiki/public-entries.json` and preserve the existing Obsidian permalinks such as `/postacie/bekrit/`. Localizing section routes later should keep the current `/catalog/...` URLs resolvable, for example through redirects.


## Dependency advisory snapshot

`npm audit` checked against the npm registry on 2026-10-24: 16 findings (2 moderate, 13 high, 1 critical), with no dependency changes made. Main groups: critical `shell-quote` via `npm-run-all`; high `axios`/`follow-redirects`, `brace-expansion`, `js-yaml`, `markdown-it`, `sharp`, `image-size`, `picomatch`, `source-map-js`, `nanoid`, and Vite; moderate `@vitest/mocker`. The static Vercel build command invokes the publication generator directly and does not run `npm-run-all`, the legacy `axios` theme-fetch script, Vite, or Vitest. `markdown-it`, `js-yaml`, and `sharp` do execute in the build on approved content/assets, so malformed or hostile reviewed inputs could affect build availability. The generated site is static; these findings do not imply those package code paths run for visitor requests. npm reported no available fix for the current sharp/libvips advisory set. Full auto-fix was intentionally not run.


## Final sidebar copy

Updated the sidebar rail note to the requested campaign line: "To kiedy level up?". This is included in the follow-up commit for the final Preview.

# Wiki Layout 2.0 i Dark Archive — Production zakończone (2026-10-24)

Migracja została scalona do `main` przez PR #7. Commit wdrożenia aplikacji: `9daa026425a25783f93e397c4c6a01737baffcd3`. Vercel deployment `GgfhHU3AJ61DJVXQRVbTLTkBusb8` (`https://fundelverwiki-iwyl28rc1-dprusiks-projects.vercel.app/`) uzyskał status Ready w istniejącym projekcie `dprusiks-projects/fundelverwiki`; domena `https://fundelverwiki.vercel.app/` odpowiada nową wersją.

Zakres publiczny wydania: 27 artykułów, 18 oryginalnych zasobów i atlas Neverwinter z 11 zatwierdzonymi znacznikami. Gerwazy i jego portret pozostają wycofane z publicznej projekcji. Produkcyjny artefakt zawierał 105 plików/37 tras, 27 wpisów wyszukiwania i grafu, 33 zoptymalizowane obrazy oraz 6 miniaturek przedmiotów. Zachowano permalinki i źródłowy vault Obsidiana; rejestry decyzji pozostały bez zmian. Nie wdrożono procesu publikacji ani Map Maker 2.0.

Kontrole lokalne przed merge: `wiki:build` (57 wyjść), `wiki:test` 20/20, test organizacji 3/3, `publication:test` 75/75 i `publication:test:browser` PASS; produkcyjny `publication:build` PASS. Zdalny smoke test domeny: strona główna, katalogi postaci/organizacji/lokacji/przedmiotów, atlas, artykuł Neverwinter, Bekrit, Staff of War, approved-search, graph, sitemap i robots zwróciły HTTP 200; losowa nieistniejąca ścieżka zwróciła HTTP 404. Atlas zawierał 11 danych znaczników i 11 celów lokacji; katalogi zwróciły karty z miniaturami. W HTML strony głównej potwierdzono „To kiedy level up?”, w Bekricie pisownię „Fulmareth”; wyszukiwarka i graf nie zawierają Gerwazego. Sitemap używa kanonicznej domeny produkcyjnej, robots.txt zezwala na indeksowanie, a HTML produkcyjny nie zawiera `noindex`/`nofollow`. Nagłówki produkcji nie zawierają `X-Robots-Tag: noindex`.

Dark Archive, sidebar i menu, katalogi, obrazy i nawigacja sprawdzone zdalnie lub w testach przeglądarkowych. Nie wystąpił błąd blokujący.
