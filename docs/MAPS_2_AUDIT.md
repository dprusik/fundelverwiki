# Lorekeeper Maps 2.0 — audyt i projekt
Data: 2026-10-22. Repozytorium: fundelverwiki, lokalna gałąź main, HEAD 994d1c3b1826f8a0909240ffa886c04ab0e03ae9.
Status: audyt i propozycja; brak implementacji Maps 2.0. Dokument utrwala wynik wcześniejszej analizy oraz oznacza późniejsze doprecyzowanie Realtime.

## 1. Zakres i granice dowodów
Odczytano campaignMap.njk, Neverwinter.md, layouty, konfigurację Eleventy/Vercel, package.json i mechanizmy publikacji. Parserem DOM policzono i odczytano znaczniki, a biblioteką Sharp sprawdzono metadane JPEG. Nie uruchamiano w tym audycie nowego builda, testów aplikacji ani deploymentu. Nie sprawdzano paneli Vercel/Supabase ani rzeczywistego Vaulta. Nie odczytywano .env, sekretów, prywatnych notatek lub .obsidian. Nie zmieniano kodu i nie usuwano punktów. Zastany nieśledzony AUDYT_LOREKEEPER.md pozostawiono bez zmian. Gałąź origin/main to lokalnie zapamiętany ref, nie dowód ponownego odczytu zdalnego repo.

## 2. Potwierdzona implementacja
| Obszar | Stan / źródło |
|---|---|
| Komponent | src/site/_includes/components/campaignMap.njk, około 200 linii JS inline |
| Leaflet | 1.9.4 JS/CSS z unpkg.com, nie jest zależnością npm |
| Model | L.CRS.Simple + L.imageOverlay, współrzędne Leaflet [y,x] |
| Embed | src/site/notes/DND/Wiki/Neverwinter.md:13–21, konfiguracja data-* |
| Punkty | 11 elementów .campaign-map-marker z nazwą, x/y, URL, opisem, typem; opcjonalnie kolor/numer/ikona |
| Kliknięcie | Pokazuje popup i console.log współrzędnych, bez trwałego zapisu |
| Edycja | Brak formularza, drag-and-drop, bazy, logowania i uprawnień |
| Integracja | layouts/note.njk:95 bezwarunkowo dołącza komponent; layouts/index.njk nie dołącza go analogicznie |
| Publikacja | Eleventy generuje dist, Vercel serwuje pliki statyczne |
| Testy | package.json ma Vitest i npm test, ale nie znaleziono śledzonych testów mapy |

### Usterki i ograniczenia
1. Każda mapa odczytuje znaczniki przez globalne document.querySelectorAll(".campaign-map-marker") — dwie mapy na stronie mieszałyby punkty.
2. Nazwy, opisy, ikony, kolory i href są składane jako HTML/CSS bez wystarczającej walidacji. Dane graczy wymagają textContent/bezpiecznego DOM, zamkniętej palety i walidacji adresów.
3. Filtr współrzędnych odrzuca NaN, ale nie zapewnia skończoności liczb, granic i kompletności danych.
4. Leaflet ładuje się również dla zwykłych notatek; loader nie ma SRI. Pobranie Leaflet/CSS zależy od CDN.
5. Jednorazowe invalidateSize po 250 ms nie zastępuje ResizeObserver i obsługi zmiany orientacji.
6. style mapy w Markdownzie (99vw, translacja, własne proporcje) mogą kolidować z szerokością treści i sidebarami; nie wykonano wizualnego testu mobilnego.
7. Wszystkie punkty mają ten sam URL /dnd/wiki/lokacje/phandalin/. Nie znaleziono notatki z takim permalinkiem w lokalnych Markdownach; nie jest to test HTTP.
8. Sześć data-x ma początkową twardą spację. Obecny Number() je odczytuje. Brak typu w dwóch punktach daje domyślny "number" bez numeru.
9. vercel.json devCommand wskazuje npm run start, lecz package.json ma dev, a nie start. Nie jest to dowód błędu produkcyjnego buildu.

