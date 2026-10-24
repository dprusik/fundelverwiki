# M1A.2 — źródło publicznych danych i gotowość integracji

Data: 2026-10-22. Gałąź: `feat/wiki-layout-2`, baza `994d1c3b1826f8a0909240ffa886c04ab0e03ae9`. Zmiany lokalne bez commita. Interfejs prototypu, nawigacja, tokeny i widoki postaci/lokacji bez zmian. Nie połączono nowego shellu z produkcyjnymi layoutami.

Aktualizacja 2026-10-23: [zatwierdzone artykuły w lokalnym prototypie](LOCAL_APPROVED_ARTICLES.md). Aktywne zgody obejmują 17 notatek i 17 załączników; 70 wejść pozostaje pending. Nowy adapter renderuje 16 artykułów i mapę pod kanonicznymi adresami. Poniższe wyniki M1A.2 są historyczną podstawą; nie stanowią aktualnej liczby zgód ani deklaracji bezpieczeństwa produkcji. Produkcyjna bramka pozostaje zablokowana.

Wcześniejsze etapy: [lokalny przegląd, historia i potwierdzony import](PUBLICATION_WORKFLOW.md), [zweryfikowane porównanie online](ONLINE_COMPARISON.md), [adapter istniejącej mapy](LEGACY_MAP_MIGRATION.md).

## Aktualny stan mapy i zgód

Zapisano lokalne decyzje DM dla 18 notatek i 17 załączników; aktywne rejestry nadal nie zostały zastosowane. Nie należy powtarzać przeglądu tych samych bajtów. Rozpoznany format legacy map jest teraz kontrolowanie projektowany do DTO, z walidacją obrazu, wymiarów, pól, źródłowych hashy i celów linków. To wyjątek dla ściśle rozpoznanego formatu, nie dopuszczenie dowolnego HTML. Lokalny podgląd rzeczywistej mapy z 11 punktami działa na 127.0.0.1:8082. Nie zmieniono oryginalnego źródła, obrazu, permalinku ani danych znaczników.

Pełny import nadal wymaga rozstrzygnięcia niedostępnych linków mapy (domyślnie MAP_LINK_TARGET_UNAPPROVED; osobna jawna polityka może zachować punkty bez takich linków) i niezależnego nieodnalezionego wikilinku. Sam lokalny podgląd nie stosuje zgód do rejestrów. Endpointy nie zwracają niedopuszczonych celów i wymagają aktualnych zgód na notatkę/obraz. `.eleventy.js`, prebuild i inne produkcyjne kanały pozostają zablokowane. Szczegółowy zakres, rzeczywiste testy i ograniczenia: LEGACY_MAP_MIGRATION.md.

## M1A.2C — co faktycznie odblokowano

Dodano `publication:import` (preview/apply z identyfikatorem diffu, status, potwierdzane recover) i `publication:status`. Eksport v2 z panelu jest związany z bieżącymi rejestrami i lokalną historią. Import sprawdza aktualność SHA, rewizje decyzji, zgodność metadanych i cały scalony model/dependencje. Niepełny formularz nie zastępuje dodatkowych pól wpisu ani osobnego rejestru relacji. Odmowa usuwa aktywną zgodę, zachowując historię i prywatną kopię metadanych do ewentualnego ponownego zatwierdzenia. Przerwany zapis blokuje walidator do odzyskania. Wyjście statusu jest zredagowane; diff jest przeznaczony wyłącznie do lokalnego terminala DM.

Potwierdzone na syntetycznych danych: import zgód rozpoznawany przez istniejący walidator, pełny proces CLI preview/apply, ponowne zatwierdzanie, zachowanie ID/URL/statusu/aliasów/relacji, odmowy i przywracanie metadanych, niezależny przegląd załącznika, stare hashe/propozycje, konflikty i awaria zapisu/rollback. **36/36 publication:test, 7/7 wiki:test**, panel DM w headless Edge 1440/390 px PASS. `npm run build` zakończył się oczekiwaną odmową w prebuild przed rimraf. Nie testowano Node 22, utraty zasilania ani równoległych ręcznych zapisów omijających blokadę aplikacji. Nie deklarujemy transakcji całego systemu plików ani kryptograficznego podpisu decyzji.

