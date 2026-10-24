# Lorekeeper / Wiki Experience 2.0
Data: 2026-10-22. Repozytorium wykonawcze: fundelverwiki.
Status: PROJEKT I PLAN PRAC; nie wdrożono opisanych zmian.
Baza audytu: lokalne main, HEAD 994d1c3b1826f8a0909240ffa886c04ab0e03ae9.
Powiązany dokument: [MAPS_2_AUDIT.md](MAPS_2_AUDIT.md).
Zakres całego Lorekeepera M0–M3 jest zapisywany osobno w roadmapie sąsiedniego repozytorium Lorekeeper. Niniejszy raport rozwija M1A i punkty styku M1B. Propozycje techniczne nie stają się przez ten raport zatwierdzonymi decyzjami.

## 1. Cel i zasady
Przekształcić publikowaną wiki D&D w czytelną encyklopedię kampanii, zachowując Obsidian Digital Garden, Eleventy i Vercel. Oficjalne lore nadal pochodzi z Vaulta, a współdzielone adnotacje map są osobnymi danymi użytkowników. Przedmioty i zaklęcia zachowują istniejące PNG; nie odtwarzamy ich mechaniki w nowym statblocku ani nie generujemy obrazów ponownie.

Rozwiązanie ma być utrzymywalne przez jednego DM: Nunjucks, SCSS, małe moduły JS, istniejące hooki. Nie ma uzasadnienia dla nowego frameworka, headless CMS ani osobnej kopii świata. Telefon jest ważnym celem dla czytelnika i gracza; pełne zarządzanie kampanią/upload/administracja DM na telefonie nie są wymaganiem pierwszego MVP.

W tym etapie wolno zmieniać wyłącznie dokumentację. Nie zmieniano kodu, konfiguracji publikacji, notatek źródłowych, Vaulta, .obsidian ani istniejących znaczników. Nie instalowano zależności, nie wykonywano builda, deploymentu, commita ani push.

## 2. Audyt interfejsu i treści
### Nawigacja i layouty
- layouts/note.njk i layouts/index.njk współdzielą pageheader, navbar/filetree, wyszukiwarkę, sidebar, backlinki i hooki dynamics. Rozdzielenie strony głównej wynika z gardenEntry w notes.11tydata.js, nie z typu encji.
- navbar.njk daje głównie powrót do strony głównej i wyszukiwanie; nie ma menu sześciu obszarów kampanii.
- filetree.njk pokazuje strukturę folderów i korzysta z Alpine.js; próg mobilny wynosi 1000 px. Przycisk mobilnego menu jest obecnie elementem span z obsługą kliknięcia, nie kompletnym przyciskiem z klawiaturą i aria-expanded.
- sidebar.njk łączy graf, spis treści i backlinki. Dla krótkiej strony NPC mogą dominować nad właściwą treścią.
- Strona główna DND/Wiki/Wiki Dnd.md zawiera obraz i cztery odnośniki. Postacie.md jest ręczną listą czterech linków, Lokacje.md prowadzi do Neverwinter. Nie ma pełnych katalogów Bestiariusza i Sesji w proponowanym znaczeniu.
- Notatki mają nierówną zawartość: np. Galanthe ma portret i krótki publiczny opis, Quentin głównie obraz. Nie wolno automatycznie wypełniać brakujących informacji domysłami AI.
- Folder nie jest wiarygodnym typem encji: np. Bregan d'arthe to notatka zbiorcza pod Postacie, a nie dowód istnienia jednej osoby.
- Nowe wpisy przedmiotów są kartami PNG; Staff of War ma dwa PNG w jednym wpisie. Tę relację zachowujemy.

### Style
- src/site/styles/custom-style.scss jest prawie pustym stubem; brak lokalnego, spójnego systemu encyklopedii.
- style.scss zawiera ostrzeżenie przed edycją, bo aktualizacja szablonu go nadpisuje. Ma różnokolorowe poziomy nagłówków i bazowe motywy; to nie powinno być miejscem nowego design systemu.
- digital-garden-base.scss wystawia użyteczne zmienne: m.in. --dg-content-max-width (700px), --dg-content-font-size (18px), line-height (1.5), rozmiary sidebarów i filetree.
- Style mają różne breakpointy (m.in. 768, 800, 1000px). Nowy komponent nie powinien dokładać przypadkowych, sprzecznych progów.
- Skuteczny motyw/ustawienia produkcyjne mogą pochodzić z .env i pobieranego CSS; nie odczytywano sekretów ani ustawień panelu. Nie twierdzimy, że obejrzano całą produkcję w przeglądarce.