## 3. Dane Neverwinter do zachowania
Obraz: src/site/img/user/DND/Lokacje/Phandalin/NeverwinterMapClean.jpg.
Rzeczywiste wymiary: 4250 × 3284 px; rozmiar 6 308 590 bajtów.
SHA-256: 689e6259520015210c7d73f0631af2cecc8b870c5fce9719be80e1145564bcdc.
Układ mapy i proporcje kontenera: 3250 × 2264 — różne od proporcji obrazu. Nie wolno utożsamić tych jednostek z pikselami JPEG.

| Kolejność | Nazwa źródłowa | x | y | Typ efektywny |
|---|---|---:|---:|---|
| 1 | Zamek Never | 870 | 1210 | castle |
| 2 | Rozjebany Lewiatan | 444 | 1230 | tavern |
| 3 | Wieża Płaszcza | 2493 | 1660 | magic |
| 4 | Koszary straży w dzielnicy Wież | 1998 | 1562 | number |
| 5 | Dom Antares | 1756 | 1448 | home |
| 6 | Dom Wiedzy | 1424 | 1202 | temple |
| 7 | Hol sprawiedliwości | 722 | 938 | number |
| 8 | Mikstury i zioła Featherfallówi | 2104 | 1842 | merchant |
| 9 | Stare kamienice w Bluelake | 726 | 1477 | danger |
| 10 | Opuszczony posterunek wojskowy | 2295 | 1062 | danger |
| 11 | Odłamek księżyca | 1559 | 1864 | temple |

Tabela nie zastępuje pełnej kopii opisów i atrybutów. Migrator ma zachować dokładną treść, kolejność, surowe atrybuty, źródłowy HTML, URL i hashe. W tym etapie nie wygenerowano ani nie zaimportowano takiej kopii.

## 4. Proponowana architektura
Zachować Obsidian → Digital Garden → Eleventy → Vercel dla oficjalnego lore. Dodać niewielki frontend Leaflet/vanilla JS korzystający z Supabase Auth, PostgreSQL, RLS, Storage i — po późniejszym doprecyzowaniu — Realtime.

- Obsidian: pełne, przejrzane artykuły i opublikowane strony lokacji.
- Baza: mapy, położenie, krótkie publiczne opisy mapowe i współdzielone adnotacje.
- Brak automatycznego zapisu z edytora do Vaulta lub repozytorium treści.
- /maps/: katalog i przycisk DM "Nowa mapa".
- /maps/view/?map=<uuid>: jeden statyczny viewer; nowe mapy nie wymagają deploymentu.
- Tryb dodawania: klik/tap tworzy roboczy punkt; zapis jest świadomy i potwierdzany.
- Edycja/przeciąganie: wyłącznie uprawnionych punktów; formularz boczny na desktopie, dolny panel na telefonie.
- W MVP brak sekretów DM w danych aplikacji; prywatne informacje pozostają poza publiczną publikacją. Ukrycie elementu lub pola w CSS nie zabezpiecza danych.
- Bez Next.js/React i bez własnego CRUD API; uprawnienia w bazie. Administracja kontami początkowo z panelu Supabase.

## 5. Model danych
| Tabela | Pola zasadnicze |
|---|---|
| campaigns | id, name, created_at |
| campaign_members | campaign_id, user_id, role dm/player, active |
| maps | id, campaign_id, slug, title, image_object/path, image_sha256, image_width/height, world_width/height, visibility public/campaign, status draft/published/archived, version |
| markers | id, map_id, kind official/party, owner_id, title, description, lore_url, u/v, type, color/icon/number, visibility, created_at/updated_at, version, deleted_at |

Wszystkie tabele API z RLS; indeksy na kluczach członkostwa, map_id i filtrach widoczności. Właściciela, daty i wersję ustala baza. ID/autor/mapa są chronione przed nieuprawnioną zmianą. Role nie pochodzą z edytowalnego user_metadata. Usunięcie użytkownika nie powinno usuwać jego punktów; osieroconymi wpisami zarządza DM.

