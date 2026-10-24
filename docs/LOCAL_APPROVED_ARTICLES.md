# Zatwierdzone artykuły w lokalnym prototypie

Aktualizacja 2026-10-24, worktree Dark Archive: po poleceniu DM dodano 11 artykułów lokacji opartych wyłącznie na zatwierdzonych znacznikach Neverwinter i zaktualizowano ich data-url w źródle mapy. Lokalny model ma teraz 28 notatek (w tym mapę) i 17 zasobów; nadal 70 wejść pending. Wszystkie 11 celów mapy jest zatwierdzonych, każda lokacja ma link powrotny do Neverwinter. Nowe lokacje są w /catalog/locations/ i approved-search.json. Build, wiki:test 13/13, publication:test 59/59, 44 przeglądarkowe przejścia mapa→lokacja→mapa i regresja mobilnej mapy PASS. Szczegóły w PROJECT_STATUS.md; pozostała część tego dokumentu opisuje wcześniejszy etap. Bez produkcyjnego wdrożenia.

Stan: 2026-10-23, gałąź `feat/wiki-layout-2`. Jest to lokalny podgląd; produkcyjny generator pozostaje zablokowany.

## Import istniejących decyzji

Ponownie odczytano prywatną historię 35 aktualnych decyzji dotyczących 18 notatek i 17 załączników. Wcześniejsze eksporty miały nieaktualną bazę po imporcie mapy. Przygotowano świeżą propozycję z 34 istniejących decyzji; importer wykazał 32 zmiany (16 notatek i 16 załączników), a mapę i jej obraz rozpoznał jako już zastosowane. Po sprawdzeniu planu zastosowano import z prywatnym dziennikiem poza workspace. Nie dodano żadnej nowej zgody ani odmowy.

Aktywne rejestry: **17 notatek, w tym mapa, i 17 załączników; 70 wejść nadal pending**. Jeden zapisany lokalnie zatwierdzony wpis pominięto z powodu nierozwiązanego wikilinku. Jego zgoda i historia pozostają zachowane. Pominięcie nie stanowi odmowy ani zgody na usunięcie odnośnika. Potrzebne jest wskazanie właściwego celu lub osobna zmiana źródła i przegląd nowych bajtów.

Wybrany eksport jest osobną propozycją, nie zmianą decyzji. API `review.proposal(sourceKeys)` przygotowuje ją bez zapisu, a `review.exportProposal(sourceKeys)` tworzy nowy plik w dotychczasowym prywatnym magazynie. Odrzuca nieznane, powtórzone i pozbawione aktualnej decyzji klucze. Import nadal sprawdza pełny scalony model, hashe, historię i zależności. Pełny eksport w panelu zachowuje poprzednie zachowanie i może nadal wymagać wyjaśnienia pominiętego wpisu.

## Uruchomienie i granice

Uruchom `npm run wiki:dev` i otwórz `http://127.0.0.1:8081/`. Strona główna i sześć katalogów zawierają zatwierdzone treści; `/approved/` to pełny spis podzielony na grupy. Organizacje mają osobny katalog `/organizations/` i osobną podsekcję przy postaciach. Wpisy są sortowane alfabetycznie według polskich reguł, a adresy artykułów pozostają bez zmian. Kategorie i rodzaje pochodzą z zatwierdzonych metadanych; nie dopisano dat, afiliacji ani relacji.

Demo interfejsu przeniesiono pod `/demo/`, z własnymi katalogami, encjami i osobną wyszukiwarką. Główna wiki ma teraz [wyszukiwanie zatwierdzonych treści](WIKI_SEARCH.md), bez wyników demo. Znaczniki mapy nadal zachowują uzgodnioną politykę odnośników.

Artykuły pochodzą tylko z aktualnych aktywnych zgód. Renderer sprawdza odnośniki i obrazy również po rozpoznaniu składni referencyjnej przez parser Markdown. Nie wykonuje szablonów z notatek. Nieobsługiwane treści aktywne i niezatwierdzone cele zatrzymują przygotowanie. Kopiowane są wyłącznie zatwierdzone obsługiwane obrazy rastrowe; zgoda na SVG nie oznacza dopuszczenia wykonywalnego pliku w tym adapterze.

Nowy build usuwa zastany wynik lokalnego podglądu przed generowaniem, aby wycofane wpisy i obrazy nie pozostały pod starymi adresami. Po zmianie zgód należy ponownie uruchomić build; działający statyczny serwer nie jest automatycznym obserwatorem rejestrów.

Nie zmieniono źródłowych notatek, obrazów, vaulta, `.obsidian`, produkcyjnych layoutów ani blokady publikacji. Wyszukiwanie pełnotekstowe działa lokalnie; produkcyjne kanały, graf/backlinki, feed/sitemap, pełne Maps 2.0 i kontrola publicznego hostingu pozostają osobnymi etapami. Brak commita, push i deploymentu.

## Sprawdzenie

`npm run publication:test`, `npm run wiki:build`, `npm run wiki:test`. Test przeglądarkowy rzeczywistych zatwierdzonych stron: `node scripts/wiki-approved-browser-check.cjs` z ustawionymi `WIKI_PLAYWRIGHT_MODULE` i `WIKI_BROWSER_EXECUTABLE`, jak w instrukcji prototypu. Zrzuty kontroli tych treści pozostają w ignorowanym `.publication-review/article-visual-check/`, poza serwowanym katalogiem i publiczną dokumentacją.

Wyniki po uporządkowaniu katalogów: **55/55 testów bezpieczeństwa**, **11/11 testów wiki**, build PASS, **78 kontroli przeglądarkowych** (17 artykułów/map i 9 stron katalogów przy 1440/390/320 px), dodatkowo artykuł i pełny katalog bez JavaScript. Obrazy i linki rozwiązują się; brak poziomego przepełnienia i błędów JS. Dotychczasowe testy nawigacji i stron encji demo również PASS po zmianie tras. Sprawdzono wizualnie zrzuty desktop/mobile. Testy obejmują przynależność do katalogów, unikalność grup pełnego spisu, brak obcych metadanych, pending/denied canary, zmienione źródła i obrazy, ukryte cele, referencyjne linki/obrazy, niebezpieczne URL, kolizje tras (w tym demo) i wycofanie poprzedniego wyniku. Node 24; Node 22 i fizyczne urządzenia nie zostały osobno sprawdzone.
