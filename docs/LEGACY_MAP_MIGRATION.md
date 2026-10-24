# M1A — bezpieczna obsługa dotychczasowej mapy

Aktualizacja 2026-10-24, lokalny Dark Archive: kanoniczny /dnd/wiki/neverwinter/ jest teraz artykułem miasta ze spisem lokacji i przyciskiem Otwórz mapę. Viewer został wydzielony do /maps/neverwinter/, dokąd prowadzi katalog Mapy. Oba widoki bazują na tym samym zatwierdzonym źródle; znacznik prowadzi do kanonicznego artykułu lokacji, a artykuły mają linki do odpowiednich map. JSON atlasu nie powiela treści artykułu. Nie zmieniono źródłowego Markdownu/zgód/markerów przy tym rozdzieleniu. Szczegóły i aktualne testy w PROJECT_STATUS.md; poniżej historia migracji. Bez Maps 2.0 i wdrożenia produkcyjnego.

Stan: 2026-10-22, gałąź `feat/wiki-layout-2`. Istniejąca mapa jest obowiązkowym elementem migracji. Nie zastępujemy jej Maps 2.0 ani nie wyłączamy dla uproszczenia importu.

## Co działa lokalnie

```powershell
npm run publication:review
```

Otwórz [podgląd istniejącej mapy](http://127.0.0.1:8082/map-review/?entry=entry-c217c245e1b90f6b78f8). W podglądzie notatki w panelu DM jest też link **Otwórz bezpieczny podgląd mapy**. Serwer musi działać w zwykłym terminalu użytkownika, z prawem zapisu do LocalAppData; jeśli już działa, nie uruchamiaj drugiej kopii na 8082.

Read-only viewer wykorzystuje natywne SVG i JavaScript, bez CDN, nowego frameworka, bazy lub backendu współdzielenia. Obsługuje przesuwanie, zoom przyciskami/kółkiem/dwoma palcami, klawiaturę, opisy punktów i alternatywną listę znaczników. Nazwy/opisy powstają przez textContent, nie innerHTML. Kolory mają zamknięty format, typy ikon allowlistę. Każdy viewer otrzymuje jeden model i nie zbiera globalnie punktów innej mapy.

To lokalny podgląd DM, a nie integracja nowego shellu z produkcyjnym Digital Garden. Linki do dopuszczonych artykułów zachowują kanoniczny URL; właściwe artykuły nie są jeszcze renderowane przez serwer narzędzia DM.

## Zachowanie danych i zgód

- Nie zmieniono źródłowego Markdownu, 11 znaczników, obrazu ani permalinku. Wymiary świata pozostają **3250 × 2264**, niezależne od obrazu **4250 × 3284**. Pozycje zachowują źródłowe x/y, a viewer konwertuje oś Y jak poprzedni CRS.Simple. Nie przeliczamy po cichu układu na piksele obrazu.
- Zgoda na całą notatkę obejmuje jej pokazane źródłowe dane mapy; obraz wymaga własnej aktualnej zgody. Nie publikujemy punktów z innych notatek, ukrytych warstw ani dodatkowych pól. Nieznany atrybut, np. prywatna widoczność, zatrzymuje obsługę formatu.
- Mapę identyfikuje zatwierdzone ID wpisu; robocze identyfikatory punktów odpowiadają kolejności w źródle. Są stabilne przy zmianie właściwości, ale zmiana kolejności/usunięcie punktów wymaga przyszłego jawnego mapowania przed wykorzystaniem tych ID w Maps 2.0. To nie trwały rejestr tożsamości znaczników nowej usługi.

## Granica bezpieczeństwa

`legacy-map.cjs` rozpoznaje wyłącznie konkretny format: jeden pusty kontener mapy, jawny lokalny obraz, skończone wymiary/zoom, sąsiadujące puste divy markerów oraz opcjonalną kopię tego samego obrazu w rozpoznanym wrapperze Markdown. Nieznane tagi/atrybuty/style, komentarze, duplikaty atrybutów, skrypty, szablony, aktywne fenced blocks, ukryta dodatkowa treść, zewnętrzne/niebezpieczne URL, niedopuszczalne współrzędne i niejednoznaczne mieszanie map są odrzucane. CSS starego kontenera nie trafia do DTO ani DOM viewera.

Walidator publikacyjny korzysta z tego samego parsera, sprawdza aktualne zgody i hashe źródła/obrazu oraz wszystkie cele data-url. Tylko po udanej walidacji projekcja otrzymuje `maps`; raw HTML i ścieżki źródłowe nie są eksportowane. Pozostały HTML nadal jest blokowany. Publiczny model map nie wyprowadza relacji lore z odnośników. `body`, `fulltext` i `production_channels` pozostają false.

Lokalne endpointy `/api/map/<ID>` i `/api/map-image/<ID>` korzystają z zapisanych, aktualnych decyzji DM albo aktywnych rejestrów. Kontrolują Host/Origin, nie wykonują źródłowego HTML i nie pozwalają pobrać obrazu po utracie jego zgody/hashu. Tryb lokalnego podglądu może pokazać zatwierdzone punkty z nieaktywnymi linkami do niezatwierdzonych celów; nie zwraca adresów/ID takich celów i **nie oznacza udanej walidacji publikacji**.

## Niedostępne odnośniki — konkretna decyzja DM

W istniejącym źródle wszystkie 11 punktów wskazuje ten sam URL nieobecnej notatki. Nie retargetujemy ich na podstawie nazw i nie uznajemy ich za poprawne tylko dlatego, że były online.

Domyślnie `MAP_LINK_TARGET_UNAPPROVED` blokuje import. DM może w podglądzie świadomie zaakceptować zachowanie punktów bez niedostępnych linków. Zapisuje to osobną wersję decyzji z `legacy_map: {approved: true, link_policy: "omit_unresolved"}` w metadanych tego samego wpisu; źródło nie zmienia się. Każdy dostępny cel nadal musi mieć aktualną zgodę i zachowuje swój URL. Po decyzji panel tworzy nową propozycję — nie stosuje jej do aktywnych rejestrów ani nie publikuje wiki.

Decyzja wymaga lokalnej sesji/CSRF, tokenu otwartego podglądu, zgodnego hasha, rewizji i jawnego potwierdzenia. Zmiana notatki/obrazu albo wcześniejszej decyzji wymaga odświeżenia. Historia i ID pozostają zachowane. Żadnej rzeczywistej decyzji o tej polityce nie zapisano automatycznie podczas implementacji.

## Weryfikacja i pozostałe blokady

- `npm run publication:test`: **46/46 PASS**, w tym osiem testów parsera/projekcji/API map, zgód, hashy, niebezpiecznych pól/URL, syntetycznych sekretów i jawnej polityki linków wraz z importem na fixture.
- `npm run wiki:test`: **7/7 PASS**.
- `npm run publication:map-check`: PASS na syntetycznych danych, headless Edge 1440/390 px: markery, opisy, kanoniczny link, nieaktywny brakujący link, pan/zoom/klawiatura/pinch i zapis wyłącznie jawnej decyzji testowej.
- Obie regresje panelu DM: PASS. Historyczne screenshoty fikcyjnej mapy sprawdzono wizualnie; obrazy pominięto w kandydacie.
- Osobny odczyt rzeczywistej zatwierdzonej mapy: 11 punktów, poprawny obraz 4250×3284, niezmienione wymiary świata, działający opis po kliknięciu, 0 błędów JS i brak poziomego overflow przy 390 px. Nie zapisywano rzeczywistych decyzji i nie eksportowano nazw/opisów do screenshotów/raportu.

Node 24.22.0; Node 22 i fizyczne telefony nie były osobno testowane. Nie audytowano EXIF ani treści/licencji obrazów. Parser nie jest ogólnym sanitizerem HTML, obsługą wielu legacy map w jednej notatce ani implementacją Maps 2.0.

Przed pełnym importem pozostaje decyzja o linkach mapy i niezależny nierozwiązany wikilink w innym wpisie. Przed produkcją nadal potrzebne są public-only rendering/staging, search, graph, sitemap/feed, kontrolowane kopie i kontrola artefaktu. Stary `campaignMap.njk` nie został odbezpieczony ani podłączony do nowego modelu; jego generowanie pozostaje zatrzymane przez blokadę `.eleventy.js`/prebuild. Nie wykonywano deploymentu, commita ani push.

## Stan po zgodzie DM i lokalnym podłączeniu (2026-10-22)

DM jawnie zatwierdził zachowanie punktów z pominięciem niezatwierdzonych odnośników, a zawężona propozycja została świadomie zastosowana do aktywnych rejestrów. Aktualny stan to 2 approved (wpis i obraz), 102 pending; brak niedokończonej transakcji. Nie ponawiaj przeglądu tych dwóch rekordów, dopóki ich źródłowe bajty się nie zmienią.

W `wiki-preview.config.cjs` lokalny prototyp pobiera mapę przez `prepareLocalMapPreviewData`, która weryfikuje tylko mapę i zatwierdzony obraz. Powstała strona pod istniejącym adresem `/dnd/wiki/neverwinter/`; katalog Mapy prowadzi do niej oznaczonym linkiem lokalnego podglądu. Wartości demonstracyjne pozostałych ekranów i ich wyszukiwarka pozostają oddzielne. Oryginalny `campaignMap.njk` i wszystkie wyjścia produkcyjne są nadal za bramką.

Testy po integracji lokalnej: `publication:test` **48/48**, `wiki:test` **8/8**, `wiki:build` PASS, headless Edge desktop/mobile PASS przy 1440 i 390 px. Wygenerowana strona zawiera 11 punktów, 0 aktywnych linków do brakującego celu, zgodny zatwierdzony obraz, bez raw HTML/ścieżek rejestrów; brak poziomego overflow i błędów JavaScript. Lokalna witryna: `npm run wiki:dev`, `http://127.0.0.1:8081/dnd/wiki/neverwinter/`.

Pełna walidacja repo i produkcyjna integracja nadal są zablokowane. Nierozwiązany wikilink w innym wpisie wymaga osobnej decyzji lub poprawy źródła i przeglądu. Nadal trzeba zabezpieczyć i przetestować renderowanie Markdown, search, graph/relacje, sitemapę, feed oraz kopiowanie zasobów. Nie uruchamiaj starego builda, nie wdrażaj tej strony i nie traktuj lokalnego prototypu jako potwierdzenia bezpieczeństwa produkcji.