Pozycja: u=x/3250, v=1-y/2264, zakres 0–1 z początkiem w lewym górnym rogu. Leaflet: [H*(1-v), W*u]. Dla Neverwinter H/W początkowo pozostają dotychczasowe. Wersja obrazu jest jawna; wymiana podkładu nie remapuje punktów po cichu.

### Uprawnienia
| Operacja | Gość | Członek-gracz | DM danej kampanii |
|---|---|---|---|
| Publiczna mapa i oficjalne publiczne punkty | Odczyt | Odczyt | Zarządzanie |
| Mapy i punkty drużyny | Brak | Odczyt | Zarządzanie |
| Dodanie punktu party | Brak | Jako własny | Tak |
| Edycja punktu party | Brak | Tylko własny | Wszystkie w kampanii |
| Oficjalna lokacja / nowa mapa / publikacja | Brak | Brak | Tak |
| Pełny import odtworzeniowy | Brak | Brak | Tak |

INSERT gracza: aktywne członkostwo, dostęp do opublikowanej mapy, kind=party, owner_id=auth.uid(), visibility=campaign. UPDATE: USING dla starego i WITH CHECK dla nowego rekordu, plus ochrona niemodyfikowalnych pól. Dostęp do punktu zawsze wymaga dostępu do mapy. Zwykłe skasowanie zastąpić archiwizacją/koszem, bez kaskadowego usuwania map i punktów.

Helper członkostwa nie może powodować rekurencji RLS. SECURITY DEFINER tylko dla małego, sprawdzonego helpera z pełnymi nazwami schematów, pustym search_path i ograniczonym EXECUTE. Eksport/import domyślnie SECURITY INVOKER; import dodatkowo sprawdza rolę DM. Samo zalogowanie lub znajomość UUID nie nadają uprawnień.

## 6. Aktualizacja wymagań: natychmiastowe współdzielenie
Pierwotna propozycja audytu dopuszczała polling co około 15 sekund i odkładała Realtime. Późniejsze polecenie Wiki Experience 2.0 wymaga natychmiastowej widoczności punktów dla drużyny. Ta część pierwotnej propozycji jest NIEAKTUALNA.

Dla małej kampanii proponuje się Supabase Postgres Changes dla INSERT/UPDATE znaczników z RLS i subskrypcją po map_id. RLS, nie filtr kanału, rozstrzyga dostęp. Nie subskrybować fizycznych DELETE: korzystać z soft delete. Tombstone pozostaje dostępny w RLS uprawnionym odbiorcom, aby UPDATE pozwolił usunąć punkt z widoku; interfejs nie wyświetla usuniętych rekordów. Fizyczne czyszczenie poza aktywnym obiegiem.

Przy starcie: subskrypcja → bufor zdarzeń → snapshot → scalanie po id/version. Po reconnect pełne uzgodnienie snapshotu, a nie samo dopisywanie nowych punktów. Jedna mapa nie odbiera danych innej. Odebranie członkostwa musi blokować kolejne dane/zapisy; wylogowanie i wykrycie odmowy czyszczą dane sesji. Nie da się cofnąć informacji, którą uprawniony użytkownik wcześniej pobrał.

Cel odbioru, nie gwarancja dostawcy: u drugiego aktywnego gracza zapis widoczny bez reloadu, p95 do 2 sekund w kontrolowanym teście. Utrata subskrypcji ma widoczny komunikat i mechanizm ponownego połączenia. Polling to wyłącznie oznaczony tryb awaryjny, nie spełnienie wymogu Realtime. Broadcast z prywatnymi kanałami pozostaje alternatywą przy większej skali lub zmianie modelu zdarzeń.