### Rozszerzenia dostępne w tej wersji
- src/helpers/userSetup.js: userMarkdownSetup i userEleventySetup — aktualnie puste hooki.
- src/helpers/userUtils.js: userComputed(data) — aktualnie zwraca pusty obiekt; wynik dostępny jako userComputed.
- components/user/{common,notes,index}/{head,header,beforeContent,afterContent,footer}/ — automatyczne wykrywanie komponentów przez _data/dynamics.js.
- components/user/filetree/{beforeTitle,afterTitle}/ i components/user/sidebar/{top,bottom}/.
- src/site/styles/user/*.scss — wykrywanie i dołączanie przez dynamics.styles.
- Ważne ograniczenie: common.header jest WEWNĄTRZ nagłówka main, a nie slotem globalnego headera przed main. Nie udajemy, że samo dodanie pliku do user/header zastąpi nawigację systemową.
- notes.11tydata.js wybiera note/index bez uwzględniania dowolnego nowego layoutu wpisanego w Markdown. Samo dopisanie layout:npc nie wystarczy.
- Aktualna dokumentacja upstream może opisywać nowszy system pluginów src/plugins. Nie ma go w zbadanej wersji lokalnej; nie proponujemy migracji szablonu tylko po to, by go użyć.

### Istotne powierzchnie publikacji
- Markdown dopuszcza HTML, a layout renderuje treść przez safe. Dla danych graczy jest to zbyt szerokie.
- Wszystkie obrazy z src/site/img są kopiowane do publikacji.
- search-index.njk indeksuje wyrenderowaną treść; sitemap.njk obejmuje strony poza hide, ale hide nie blokuje dostępu po adresie.
- notes.11tydata.js oraz linkUtils.js przekazują metadata:item.data do kontekstu Bases. To potencjalna droga ujawnienia przez zapytania/widoki, a nie dowód konkretnego wycieku w obecnych danych.
- Link previews pobierają HTML strony. Ukryte fragmenty w statycznym HTML nie stają się prywatne.
- Nie sprawdzano ustawień eksportu własnych pól w rzeczywistym pluginie/Vaultcie. Nowe UI nie może wymagać włączenia eksportu całego frontmatteru.

## 3. System wizualny — propozycja
Kierunek: atlas i kronika kampanii. Jasne, spokojne powierzchnie, czytelny tekst, granatowe akcenty i oszczędne złoto. Klimat fantasy wynika z typografii nagłówków i detali, nie z ornamentów za tekstem.

| Token | Wartość startowa | Zastosowanie |
|---|---|---|
| --lk-bg | #F4F0E8 | Tło pergaminowe, bez ciężkiej bitmapy |
| --lk-surface | #FFFCF6 | Karty i panel czytania |
| --lk-text | #232A32 | Tekst |
| --lk-muted | #59616A | Metadane i etykiety |
| --lk-accent | #244B68 | Linki, nawigacja, focus |
| --lk-gold | #8A672D | Małe detale i kategorie |
| --lk-danger | #8D3439 | Ostrzeżenia i działania destrukcyjne |

Obliczone kontrasty sRGB: text/bg 12.75:1, muted/surface 6.13:1, accent/surface 8.99:1, gold/surface 5.05:1. To pomiar tych par kolorów, nie audyt WCAG gotowego interfejsu. Stanów nie oznaczamy wyłącznie kolorem. Wariant ciemny może używać tych samych tokenów semantycznych, ale wymaga osobnego sprawdzenia; nie jest warunkiem pierwszego slice.

Typografia:
- Tekst: system-ui, Segoe UI, sans-serif; 18px desktop, minimum 16px mobile, line-height 1.6–1.7.
- Nagłówki: Georgia/Cambria/serif, bez kosztu nowego pobierania fontów; dekoracyjny krój nie trafia do długich akapitów.
- H1 32–48px responsywnie, H2 26–32px, H3 21–24px; jeden semantyczny H1 na stronę.
- Długość akapitu około 65–72 znaków, podstawowy obszar czytania 46–50rem. Katalogi i mapy mogą używać szerszej powierzchni do około 76rem.
- Odstępy: skala 4/8/12/16/24/32/48/64px; akapity 16–20px, sekcje 32–48px.
- Karty: radius 10–12px, obrys i delikatny cień; bez głębokich ramek wewnątrz każdej sekcji.
- Wszystkie interaktywne elementy z widocznym focusem i docelowym polem dotyku minimum 44×44px.

Układ:
- Desktop >=1200px: stały, czytelny pasek kategorii; tekst pośrodku; pomocniczy TOC/relacje tylko gdy są użyteczne.
- Tablet 768–1199px: jeden główny obszar, TOC zwijany.
- Mobile <768px: jedna kolumna, pasek logo/menu/szukaj, panel menu z prawidłowym focusem i Escape. Testować także istniejący próg 1000px.
- Mapa wewnątrz kontrolowanego obszaru, bez 99vw i transform przesuwających całą treść. Osobny przycisk powiększenia.
- Drzewo plików pozostaje opcjonalnym widokiem zaawansowanym. Nie jest głównym menu i nie może dublować panelu mobilnego.

## 4. Strona główna i architektura informacji
Menu główne, zawsze w tej kolejności:
| Etykieta | Adres docelowy | Uwagi |
|---|---|---|
| Postacie | /dnd/wiki/postacie/ | Zachować permalink, dodać katalog i filtry typów, bez automatycznego uznawania wszystkiego za NPC |
| Lokacje | /dnd/wiki/lokacje/ | Zachować adres; region/miasto tylko z zatwierdzonych danych |
| Bestiariusz | /bestiariusz/ | Nowy katalog publicznych przeciwników; pusty stan zamiast wymyślonych wpisów |
| Przedmioty | /przedmioty/ | Obecne PNG; zaklęcie towarzyszące nie tworzy osobnego wpisu |
| Mapy | /maps/ | Katalog Maps 2.0, widoczność zgodna z uprawnieniami |
| Sesje | /sesje/ | Zatwierdzone relacje z sesji, odnośnik do istniejącego dziennika |

Nie zmieniać istniejących permalinków poszczególnych notatek. Nie tworzyć drugiej strony Neverwinter ani osobnego Artistry of War. Nie tworzyć drugiego gardenEntry konkurującego o "/".

Strona główna:
1. Nazwa kampanii, krótki publiczny opis, jeden główny przycisk "Otwórz mapy" i wyszukiwarka.
2. Sześć czytelnych kart działów.
3. Wyróżniona lokacja/mapa oraz ostatnia OPUBLIKOWANA sesja, jeżeli istnieje zatwierdzona data i treść.
4. Ostatnio zmienione publiczne wpisy, ale bez pokazywania prywatnych szkiców i planów sesji.
5. Stan pusty dla brakujących działów; nie udajemy, że Session Planner już generuje dane.

Wyszukiwarka: zachować obecny mechanizm Digital Garden. Dodać czytelny przycisk i opcjonalny skrót "/" tylko poza polami tekstowymi, etykiety typów i filtr kategorii oparty na bezpiecznej projekcji danych. Nie budować drugiego indeksu pełnego lore, nie indeksować runtime'owych adnotacji Supabase w statycznym buildzie. Zachować klawiaturę, wyniki z poprawnymi URL i komunikat braku wyników.

Podczas przejścia zachować obecną treść strony głównej i linki jako materiał źródłowy. Zastąpienie jej układu ma być jawne i odwracalne, bez masowego usuwania treści Markdown.

## 5. Widoki encji
Wspólny szkielet: breadcrumb → tytuł i typ → krótka sekcja faktów → treść źródłowa → powiązane wpisy → backlinki. Brak danych oznacza pominięcie pola, nie wygenerowanie odpowiedzi.

### NPC
- Portret, publiczna rola, znana afiliacja i miejsce — tylko gdy zatwierdzone.
- Publiczny opis i informacje zdobyte przez drużynę; bez sekretów, ukrytej tożsamości, motywacji DM czy przyszłego losu postaci.
- Sekcje "Opis", "Powiązania", "Wystąpienia w sesjach" tylko przy istniejących źródłach.
- Status żywy/martwy nie jest automatyczną etykietą: może być spoilerem.
- PC może później użyć tego samego komponentu z innym oznaczeniem. Notatki o frakcjach pozostają ogólnymi artykułami, dopóki typ nie zostanie jawnie nadany.

### Przeciwnik
- Nazwa, typ stworzenia i publiczna ilustracja; wizualnie odmienna etykieta i spokojny akcent czerwony.
- Opis zagrożenia i publiczne fakty, bez ukrytych taktyk, wyposażenia lub słabości.
- Statystyki tylko jako opcjonalny, jawnie zatwierdzony public_stats o zamkniętych polach. Brak oznacza brak panelu statystyk; nie ujawniać automatycznie AC/HP/CR.
- Nie tworzyć danych z portretu ani domysłów AI. Brak zatwierdzonej notatki przeciwnika jest otwartym wyborem treści, nie blokadą projektu widoku.

### Lokacja
- Nazwa, rodzaj miejsca, nadrzędna lokacja i publiczny opis.
- Mapa z map_id, lista miejsc i przycisk "Otwórz pełną mapę"; mapa jest uzupełnieniem tekstu, nie jedynym sposobem znalezienia lokacji.
- Osobne oznaczenia "Oficjalne lokacje" i "Notatki drużyny".
- Adnotacje nie są dopisywane do Markdownu, oficjalne lore nie jest nadpisywane z edytora.
- Błąd Auth/Supabase nie usuwa opisu lokacji; mapa pokazuje uczciwy stan błędu/fallbacku.

### Przedmioty i zaklęcia
- Istniejący wpis i kolejność obrazów pozostają niezmienione.
- Staff of War: karta przedmiotu, potem Artistry of War, na jednym URL.
- PNG wyświetlane w naturalnych proporcjach, z możliwością otwarcia pełnej rozdzielczości. Bez filtra zmieniającego barwy i bez wycinania tekstu.
- Na małym ekranie dopuszczamy powiększenie obrazu, nie zmniejszamy czytelności całej wiki. Nie tworzymy drugiego renderera kart w HTML.
- Jeżeli źródłowy Markdown już zawiera portret lub H1, komponent nie duplikuje go; analizujemy treść na etapie buildu i zachowujemy źródło. Nie usuwamy akapitów przez przypadkowe selektory JS.

## 6. Minimalny bezpieczny model metadanych
### Źródło w MVP
Proponowany plik src/wiki/public-entries.json to ręcznie przeglądany rejestr prezentacyjny, kluczowany istniejącym permalinkiem. To warstwa typu/ilustracji/nawigacji, nie druga kopia lore. Pozwala wdrożyć layout bez zmian w Vaultcie i bez założenia, że plugin przesyła własne pola frontmatteru.

Późniejszy adapter publicznego frontmatteru może dostarczać ten sam DTO, ale dopiero po sprawdzeniu ustawień pluginu i osobnej zgodzie. Nie włączać dgPassFrontmatter jako sposobu eksportowania całej zawartości.

Pola:
| Pole | Zasada |
|---|---|
| schema_version | 1 |
| id | Stabilny publiczny slug, bez odniesień do prywatnych ścieżek |
| kind | npc, pc, enemy, location, item, spell, session albo article |
| title | Krótki tekst, bez HTML; fallback do istniejącego publicznego tytułu |
| permalink | Istniejący kanoniczny adres tego samego serwisu |
| summary | Opcjonalny publiczny tekst, np. do 280 znaków; nie generowany z prywatnego źródła |
| image | Opcjonalnie src i alt; lokalne PNG/JPEG/WebP z przeglądu |
| related_ids | Opcjonalnie wyłącznie ID istniejących, dopuszczonych wpisów |
| map_id | Opcjonalne UUID dla lokacji; samo ID nie nadaje dostępu |
| session_date | Opcjonalna jawnie opublikowana data dla sesji |
| public_facts | Opcjonalny zamknięty obiekt: rola/afiliacja dla NPC, typ/parent_id lokacji |
| public_stats | Opcjonalny zamknięty obiekt przeciwnika, tylko jawnie dopuszczone pola |

Nieznane pola rejestru są błędem walidacji. Nie ma dowolnego obiektu metadata, html, raw_frontmatter lub "pozostałe właściwości". Kategorie wynikają z kind i jawnej konfiguracji. Każdy typ ma własną listę dozwolonych public_facts/public_stats; nie przepuszczamy całego obiektu.

W pierwszym slice rejestr jest minimalny: Galanthe i Neverwinter. Przykładowo publiczne streszczenie Galanthe można zaczerpnąć wyłącznie z już opublikowanego opisu. Nie tworzymy fałszywego powiązania Galanthe z Neverwinter: istniejący opis wskazuje Phandalin.

### Projekcja i granica bezpieczeństwa
- publicMetadata.js tworzy NOWY obiekt z dozwolonych pól, zamiast serializować data lub rozrzucać ...data.
- Sam rejestr nie chroni sekretów w treści Markdown, obrazach i już opublikowanej historii. Publikować wolno tylko przejrzaną treść; nie skanujemy w tym zadaniu Vaulta.
- Zakazane m.in. dm_notes, secrets, hidden_identity, unrevealed_plot, planned_events, private_relations, tokeny, e-maile użytkowników i arbitralne frontmatter.
- Przed przyszłym buildem walidować publikacyjne źródła i załączniki. Wykryte pola prywatne mają zatrzymać publikację, a nie tylko zostać niewidoczne w komponencie.
- Sprawdzić HTML, searchIndex.json, graph.json, sitemap.xml, feed.xml, podglądy linków, wydruki, JSON-y katalogów oraz wyniki Bases.
- Nie zmieniać globalnej semantyki hide na "bezpieczeństwo". Zalogowanie do map nie chroni statycznych stron wiki.
- Nie przenosić prywatnych informacji DM do klienta gracza. Ewentualne przyszłe prywatne dane wymagają odrębnego modelu i serwerowej autoryzacji; ich włączenie nie jest elementem tej pionowej implementacji.

## 7. Integracja Maps 2.0 i natychmiastowe współdzielenie
Leaflet + Supabase to nadal PROPOZYCJA techniczna do walidacji. Istnienie Leaflet 1.9.4 w obecnej mapie jest faktem. Nowe wymaganie to brak ręcznego reloadu u drugiego gracza — dawne polling 15 s nie spełnia tego celu.

Propozycja dla małej drużyny:
1. Auth i członkostwo kampanii, osobna warstwa official (DM) i party (własne punkty graczy).
2. Zapis rekordu w PostgreSQL pod RLS; dopiero zaakceptowany zapis jest trwałą zmianą.
3. Supabase Postgres Changes dostarcza INSERT/UPDATE; filtr map_id ogranicza ruch, a RLS rozstrzyga odbiorców.
4. Subskrypcja przed snapshotem, buforowanie i scalanie po id/version, pełna resynchronizacja po reconnect.
5. Soft delete przez UPDATE; brak subskrypcji fizycznych DELETE. Usunięty rekord/tombstone pozostaje RLS-odczytywalny uprawnionej drużynie, aby event usunął punkt z jej widoku. Zniknięcie w UI nie opiera się na DELETE, które ma inne ograniczenia autoryzacji.
6. Konflikty edycji przez version; player A nie może zmienić owner_id, map_id, rodzaju, visibility lub roli.
7. Jawne stany: łączenie, na żywo, zapis, konflikt, utrata połączenia, odmowa dostępu.
8. Proponowany mierzalny cel: p95 do 2 s od potwierdzenia zapisu do pojawienia się punktu na drugim aktywnym kliencie w teście; nie jest to gwarancja dostawcy. Bez subskrypcji pokazujemy stan zdegradowany, nie etykietę "na żywo".
9. Konto poza kampanią nie dostaje danych ani zdarzeń. Po wykryciu wylogowania/odmowy czyścimy lokalny stan, a baza blokuje dalsze zapisy i dostarczanie uprawnionych tylko członkom wierszy. Wcześniej pobranej informacji nie można odwołać ze zrzutów użytkownika.

Widok gracza na telefonie obsługuje dodanie/edycję własnego punktu i listę punktów. Zarządzanie rolami, pełna administracja/upload DM mogą pozostać wygodnymi funkcjami desktopowymi. Nie wprowadzamy obowiązku pełnego panelu mobilnego DM.

## 8. Preferowane rozszerzenia i małe wyjątki
Najpierw custom-style.scss + styles/user, userSetup.js, userUtils.js i components/user. Nie kopiować całych bazowych layoutów tylko dla trzech typów encji. NPC/enemy/location mogą dzielić note.njk, otrzymując różne sekcje metadanych i relacji.

Wyjątek uzasadniony lokalnym kodem: globalne menu potrzebuje miejsca przed main. Proponowana mała zmiana note.njk i index.njk:
- opcjonalnie include komponentu wiki navigation przed main;
- warunek zapobiegający jednoczesnemu wyświetlaniu starego navbar/filetree i nowego menu;
- fallback do bazowej nawigacji przy wyłączonej funkcji;
- ewentualne użycie zatwierdzonego tytułu z projekcji i pominięcie podwójnego H1.

Warunek wybiera UI, nie zabezpiecza treści. Zmianę core ograniczyć do tych punktów, objąć regresją i opisać przy aktualizacjach Digital Garden. Jeżeli później rzeczywiście potrzebny jest osobny pełny layout, trzeba też jawnie rozszerzyć selector w notes.11tydata.js — nie polegać na ignorowanym polu layout. Pierwszy slice tego nie wymaga.

## 9. Dokładne pliki przyszłej implementacji
| Plik | Zakres i priorytet |
|---|---|
| src/site/styles/custom-style.scss | Tokeny --lk-* i mapowanie --dg-*, bez edycji style.scss |
| src/site/styles/user/wiki-experience.scss | Komponenty, grid, formularze, menu i breakpointy |
| src/helpers/userSetup.js | Rejestracja kolekcji/filtrów i walidatora publikacji w hookach |
| src/helpers/userUtils.js | Publiczny model wyświetlania, aktywna kategoria i kontrolowany fallback |
| src/helpers/wiki/publicMetadata.js | Schemat/allowlista i projekcja bez surowego frontmatteru |
| src/helpers/wiki/catalogs.js | Katalogi wyłącznie zatwierdzonych publicznych wpisów |
| src/wiki/public-entries.json | Przejrzane metadane prezentacyjne, początkowo dwa wpisy |
| src/site/_data/wiki.js | Stałe menu, etykiety, jawne ustawienia funkcji |
| src/site/_includes/components/user/wiki/navigation.njk | Współdzielony partial; nie jest automatycznym slotem dynamics, include jawny |
| src/site/_includes/components/user/notes/beforeContent/wiki-entry.njk | Dispatcher faktów NPC/enemy/location, bez duplikacji źródłowej treści |
| src/site/_includes/components/user/notes/afterContent/wiki-related.njk | Zweryfikowane relacje i miejsca na mapie |
| src/site/_includes/components/user/index/beforeContent/wiki-home.njk | Strona wejściowa i sześć działów, bez drugiego gardenEntry |
| src/site/_includes/components/user/common/footer/wiki-scripts.njk | Mały skrypt menu; brak nowej aplikacji SPA |
| src/site/_includes/components/user/wiki/{npc,enemy,location}.njk | Nieautomatyczne partiale widoków |
| src/site/_includes/layouts/{note,index}.njk | Tylko jawny seam globalnej nawigacji/fallback/H1 opisany wyżej |
| src/site/{bestiariusz,sesje}/index.njk | Nowe katalogi, bez konkurencji o istniejące adresy |
| src/site/_includes/components/user/wiki/catalog.njk | Wspólny widok katalogu dla starych i nowych działów |
| src/site/notes/DND/Wiki/{Postacie,Lokacje}.md, src/site/notes/Przedmioty.md | Domyślnie bez nadpisywania; katalog dodawany po permalinku przez komponent |
| src/site/_includes/components/campaignMap.njk | W kolejnym etapie adapter Maps, izolacja instancji i bezpieczny DOM |
| src/maps/{viewer,editor,repository,auth,realtime,validation,export,legacy}.js | Dopiero M1B: moduły Maps według osobnego audytu |
| src/site/_data/maps.js, src/site/maps/{index,view,auth}.njk | Dopiero M1B: jawna konfiguracja i widoki |
| supabase/migrations/, supabase/tests/ | Dopiero po zatwierdzeniu technologii: model, RLS, Realtime i testy |
| src/site/search-index.njk | Tylko jeśli niezbędne: typ z projekcji i zatwierdzona treść, bez powielonego indeksu |
| src/site/notes/notes.11tydata.js, src/helpers/linkUtils.js | Celowana osłona projekcji Bases, jeśli testy wymagają; bez dowolnego raw metadata |
| tests/wiki/, tests/maps/, tests/security/, tests/e2e/ | Testy jednostkowe, prywatności, regresji i dwóch kont |
| package.json, package-lock.json | Dopiero implementacja: komendy testów/bundlera; zależności bez nowego frameworka |
| docs/{WIKI_EXPERIENCE_2,MAPS_2_AUDIT}.md | Plan i jawny wynik odbioru po etapach |

Nie modyfikować oryginalnego Vaulta, .obsidian ani ręcznie podmieniać plików generowanych z Vaulta w sposób, który zginie przy kolejnym publish. Rejestr po permalinku i komponenty ograniczają ten problem. Nie budować prototypu przez automatyczne zmiany wszystkich notatek.

## 10. Pierwsza pionowa implementacja — proponowany slice W1
Cel: użytkownik przechodzi nowym menu od katalogu do NPC i do lokacji z mapą, bez naruszenia istniejących kart i URL.

Treść: istniejąca Galanthe (/dnd/lokacje/phandalin/npc/galanthe/) i Neverwinter (/dnd/wiki/neverwinter/). Nie są przedstawiane jako powiązane fabularnie. Ich obecny publiczny tekst i ilustracje pozostają źródłem.

Kroki:
1. Dodać read-only, zatwierdzony rejestr dwóch wpisów i walidator publicznego DTO.
2. Wprowadzić tokeny i menu sześciu działów z aktywnym stanem, wyszukiwaniem, skip linkiem i obsługą klawiatury.
3. Dodać fakty i relacje Galanthe bez wymyślonych danych oraz bez drugiego portretu/H1.
4. Dodać layout lokacji Neverwinter z obecnym komponentem mapy i listą 11 miejsc. Nie usuwać i nie przeliczać znaczników w tym slice.
5. Pokazać katalogi Postacie/Lokacje oraz uczciwe puste stany pozostałych nowych obszarów; istniejące Przedmioty pozostają działające.
6. Sprawdzić desktop 1440px, tablet 1024px i telefon 390px; skrajny przypadek 320px, orientację poziomą i zoom tekstu 200%.
7. Zebrać checklistę i screenshoty w lokalnych artefaktach, bez automatycznej publikacji.
8. Wyłączyć flagę funkcji i potwierdzić powrót starego widoku; żadne treści nie są usuwane.

W1 nie udaje, że Maps 2.0 lub Supabase są już gotowe. Może pokazać istniejącą mapę tylko do odczytu. Zamknięcie całego M1 wymaga kolejnego slice W2/M1B z trwałym zapisem i testem dwóch uwierzytelnionych graczy na żywo. Pełny widok przeciwnika po W1 wymaga wskazania zatwierdzonej publicznej treści, a nie tylko makiety.

## 11. Kolejność dalszych prac i zależności
- W0: zatwierdzić projekt wizualny i publiczne pola; ustalić przykład przeciwnika. Nie blokować W1 niezatwierdzonym backendem.
- W1: pionowy slice opisany powyżej; to pierwszy rezultat do oceny estetyki i zgodności z Digital Garden.
- W2: katalogi, widok przeciwnika i wyszukiwanie po typach; regresja wszystkich istniejących stron.
- M1B.1: migawka 11 punktów i refaktor Leaflet bez zmiany danych.
- M1B.2: zweryfikowany wybór backendu, Auth/RLS/Storage i testy dostępu.
- M1B.3: edytor gracza i Realtime, test dwóch kont. Następnie nowe mapy/oficjalne lokacje DM.
- M1B.4: JSON, odtwarzanie, migracja Neverwinter i rollback.
- W3: wspólny odbiór M1A+M1B na desktop/mobile oraz dokumentacja utrzymania.

Roadmapa M0–M3 ma nadrzędny zakres: M0 jest funkcjonalnie zaakceptowane; M1A/M1B są planem; M2 Lore Manager ma dostarczać kontrolowany kontekst i diffy, a M3 Session Planner korzystać z M2. Żaden z przyszłych modułów nie jest tu oznaczony jako zaimplementowany. Wybrane technologie M1B i tryb przyszłych integracji AI pozostają decyzjami otwartymi.

## 12. Kryteria akceptacji
### W1
- Sześć obszarów menu jest dostępnych z każdej strony; brak podwójnego menu i pułapki focus.
- Galanthe i Neverwinter mają czytelne, odrębne sekcje bez duplikowania treści i bez wymyślonych faktów.
- Zachowano wszystkie 11 znaczników i ich źródło. Mapa nie powoduje poziomego overflow strony.
- Przedmioty i zaklęcia mają te same PNG/URL i kolejność; Staff of War nadal jest jednym wpisem.
- Nawigacja, treść i podstawowe katalogi działają bez JS; JS jest wymagany tylko dla funkcji interaktywnych.
- Kontrast tekstu minimum 4.5:1, komponentów/focus co najmniej 3:1, obsługa 200% zoomu, alt i poprawne nagłówki.
- Wyszukiwarka nie traci istniejących wyników i nie pokazuje prywatnych pól.
- Czytnik mobilny może otworzyć kartę pełnej rozdzielczości, a zwykłe strony nie pobierają niepotrzebnie Leaflet/Auth.

### Pełne M1
- W1/W2 przechodzą regresję starych permalinków, wiki linków, backlinków, TOC i wyszukiwarki.
- DM tworzy drugą niezależną mapę bez commita i deploymentu.
- Gracz A dodaje punkt; B z tej samej kampanii widzi go bez reloadu w docelowej latencji. B nie edytuje A, konto obce nie odbiera zdarzenia.
- Oficjalna warstwa jest tylko dla DM do edycji. RLS/serwer odrzuca requesty obchodzące UI.
- JSON odtwarza mapę z obrazem i punktami; reconnect/konflikty nie gubią danych.
- Odbiór jest świadomie zatwierdzony; sam audyt, makieta lub zielony build nie oznaczają ukończenia.

## 13. Testy bezpieczeństwa i regresji
1. Canary fixture z syntetycznym sekretem i polami dm_notes/hidden_identity: publikacja ma zostać zablokowana albo test wykryć naruszenie. Nie używać prawdziwych sekretów w testach.
2. Sprawdzić wygenerowane HTML, JSON, feed, sitemap, wyniki Bases, preview i kopie obrazów. Brak sekretnych nazw, wartości i prywatnych ścieżek.
3. Payload <img onerror>, <script>, javascript:, data:text/html i CSS injection w metadanych/markerach nie wykonuje kodu.
4. Linki lokalne walidowane; zewnętrzne tylko jawnie dozwolone. Brak otwartych redirectów po logowaniu.
5. Gość, gracz A, gracz B, DM, konto bez członkostwa i druga kampania: macierz CRUD i Realtime bez polegania na UI.
6. Próba zmiany owner_id/kind/map_id/visibility/roli oraz bezpośrednie wywołanie importu/exportu: odmowa lub jawnie dozwolony zakres.
7. Wygaśnięcie tokena, odebranie członkostwa, reconnect i brak sieci: brak kolejnych nieuprawnionych danych, uczciwe błędy i czyszczenie stanu sesji.
8. Nowy motyw nie zmienia SHA-256 kart PNG; wszystkie obrazy i stare permalinki istnieją.
9. Aktualizacja szablonu Digital Garden: sprawdzenie małych seamów bazowych layoutów, kolejności stylów i hooków. Bez niekontrolowanego merge całego layoutu.
10. Playwright desktop/mobile i axe lub równoważna kontrola dostępności; raport wymaga rzeczywistego wykonania, nie samej obecności testów.

## 14. Otwarte decyzje
- Akceptacja proponowanej jasnej palety i pozostawienie ciemnego wariantu na później.
- Jawna klasyfikacja notatek, wybór publicznego przykładu przeciwnika i ewentualnych publicznych statystyk.
- Rejestr metadanych po permalinku w MVP vs późniejszy adapter frontmatteru; nie wymuszać ustawień Vaulta.
- Zatwierdzenie Leaflet + Supabase, regionu/planów usług, SMTP i sposobu administracji członkostwem.
- Parametry celu latencji Realtime i zasady dla usuniętych punktów.
- Publiczne vs tylko drużynowe mapy; prywatne treści wymagają rzeczywistej autoryzacji, nie pól hide.
- Małe zmiany bazowych layoutów i ich procedura aktualizacji.
- Ścieżka importu do Obsidiana pozostaje osobnym testem; publikacje obecnych kart potwierdzono wcześniej, nie przeprowadzano tego testu ponownie tutaj.

## 15. Źródła i wynik tego etapu
Pliki repo wymienione w audycie są podstawą stwierdzeń o implementacji. Dokumentacja zewnętrzna sprawdzona 2026-10-22:
- [Digital Garden — konfiguracja i rozszerzenia](https://github.com/oleeskild/obsidian-digital-garden).
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization).
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Leaflet CRS.Simple](https://leafletjs.com/examples/crs-simple/crs-simple.html).

Nie zakładać zgodności najnowszych funkcji upstream z lokalną wersją. Ustalenia o hookach potwierdzono lokalnym kodem. Wynik etapu: zapisany audyt i plan, nie nowa nawigacja, wdrożony motyw lub działający backend. Nie uruchomiono nowych testów aplikacji. Żadna propozycja techniczna w tym raporcie nie zastępuje zatwierdzonej roadmapy ani wcześniejszych decyzji.