Rzeczywiste rejestry pozostawiono bez zmian: 104 pending, 0 nowych zgód/odmów. `publication:validate` nadal kończy się oczekiwanym `PUBLICATION_BLOCKED / UNAPPROVED_INPUT:104`. Sam import pozwala przygotować wejścia, ale **nie pozwala jeszcze podłączyć rzeczywistych wpisów do produkcyjnego shellu ani uruchomić legacy buildu**. Pozostałe blokady: public-only renderer/staging i parser zależności, search, graph/backlinki/relacje, sitemap/feed, kontrolowane zasoby/pochodne, testy rzeczywistych jawnie dopuszczonych materiałów oraz kontrola końcowego artefaktu i hostingu/cache.

Różnicę SVG wyjaśniono dokładnym porównaniem po CRLF→LF; publiczny dodatkowy URL jest widokiem systemowym zgodnym z lokalnym szablonem i zwraca HTTP 200. Żadnego z tych faktów nie zamieniono w zgodę DM. Szczegóły/hash w ONLINE_COMPARISON; bajty źródłowe i dotychczasowe permalinki nie zostały zmienione.

## Wynik i decyzja o gotowości

**Nie podłączamy jeszcze rzeczywistych wpisów.** Dostępny jest walidowany adapter metadanych, przetestowany na syntetycznych wejściach, ale nie ma potwierdzonych zgód DM dla rzeczywistych materiałów ani certyfikowanych projekcji kanałów produkcyjnego generatora. Z tego powodu jego generowanie jest celowo zablokowane. Prototyp `npm run wiki:dev` nadal działa na odizolowanych danych demonstracyjnych.

Nie zgadujemy, czy materiały są prywatne, czy publiczne. Nie przepisujemy prywatnych tytułów/opisów do raportów. Nie traktujemy `dg-publish=true`, obecności w repo, lokalnym dist ani historycznej publikacji jako aktualnej zgody na ponowne użycie całej treści i załączników.

## Zweryfikowana inwentaryzacja

Zakres odczytu: wyłącznie `src/site` w repo publikacyjnym oraz istniejące lokalne wyniki w `dist`. Nie odczytywano vaulta, `.obsidian`, sekretów `.env`, panelu hostingu ani historii Git. Kodu danych `*.11tydata.js` nie wykonuje inwentaryzacja. Linki symboliczne i próby wejścia w `.obsidian` są odrzucane.

| Zbiór | Liczba | Zgoda / dowód |
|---|---:|---|
| Notatki Markdown / Canvas | 31 | Wszystkie mają boolean `dg-publish: true`; 0 false/brak/nieprawidłowych/błędów parsera |
| Załączniki i zasoby kopiowane z src/site | 34 | 34/34 mają lokalną kopię dist o identycznych bajtach |
| Pozostałe wejścia src/site (szablony, dane, style, skrypty) | 39 | Wymagają technicznego przeglądu; nie wykonuje ich adapter |
| Notatki z lokalnym HTML | 31 | Obserwacja pliku wyjściowego pod efektywnym URL, nie potwierdzenie dostępności online |
| Notatki znalezione w lokalnym searchIndex / graph / sitemap | 31 / 31 / 31 | Porównanie URL, bez kopiowania treści do raportu |
| Notatki znalezione w lokalnym feedzie | 0 | Nie oznacza bezpieczeństwa generatora feedu; zależy m.in. od SITE_BASE_URL |
| Aktualizacja dostępności online (M1A.2B) | 31/31 URL-i notatek HTTP 200 | [Porównanie online](ONLINE_COMPARISON.md), bez wyprowadzania zgód DM |
| Zapisane zgody DM / odmowy DM | 0 / 0 | Brak decyzji nie oznacza zgody; wszystkie 104 wejścia pozostają zablokowane |

Pełna lista notatek, zasobów, ścieżek i hashy jest w lokalnym katalogu review generowanym przez `npm run publication:inventory`; materiały te pozostają prywatne i są pominięte w kandydacie.