## 7. Migracja bez utraty danych
1. Zrobić odczytową kopię JSON wszystkich 11 punktów i obrazu z hashem; nie usuwać źródeł.
2. Zachować Unicode, opisy, surowe wartości i puste/defaultowe atrybuty. Normalizować spacje tylko przy parsowaniu współrzędnych. Sprawdzać finite oraz zakres.
3. Utworzyć rekord Neverwinter ze starym układem 3250×2264; zapisać osobno metadane JPEG.
4. Przeliczyć u/v; nadać stabilne migration_id i UUID. Kolejny import nie tworzy duplikatów i nie nadpisuje edycji wykonanych po migracji.
5. DM przegląda przypisanie do warstwy oficjalnej i widoczność. Nie dopisywać lore ani nie naprawiać automatycznie linków.
6. Porównać 11 pozycji na starym i nowym widoku przy kilku zoomach; zachować także opisy i ikony.
7. Adapter rozpoznaje dotychczasowy embed, uruchamia nowy viewer i zapobiega podwójnym znacznikom. Legacy HTML zostaje w źródle. Powrót do starego widoku jest przełącznikiem.
8. Nowe punkty drużyny są w bazie i nie są zapisywane do Markdownu.
9. Poprawa proporcji obrazu, URL lokacji i ewentualny przyszły data-map-id to oddzielne zmiany. Praca przy Vaultcie wymaga osobnego, ręcznego działania DM, nie ingerencji agenta.

Stary HTML z punktami jest jawny. Nie wolno traktować RLS jako sposobu ukrycia treści, która nadal znajduje się w statycznym źródle, historii repo lub obrazach.

## 8. Eksport JSON i odzyskanie
Eksport zawiera schema_version, zakres uprawnień, mapę, układ współrzędnych, wersje/ID punktów, pochodzenie migracji i hash obrazu. Pełna kopia może zawierać oryginalny obraz Base64; sam URL nie wystarcza po utracie Storage. Eksport bez obrazu musi być oznaczony jako niepełny.

Snapshot metadanych powinien być spójny transakcyjnie; obraz ma niezmienną wersję i zgodny hash. Gracz eksportuje tylko uprawniony zakres, DM pełny zestaw z koszem. Import DM: walidacja schematu i limitów, dry-run różnic, jawna decyzja o konfliktach, transakcja danych. Nie przywracać haseł, tokenów, ról ani członkostw z pliku. Przy innym projekcie jawnie mapować autorów, nie nadawać im dostępu automatycznie. Odtworzenie do testowej mapy jest kryterium odbioru.

## 9. Małe etapy
| Etap | Wynik i kryterium |
|---|---|
| M1 | Odczytowy migrator: 11 kompletnych rekordów, brak zmian źródła |
| M2 | Refaktor Leaflet: izolacja map, bezpieczne popupy, dwa widoki bez mieszania punktów |
| M3 | Auth/model/RLS: testy negatywne bezpośrednio przez API |
| M4 | Katalog/viewer: wiele map i kontrola dostępu do obrazów |
| M5 | Dodawanie, drag i edycja własnych punktów + Realtime: test dwóch kont bez reloadu |
| M6 | DM: nowe mapy, upload, oficjalne lokacje, archiwizacja |
| M7 | Pełny JSON i odtwarzanie testowe |
| M8 | Import Neverwinter, test telefonu, rollback i odbiór |

Fog of war, śledzenie tokenów, edycja offline, automatyczny zapis lore i rozbudowane rysowanie obszarów poza MVP.

## 10. Usługi i utrzymanie
Pozostają Eleventy, Digital Garden i Vercel. Nowe: Supabase Auth/PostgreSQL/Storage/Realtime oraz produkcyjne SMTP dla kodów e-mail. Pierwszy DM i zaproszenia mogą być zarządzane z panelu Supabase. Wyłączyć automatyczne tworzenie kont przy sign-in; rola i członkostwo nadal w bazie.

Frontend dostaje tylko SUPABASE_URL i publishable key. Nigdy service_role/secret key, hasło PostgreSQL ani dane SMTP. Prywatny bucket z politykami według mapy; podpisane URL krótkotrwałe. Stary obraz Neverwinter w wiki jest już publicznym zasobem — Storage nie nada mu prywatności wstecz. Nowy upload ma ograniczony MIME, wielkość i liczbę pikseli, nie jest dowolnym wykonywalnym SVG/HTML. Nowy obraz dostaje nowy obiekt, nie nadpisuje podkładu niezauważalnie.

Supabase CLI i migracje w Git, testy lokalne w osobnej bazie, preview bez prawa zapisu do produkcji. Brak potrzeby własnego serwera CRUD, kolejki lub nowego frameworka. Wielkość i koszt planu usług należy sprawdzić przy konfiguracji; nie ustalono płatnego planu.

## 11. Ryzyka i testy odbioru
- A nie edytuje B ani oficjalnego punktu przez request; konto spoza kampanii nie odczytuje danych ani zdarzeń.
- Gracz nie zmienia autora, mapy, visibility, kind, roli, timestamps ani version w celu obejścia zasad.
- Nie ma sekretów w HTML, searchIndex.json, graph.json, feedzie, sitemapie, obrazach, logach i eksportach.
- XSS/link javascript:/CSS injection traktowane jako tekst lub odrzucane.
- INSERT/UPDATE i soft delete odzwierciedlane u drugiego konta; reconnect nie gubi i nie dubluje punktów; konflikt version nie nadpisuje cudzej pracy.
- Po migracji 11/11 punktów, identyczne treści i wizualna zgodność pozycji; kolejny import bez duplikatów.
- JSON odtwarza mapę i obraz po usunięciu testowej instancji; brak zależności od starego URL.
- Desktop i telefon: tap/add/save/cancel/drag, zoom, obrót, przewijanie, klawiatura, błędy sieci i wygasła sesja.
- Zmiana rozmiaru obrazu wymaga jawnego przeliczenia i przeglądu; brak samowolnego usuwania punktów.

## 12. Proponowane pliki
| Ścieżka | Zmiana przyszła |
|---|---|
| src/site/_includes/components/campaignMap.njk | Cienki bootstrap i adapter legacy |
| src/site/_includes/layouts/note.njk | Zachowanie embedu i ładowanie tylko przy mapie |
| src/site/_includes/layouts/maps.njk | Wspólny widok mapy |
| src/site/maps/index.njk, view.njk, auth.njk | Katalog, generyczny viewer i logowanie |
| src/maps/{viewer,editor,repository,auth,validation,export,legacy}.js | Małe moduły vanilla JS |
| src/site/_data/maps.js | Wyłącznie jawna konfiguracja |
| src/site/styles/user/maps.scss | Desktop/mobile, lista i formularze |
| src/helpers/userSetup.js | Hooki Eleventy, bez przenoszenia całej konfiguracji |
| package.json, package-lock.json | Leaflet, SDK Supabase, bundler; budowanie JS przed Eleventy |
| supabase/migrations/, supabase/tests/ | Model, RLS, funkcje i testy |
| scripts/export-legacy-map.js, migrations/maps/ | Narzędzie odczytu i pełna kopia, poza src/site |
| tests/maps/ | Jednostkowe, RLS i przeglądarkowe |
| vercel.json | Spójna komenda dev, statyczne routy, konfiguracja publiczna |
| src/site/notes/DND/Wiki/Neverwinter.md | Początkowo bez zmian i bez usuwania punktów |

## 13. Źródła
Źródłem ustaleń repozytorium są pliki wymienione powyżej w HEAD 994d1c3.
- [Leaflet 1.9.4](https://leafletjs.com/reference.html) — dostępne API.
- [CRS.Simple](https://leafletjs.com/examples/crs-simple/crs-simple.html) — układ [y,x] i jednostki mapy.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) — mechanizm kontroli danych.
- [Klucze API](https://supabase.com/docs/guides/getting-started/api-keys) — klucz publikowalny i sekretny.
- [Storage](https://supabase.com/docs/guides/storage/buckets/fundamentals) — prywatne/publiczne zasoby.
- [Auth e-mail](https://supabase.com/docs/guides/auth/auth-email-passwordless) i [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) — Realtime; dokumentację trzeba ponownie sprawdzić przy implementacji.

Wszystkie etapy M1–M8 są planem, nie raportem z wykonania.