Lista używa stabilnych identyfikatorów kontrolnych opartych na ścieżce, zamiast ujawniać potencjalnie prywatne nazwy. DM może zidentyfikować konkretny plik **na własnym lokalnym terminalu**, bez publikowania spisu ścieżek:

```powershell
node scripts/publication.cjs locate <ID-z-tabeli>
```

Polecenie wyświetla tylko ścieżkę, nie treść. Otwórz materiał lokalnie i przejrzyj także jego obrazy, komentarze, statystyki, ukryte fragmenty i linki. Opaque ID kontrolne nie jest ID encji: stałe publiczne `id` nadaje się dopiero po zgodzie i zachowuje przy dalszych zmianach. Zmiana ścieżki wymaga jawnego przypisania nowego source_key do tego samego publicznego ID, bez nowej kopii notatki.

Rozróżniamy:

- **Zaobserwowane w lokalnym artefakcie** — fakt techniczny; stan online osobno niezweryfikowany.
- **Kandydat / pending** — nie ma jawnego zatwierdzenia; publikacja blokowana.
- **denied** — jawna odmowa DM w rejestrze decyzji; publikacja blokowana również wtedy, gdy materiał nadal leży w wejściu.
- **approval_recorded** — zapisano zgodę i zgodny hash; pełny walidator nadal musi sprawdzić wszystkie zależności. `approval_stale` oznacza zmienione bajty i wymaga ponownego przeglądu.

Aktualnie wszystkie 104 rekordy są pending. Nie oznaczono arbitralnie konkretnych materiałów jako sekretów lub dopuszczonych. Wpisy flagowane false/missing/invalid również zostałyby zablokowane; obecnie takich notatek nie znaleziono.

## Nowe rejestry i kontrakt adaptera

W `src/wiki/` znajdują się rejestry `schema_version: 1`. Są celowo puste — zadanie nie udziela zgody na publikację rzeczywistego lore:

| Plik | Zawartość po przeglądzie |
|---|---|
| `public-entries.json` | entries: id, source_key, sha256, approved=true, reviewed_at, jawny title, istniejący permalink, category, kind; opcjonalne summary, aliases, published_at, portrait_asset_id, illustration_asset_id, osobno zatwierdzony status |
| `public-assets.json` | assets: id, source_key, sha256, approved=true, reviewed_at, istniejący publiczny url i alt; zgoda obejmuje całe bajty, nie tylko nazwę |
| `public-system.json` | inputs: source_key, sha256, approved=true, reviewed_at; przegląd techniczny szablonów/danych/kodu wejściowego |
| `public-relations.json` | relations: id, source_id, target_id, type, approved=true, opcjonalny description; osobna zgoda dla krawędzi, niezależnie od publikacji obu końców |
| `publication-decisions.json` | decisions: key, state=pending/denied; nie przenosimy prywatnych uzasadnień DM do tego pliku |

Przykłady poprawnych rekordów i zgód są wyłącznie syntetyczne w `tests/security/publication.test.cjs`; nie są wpisami kampanii. Żaden skrypt nie dopisuje automatycznie zgód. `reviewed_at` jest jawnym znacznikiem przeglądu w UTC, a nie automatyczną datą publikacji. Lokalny rejestr nie jest mechanizmem uwierzytelniania roli DM ani kryptograficznym podpisem jego decyzji.

`src/helpers/wiki/publication.cjs`:

- Odczytuje źródła bez wykonywania kodu Eleventy, Nunjucks, Canvas lub frontmatter JS. Parser dopuszcza YAML/JSON i zgodną z DG korektę `\\|`.
- Wymaga jawnej zgody i zgodnego SHA-256 całego pliku, boolean `dg-publish=true`, jednej notatki na source_key, unikalnych publicznych ID i kanonicznych URL. Zmiana treści lub zasobu unieważnia zgodę.
- Nieznane pola rekordów/frontmatteru, brak zgody, nieznany plik, odmowa, nierozwiązana zależność, zmiana URL, niezatwierdzony status/obraz/relacja zatrzymują przygotowanie. Raw HTML, Canvas, Bases/Dataview, składnia szablonowa i komentarze Obsidiana mają obecnie osobną blokadę niewdrożonego kanału, nawet po wpisaniu zgody.
- Sprawdza podstawowe wikilinki i Markdownowe linki/załączniki. Niejednoznaczny lub niedopuszczony cel blokuje operację. Nie tworzy relacji na podstawie linków lub folderów.
- Buduje **nowe obiekty z allowlisty**, bez rozrzucania item.data, źródłowych ścieżek, całego frontmatteru, dowolnych metadanych i treści Markdown. Tytuł i aliasy pochodzą wyłącznie z przejrzanego rejestru; nie są automatycznie kopiowane z notatki.
- Adapter zachowuje `id`, `url=permalink`, `kind`, kategorię/sekcję, opcjonalny opis, obraz/status i jawne relacje. Odwzorowuje associated_with_location na neutralne located_in używane w prototypie; nie jest to wniosek o aktualnej obecności postaci. Odkrywalna projekcja pomija hide i przyległe relacje.
- Zwraca `capabilities: {body:false, fulltext:false, production_channels:false}`. **Nie jest to jeszcze pełne źródło treści dla komponentów artykułu**; ich body pozostaje wyłącznie w demo. Przyszła kontrolowana ścieżka Markdown będzie wymagała osobnego renderowania i testów kanałów.

`preparePublicData(root)` najpierw waliduje wszystkie wejścia. CLI zapisuje wynik dopiero po sukcesie, do nowego pliku UUID w ignorowanym `.publication-prepared/`, poza serwowanym dist i prototypem. Nie tworzy pliku przy błędzie, nie nadpisuje istniejących snapshotów. Starsze snapshoty nie są aktualną zgodą i nie wolno ich wdrażać bez ponownej walidacji. Żaden plik danych z rzeczywistych notatek nie został teraz przygotowany, ponieważ zatwierdzenia są puste.

## Faktyczny zakres ochrony kanałów

Stare kanały nadal opierają się na collections.note/all, surowych metadata oraz szerokiej kopii img. Nie przerobiono ich na bezpieczne selektywne generowanie. Zamiast pozorować bezpieczeństwo pojedynczym filtrem search, zastosowano **twardą odmowę całego produkcyjnego buildu**:

| Kanał | Obecna kontrola | Czego jeszcze brak |
|---|---|---|
| HTML, kolekcje, Bases, transkluzje, podglądy | Blokada na początku .eleventy.js, przed importami/danymi/transformacjami | Public-only renderowanie treści i zależności |
| searchIndex.json | Ten sam generator nie uruchamia się | Bezpieczny ekstraktor treści i świadoma decyzja uruchomienia full-text |
| graph.json / backlinki / filetree | Brak generowania | Projekcja węzłów, krawędzi i właściwości wyłącznie z publicznych źródeł |
| sitemap.xml / feed.xml | Brak generowania | Zatwierdzone kolekcje, daty i bezpieczna treść feedu |
| img, optimized images, logo, favicon | Blokada przed kopią i pluginami | Kontrolowane kopiowanie i pochodzenie transformowanych zasobów |
| CSS / pobierany motyw | Standardowe skrypty npm generujące dist/temat mają blokadę | Przegląd CSS, URL, zależności i ustawień hostingu |

`prebuild` sprawdza blokadę **przed rimraf dist**. Zablokowano też standardowe `dev`, `get-theme`, `build:sass`, `watch:sass`; bezpośredni Eleventy trafia na blokadę konfiguracji. Nie ma przełącznika środowiskowego wyłączającego ją. Samo wypełnienie rejestrów nie odblokuje starego generatora: przed jej usunięciem potrzebna jest jawna implementacja i testy każdego kanału.

Nie zabezpiecza to ręcznego wysłania starego dist, dowolnych własnych komend omijających konfigurację, wcześniejszych wdrożeń/cache, publicznego repo ani informacji już pobranych przez odbiorców. Istniejących artefaktów nie usuwano i nie publikowano. **Nie deklarujemy produkcyjnego bezpieczeństwa całej wiki ani cofnięcia ewentualnego ujawnienia.**

## Wykonane testy

```powershell
npm run publication:inventory
npm run publication:test
npm run publication:validate
npm run publication:data
npm run wiki:build
npm run wiki:test
```

- Inwentaryzacja: sukces; lista 31/34/39, bez kopiowania tytułów, ścieżek i treści.
- Bezpieczeństwo: **13/13 PASS**. Fikcyjne canary w nazwach, body, frontmatterze, HTML/komentarzach, linkach i załącznikach nie trafiają do DTO, raportów i logów; nieznane wejścia nie tworzą nowego pliku danych.
- Pozytywny fixture potwierdza zachowanie stabilnego ID/permalinku, projekcję obrazu i osobnych relacji, bez raw body/metadanych. Zmiany hashy, status bez zgody, odmowa, duplikaty i kolizje URL blokują przygotowanie.
- Rzeczywisty zainstalowany Eleventy na syntetycznym wejściu potwierdził, że boolean false i brak dg-publish same w sobie nie wykluczają notatki.
- Test bezpośredniego produkcyjnego Eleventy: odmowa przed powstaniem katalogu wyjściowego; brak HTML/search/graph/sitemap/feed/img i canary w logach. To test odmowy, nie selektywnego bezpieczeństwa tych kanałów.
- `publication:validate` i `publication:data` na rzeczywistym repo: **oczekiwany exit 1, PUBLICATION_BLOCKED / UNAPPROVED_INPUT:104**. Nie traktujemy tego jako zaliczonej walidacji realnych treści.
- `npm run build`: **oczekiwana odmowa w prebuild**. dist pozostał bez zmian: 86 plików, digest przed/po `51331deaed1fde99684795a98977f2a5143aaced051dc82f577a9a5e3b43d872`.
- Prototyp: build PASS, testy **7/7 PASS**. Nie zmieniono jego komponentów ani danych. Nie wykonywano ponownego odbioru wizualnego, bo zakres dotyczył źródła danych i gate.

Testy używają świeżych katalogów tymczasowych i fikcyjnych sekretów, bez prawdziwych notatek DM. Nie instalowano nowych zależności. Środowisko lokalne: Node 24.22.0; Node 22 osobno nie testowany.

## Otwarte decyzje DM i następna iteracja

1. Przejrzeć konkretne rekordy z DM_REVIEW i potwierdzić, które całe notatki oraz załączniki są obecnie publiczne dla graczy. Dla odmowy zapisać denied. Nie włączać eksportu całego vaulta/frontmatteru.
2. URL wiki został podany i odczytany w M1A.2B. Różnica jednego SVG i sześć niepotwierdzonych zasobów wymagają lokalnego przeglądu; wynik online nie zastępuje zgody DM.
3. Dla dopuszczonych wpisów jawnie ustalić publiczne ID, tytuły, kategorie/rodzaje, aliasy, ewentualne statusy i każdą relację. Nie dopisano tego na podstawie folderów.
4. Dokończyć renderowanie i weryfikację wszystkich kanałów, obsługę przeglądanych HTML/map legacy, obrazów i pozostałych zależności. Obecny regex referencji nie jest kompletnym parserem całego ekosystemu Obsidiana; dlatego raw HTML/Canvas/Bases i cały legacy build są nadal blokowane.
5. Media są obecnie kontrolowane przez źródło/hash/zgodę, bez automatycznej oceny spoilerów, EXIF, treści obrazu czy wykonywalnego SVG. Szablony/kod spoza src/site, ustawienia środowiska, pluginy i zależności wymagają przyszłego audytu kanałów; pozytywny walidator wejść nie zastąpi tego przeglądu.
6. Dopiero po powyższym połączyć nowy shell z dopuszczonymi wpisami pod istniejącymi permalinkami. Bez nowych kopii notatek, Maps 2.0 i Lore Managera w tym etapie.

Nowe pliki: `src/helpers/wiki/publication.cjs`, `scripts/publication.cjs`, pięć rejestrów `src/wiki/*.json`, `tests/security/publication.test.cjs`, dwa spisy `docs/review/`, ten raport. Zmieniono `.eleventy.js`, `package.json`, `.gitignore`, README oraz dokumentację specyfikacji/postępu. Nie zmieniono notatek ani vaulta/.obsidian. Brak deploymentu, commita i push.
