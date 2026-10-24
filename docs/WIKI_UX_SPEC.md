# Wiki UX 2.0 — projekt techniczny M1A.1

Status: **SPECYFIKACJA M1A + PROTOTYP M1A.1 + PRZYGOTOWANIE DANYCH M1A.2**. Implementacja demonstracyjna opisana w [WIKI_UI_PROTOTYPE.md](WIKI_UI_PROTOTYPE.md); produkcyjne zasilanie nadal jest planem. Data aktualizacji: 2026-10-22.
Panel boczny, drawer, wielowymiarowe grupowanie i strony frakcji są zatwierdzonym kierunkiem UX. Otwarte szczegóły techniczne wymienia sekcja 13.
Sekcja 2 zachowuje ustalenia historycznego audytu sprzed blokady M1A.2. Bieżący stan walidacji i rzeczywiste wyniki testów są w [PUBLICATION_READINESS.md](PUBLICATION_READINESS.md).
Repozytorium: `fundelverwiki`, gałąź `main`, HEAD `994d1c3b1826f8a0909240ffa886c04ab0e03ae9`.

## 1. Zakres i podstawa projektu

Celem jest uniwersalny interfejs publicznej wiki kampanii RPG: szybkie znalezienie materiału z sesji, czytelna strona główna, sześć kategorii, globalne wyszukiwanie i breadcrumbs. Zachowujemy Obsidian Digital Garden, Eleventy 3, Nunjucks, SCSS, Markdown, istniejące permalinki i karty PNG przedmiotów oraz zaklęć.

Podstawą są ponownie odczytane pliki aplikacji oraz wcześniejsze dokumenty projektowe: [WIKI_EXPERIENCE_2.md](WIKI_EXPERIENCE_2.md) i [MAPS_2_AUDIT.md](MAPS_2_AUDIT.md). Ich propozycje nie są dowodem wdrożenia ani zatwierdzenia. Obecne polecenie zastępuje wcześniejsze menu: obowiązują **Dokumenty, Postacie, Lokacje, Przedmioty, Mapy, Kronika**. Bestiariusz nie jest osobną kategorią; relacje z sesji i dzienniki mieszczą się w Kronice. Rozbudowane statystyki NPC i edytory lokacji pozostają poza zakresem; zatwierdzone rozszerzenie prototypu o prezentację postaci i lokacji opisano w sekcji 3.

Odczyt obejmował kod repozytorium i jawne flagi interfejsu, bez odczytywania oryginalnego vaulta, `.obsidian` i sekretów. Nie sprawdzano produkcji ani ustawień eksportu w pluginie. Nie wykonywano builda, testów aplikacji, instalacji, deploymentu, commita ani push. Zastany stan Git obejmował nieśledzone `AUDYT_LOREKEEPER.md` i `docs/`; pozostają zachowane. Wyniki niżej są analizą kodu, a kryteria i testy są planem.

## 2. Stan obecny potwierdzony w kodzie

| Obszar | Mechanizm i ograniczenie |
|---|---|
| Generator | `package.json`: Node 22.x, Eleventy ^3.1.2, Sass, Vitest; `npm run build` pobiera motyw, buduje HTML/CSS, `prebuild` usuwa `dist`. Nie uruchamiać tego skryptu jako niewinnej kontroli dokumentacji. |
| Strona główna | `src/site/notes/notes.11tydata.js` wybiera `layouts/index.njk` oraz `/` dla `gardenEntry`. Źródłem jest `notes/DND/Wiki/Wiki Dnd.md`: obraz i cztery ręczne wikilinki. Nie ma automatycznych kategorii ani ostatnio dodanych. |
| Notatki | Pozostałe wpisy używają `layouts/note.njk`; własne pole `layout` nie wystarcza do wybrania nowego szablonu. `notes.json` nadaje wszystkim tag `note`. |
| Nawigacja | Layouty wybierają `navbar.njk` albo `filetree.njk`. Navbar zapewnia nazwę/logo, home i opcjonalną wyszukiwarkę. Drzewo odzwierciedla foldery, nie model informacji gracza. Brak komponentu breadcrumbs. |
| Konfiguracja lokalna | `dgHomeLink=true`, `dgShowFileTree=false`, `dgEnableSearch=false`, `dgShowInlineTitle=false`, `dgPassFrontmatter=false`. Nie dowodzi to identycznych ustawień hostingu. |
| Wyszukiwanie | `searchContainer.njk`, `searchButton.njk`, `searchScript.njk`: modal, FlexSearch 0.7.21 z CDN, Ctrl/Cmd+K, Escape, strzałki, pobieranie HTML podglądu. Indeks tytułu, treści i tagów; tytuły scalane przed wynikami treści. |
| Indeks | `search-index.njk` zawsze generuje `/searchIndex.json` z `collections.note \| notHidden`. `notHidden` w `.eleventy.js` sprawdza wyłącznie `hide`. Treść pochodzi z `templateContent \| link \| stripForSearch`; usunięcie tagów regexem nie jest sanitizacją ani filtrem sekretów. |
| Słabe punkty search UI | Wyzwalacz i wyniki to klikalne `div`; brak kompletnego zarządzania focusem dialogu. Nasłuch `keydown` zamiast `input` wymaga poprawy dla wklejania/mobile. Wyniki, zapytanie i preview trafiają do `innerHTML`, co wymaga bezpiecznego renderowania. Normalizacja nie rozwiązuje jawnie `ł → l`. |
| Style | `pageheader.njk`: motyw/baza → `digital-garden-base.css` → `custom-style.css` → style użytkownika → Style Settings. Ostatnia warstwa może nadpisać wcześniejsze tokeny. |
| Publikacja | Brak wspólnej bramki zgody na publikację. `graph.njk` serializuje graf; sitemap używa `collections.all` i `hide`; feed używa `note`, ale data feedu odwołuje się do `collections.notes`. `.eleventy.js` kopiuje cały `src/site/img`. Bases otrzymuje `metadata: item.data` w `notes.11tydata.js` i `linkUtils.js`. |

Nie powtarzamy historycznej liczby notatek ani braków treści jako aktualnie sprawdzonych faktów. Nie uznajemy obecności pliku w repo lub `dist` za zgodę DM na jego publiczne udostępnienie.

## 3. Architektura informacji i ekranów

### Strona główna `/`

Kolejność od góry:

1. Wspólny shell: panel boczny z nazwą/logo, Startem i sześcioma sekcjami; na mobile pasek Menu/Szukaj i drawer. Skip link do głównej treści.
2. Jeden H1, krótki opcjonalny publiczny opis kampanii i **wyraźne pole „Szukaj w wiki”** z etykietą oraz przyciskiem. Wyszukiwarka jest głównym działaniem strony; obraz kampanii nie wypycha jej poza pierwszy ekran telefonu.
3. Sześć kart kategorii, zawsze w ustalonej kolejności. Nazwa, krótki opis i opcjonalnie liczba publicznych wpisów; bez pustych miniatur i fikcyjnej zawartości.
4. „Ostatnio dodane”: do sześciu publicznych materiałów, tytuł, kategoria, data dodania i opcjonalny zatwierdzony opis. Bez automatycznego ujawniania pierwszego akapitu jako streszczenia.
5. Opcjonalna sekcja „Z kroniki” z najnowszą opublikowaną relacją, tylko jeśli istnieją zatwierdzone dane; stopka.

Desktop: stały panel po lewej, po prawej `Nazwa + szukaj → Kategorie → Ostatnio dodane → opcjonalna Kronika → Stopka`. Zwinięcie panelu oddaje miejsce treści. Mobile: zamknięty drawer i jedna kolumna pod paskiem Menu/Szukaj; pole szukania pozostaje widoczne bez otwierania nawigacji.

Interakcje: karta kategorii otwiera katalog, ostatni materiał swój kanoniczny URL, pole home wspólną wyszukiwarkę. Brak datowanych materiałów: „Brak materiałów z potwierdzoną datą dodania” z linkami do katalogów. Puste kategorie pozostają widoczne; brak relacji sesji pomija sekcję Kroniki, a brak opisu/logo nie zostawia pustego bloku.

Nie tworzymy drugiego `gardenEntry` ani drugiej strony generującej `/`. Nowe sekcje dodaje slot `user/index/beforeContent/wiki-home.njk`. Oryginalny Markdown pozostaje źródłem; domyślnie pokazujemy go poniżej jako „Wprowadzenie i odnośniki”. Ewentualne pominięcie jego renderowania wymaga osobnego zatwierdzenia i odwracalnej flagi, bez usuwania źródła.

### Menu i katalogi

Aktualizacja lokalnego prototypu 2026-10-24: katalog Lokacje grupuje dzieci przez artykuł miejsca nadrzędnego. Neverwinter jest istniejącym kanonicznym artykułem z jawnymi wikilinkami do 11 miejsc i przyciskiem Otwórz mapę; nie utworzono jego duplikatu ani osobnego URL katalogu miasta. Artykuł pozostaje pod /dnd/wiki/neverwinter/, a interaktywny atlas ma osobny widok /maps/neverwinter/. Sekcja Mapy prowadzi do atlasu, Lokacje do artykułu; atlas odsyła do artykułów miejsc, które mogą prowadzić do wielu map bez duplikowania treści. Główny katalog pokazuje odnośnik do artykułu nadrzędnego, a dzieci mają ścieżkę Lokacje → Neverwinter → miejsce. Jawna konfiguracja nawigacji opiera się na stabilnych ID i zweryfikowanych linkach zatwierdzonego rodzica, niezależnie od liczby map; nie inferuje publicznej hierarchii z folderów lub prywatnych wikilinków. Przebieg i testy w PROJECT_STATUS.md. Produkcyjne wdrożenie pozostaje osobnym etapem.

| Kategoria / ID | Proponowany URL | Zakres |
|---|---|---|
| Dokumenty / `documents` | `/dokumenty/` | Listy, handouty, zasady i artykuły ogólne |
| Postacie / `characters` | `/dnd/wiki/postacie/` | Publiczne wpisy o bohaterach, NPC i zatwierdzonych grupach |
| Lokacje / `locations` | `/dnd/wiki/lokacje/` | Miejsca i regiony |
| Przedmioty / `items` | `/przedmioty/` | Obecne wpisy i karty, także zaklęcia towarzyszące |
| Mapy / `maps` | `/maps/` | Na początku publiczne odnośniki do istniejących map; później katalog Maps 2.0 |
| Kronika / `chronicle` | `/kronika/` | Relacje sesji, dzienniki i opublikowane zapiski |

Adresy katalogów wymagają kontroli kolizji przed implementacją; istniejący kanoniczny permalink ma pierwszeństwo. Dla istniejącego indeksu katalog jest sekcją dołączaną po URL, bez przepisywania Markdownu. Dla brakującego indeksu powstaje statyczny plik Nunjucks. Stare adresy dzienników i wpisów pozostają działające.

Katalog: H1, opis, liczba wpisów, opcjonalny filtr, lista tytułów i zatwierdzonych streszczeń. Domyślnie alfabetycznie po polsku; Kronika według jawnej daty sesji malejąco, wpisy bez dat osobno. Pusta kategoria pokazuje „Brak opublikowanych materiałów”. Zwykłe linki i pełna lista działają bez JS.

Zatwierdzone menu: **Start, Dokumenty, Postacie, Lokacje, Przedmioty, Mapy, Kronika**. Start prowadzi do `/`; pozostałe pozycje reprezentują sześć kategorii treści. Nie dodajemy osobnej sekcji Frakcje.

Desktop od 1000 px: **stały panel boczny z możliwością zwinięcia**, zamiast poziomego menu kategorii. Panel ma własne przewijanie przy małej wysokości; treść rezerwuje jego aktualną szerokość. Zwinięty panel zachowuje etykietowane przyciski rozwinięcia, Start i Szukaj; pozostałe sekcje są dostępne po rozwinięciu. Focus nie pozostaje w ukrytych kontrolkach. Zapamiętywanie samego stanu zwinięcia lokalnie pozostaje propozycją.

Poniżej 1000 px: pasek z nazwą/Start, Menu i Szukaj oraz **wysuwany modalny drawer boczny**. Otwarcie przenosi focus do panelu; tło jest nieaktywne i nieprzewijalne. Zamknij, Escape lub tap w backdrop zamykają panel i przywracają focus do Menu. Wybranie linku zamyka drawer. Zmiana breakpointu usuwa modalność i blokadę scrolla bez zgubienia focusu. Wyszukiwanie dostępne przy zamkniętym drawerze i zwiniętym panelu; uruchomienie go z drawera najpierw zamyka drawer, bez nakładania dwóch modalnych obszarów. Zamknięcie search oddaje focus widocznemu wyzwalaczowi.

Sekcje mogą mieć krótkie konfigurowalne podmenu, np. Postacie: Wszystkie, Według frakcji, Według lokacji. Link sekcji i przycisk rozwinięcia są odrębne; przyciski mają `aria-expanded` i `aria-controls`. Semantyczne `nav` i listy linków, `aria-current` dla aktywnej strony, obsługa Tab/Enter/Space. Nie stosujemy wzorca ARIA tree ani całego drzewa Obsidiana; panel nie jest automatyczną listą wszystkich frakcji i NPC. Głębsza eksploracja i filtrowanie należą do katalogów.

Bez JS linki nawigacji są dostępne jako rozwinięty blok w toku dokumentu; kontrolki drawera/zwijania ujawniają się po inicjalizacji. Wiki UX nie renderuje równoległego filetree. Fallback DG przy wyłączeniu całego trybu pozostaje odrębny.

Breadcrumbs na każdej podstronie: `Start → Kategoria → Tytuł`; na indeksie `Start → Kategoria`. `nav` z etykietą „Ścieżka nawigacji”, lista i `aria-current`. Długi tytuł zawija się. Hierarchia lokacji dopiero po jawnym zatwierdzeniu relacji; nie wyprowadzamy jej z folderów. Główna kategoria wpisu jest jedna, dodatkowe powiązania nie tworzą alternatywnej kanonicznej ścieżki.

### Wspólny widok artykułu

Breadcrumbs → jeden tytuł → opcjonalna etykieta kategorii → istniejąca treść Markdown → opcjonalne publiczne powiązania. Nie dodajemy statystyk NPC ani mechaniki systemowej. Prototyp wybiera proste komponenty postaci/lokacji po `kind`, zgodnie z zatwierdzonym rozszerzeniem poniżej. Frakcje nadal korzystają ze wspólnego artykułu i prostych list jawnych relacji.

Karty przedmiotów i zaklęć zachowują te same pliki, kolejność, proporcje i adres wpisu. Staff of War i Artistry of War pozostają razem, bez osobnego automatycznie utworzonego wpisu zaklęcia. Obrazy bez crop, filtrów barwnych i ponownego renderowania; dostępny link do pełnej rozdzielczości. Zmienia się otoczenie nawigacyjne, nie sposób prezentacji kart.



### Zatwierdzone rozszerzenie prototypu: postacie i lokacje

Aktualizacja po decyzjach DM 2026-10-24: ilustracje mają stały slot; przy braku grafiki pokazujemy neutralny placeholder zamiast usuwania ramki. Istniejące zatwierdzone obrazy w artykułach postaci są na jawne polecenie DM używane jako portrety; miniatura może być przybliżona w CSS, a kliknięcie otwiera pełny oryginał w dostępnym modalu. Źródła obrazów i Markdown pozostają bez zmian. Krótki opis korzysta z jawnie zatwierdzonego summary, bez automatycznego streszczania lore. Szczegóły i aktualne testy w PROJECT_STATUS.md; poniższa wzmianka o pomijaniu kolumny przy braku portretu opisuje wcześniejszą decyzję i została zastąpiona placeholderem.

Zachowujemy oceniony pozytywnie kierunek wizualny, tokeny, nawigację i wyszukiwarkę. Postać: opcjonalny portret po referencji do dopuszczonego publicznego zasobu, tytuł, opcjonalny publicznie zatwierdzony status, summary jako krótka rola/opis, linki frakcji i lokacji z dotychczasowych relacji oraz pełna istniejąca treść Markdown. Desktop może pokazywać portret obok opisu; mobile układa sekcje pionowo. Brak portretu usuwa kolumnę, brak statusu usuwa metadane — nie przypisujemy automatycznie statusu „Nieznany”.

Lokacja: tytuł i opis, opcjonalna zatwierdzona ilustracja, dotychczasowa treść Markdown, odwrócona projekcja publicznych relacji do postaci. „Powiązane postacie” pokazują miniaturę (lub neutralny inicjał), nazwę/link i jawny krótki opis relacji. Powiązanie nie oznacza aktualnej obecności; jedna postać może mieć wiele lokacji. Nie wnioskujemy z organizacji o jej członkach. Pusta lista ma komunikat o braku publicznie ujawnionych powiązań. Miejsce na „Pokaż na mapie” pozostaje jawnie nieaktywne do integracji Maps 2.0; nie generujemy pozornie działających linków.

Minimalne pola opcjonalne w istniejącym rejestrze: `portrait_asset_id` dla postaci, `illustration_asset_id` dla lokacji; wskazują manifest zasobów `id`, `src`, `alt`, `approved: true`. W odizolowanym fixture manifest jest polem `assets`, docelowo odpowiada opisanemu public-assets, bez osobnej kopii relacji. `status: {value, approved: true}` dopuszcza alive/dead/missing/unknown i wymaga osobnej jawnej akceptacji. Brak, false lub tekstowe „true” nie stanowi zgody. Krawędzie istniejącego modelu mogą mieć opcjonalne publiczne `description` (do 280 znaków), zatwierdzone razem z relacją, renderowane jako tekst. Legacy nazwa typu demo `located_in` oznacza tu neutralne powiązanie z miejscem, nie bieżące położenie. Nowe komponenty nie zmieniają ID, adresów ani źródłowego Markdownu. Produkcyjna bramka i przegląd faktycznych portretów/statusów nadal są wymagane przed podłączeniem rzeczywistego lore.

### Katalog postaci — ekran desktop/mobile

Desktop: obok stałego panelu breadcrumbs, H1, tryb „Wszystkie postacie / Według frakcji / Według lokacji / inne publiczne wymiary”, filtry, liczba unikalnych wyników i lista. Grupowanie organizuje listę, filtr zawęża zbiór. Nagłówki grup reprezentujących encje linkują do ich stron; zwykłe terminy filtrów nie udają stron. Jedna postać może wystąpić w kilku grupach z tym samym URL; w pojedynczej grupie tylko raz. Suma liczników grup nie jest liczbą wszystkich postaci.

Mobile: te same elementy w jednej kolumnie, wybór grupowania i zwijany region „Filtry” nad listą. Aktywne filtry i Wyczyść pozostają widoczne. Filtry katalogu nie trafiają do drawera globalnej nawigacji. Wynik zawiera tytuł, opcjonalny zatwierdzony opis i jawne linki do frakcji/lokacji, bez nowej metryczki NPC.

Proponowana logika: OR dla wartości jednego wymiaru, AND między wymiarami. URL przechowuje publiczne ID filtrów i grupowania; reload i Wstecz odtwarzają widok. Nieznany parametr jest ignorowany z neutralnym komunikatem, bez rozpoznawania prywatnych ID. Aktualizacja wyników ogłaszana przez aria-live bez przejmowania focusu. Bez JS dostępna pełna lista i linki stron encji; zaawansowane filtry mogą wymagać JS z jawną informacją o ograniczeniu.

Stany: „Brak opublikowanych postaci” dla pustego katalogu, „Brak wyników dla wybranych filtrów” z Wyczyść przy zerze dopasowań, „Bez publicznego przypisania” dla braku zatwierdzonej grupy. Ostatnia etykieta nie oznacza braku rzeczywistej afiliacji. Puste grupy domyślnie pomijamy. Nigdy nie liczymy prywatnych wpisów. Te same komponenty mogą obsługiwać dokumenty, przedmioty i lokacje według konfiguracji wymiarów.

### Strona frakcji / organizacji — ekran desktop/mobile

Frakcja jest pełnoprawną encją: jedno ID, jedna źródłowa notatka Markdown i jeden kanoniczny URL. Frakcja ma kind=organization/faction, niezależny od głównej sekcji nawigacyjnej; nie jest z definicji dokumentem. W prototypie wejście „Organizacje” znajduje się w podmenu Postaci, a breadcrumbs to Start → Organizacje → Nazwa. To prezentacyjna sekcja characters, nie zmiana rodzaju encji ani jej kanonicznego URL. Przypisanie do sekcji może być konfigurowane; nie dodajemy siódmej sekcji tematycznej. Istniejąca notatka organizacji zachowuje URL, także jeśli leży w folderze Postacie. Breadcrumbs wynikają z zatwierdzonej kategorii, nie drogi wejścia z katalogu.

Desktop: wspólny panel, breadcrumbs i jeden H1, opis ze źródłowego Markdownu, następnie „Znani członkowie”, „Powiązane lokacje”, „Powiązane dokumenty” i ewentualne inne skonfigurowane publiczne relacje. Listy mogą zajmować dwie kolumny przy zachowaniu liniowej kolejności odczytu. Mobile: opis i te same sekcje jedna pod drugą, drawer jak na pozostałych stronach. Nie kopiujemy opisu do osobnego źródła ani nie dublujemy tytułu.

Kliknięcie materiału prowadzi do jego kanonicznego URL; „Zobacz w katalogu” może otwierać filtr tej encji. Lista pokazuje tylko jawnie zatwierdzone relacje do odkrywalnych publicznych wpisów. Pusta sekcja: „Brak publicznie ujawnionych powiązań w tej sekcji”, bez twierdzenia o faktycznej liczbie członków. Brak opisu: neutralna informacja i dostępne relacje, bez generowania lore. Niepublikowana frakcja nie otrzymuje placeholdera ujawniającego istnienie.

## 4. Komponenty i granice odpowiedzialności

```text
Markdown po przeglądzie + publiczny rejestr + konfiguracja kampanii
                      ↓ walidacja publikacji i załączników
              publiczny model danych (allowlista pól)
                      ↓
       katalogi / home / breadcrumbs / search / graf / feed
                      ↓
            Nunjucks + wspólny shell + SCSS
                      ↓
             statyczny artefakt i kontrola prywatności
```

Ponownie wykorzystujemy parser Markdown, wikilinki i permalinki Digital Garden, oba layouty, hooki `userSetup.js` i `userUtils.js`, sloty `dynamics`, Sass, istniejący endpoint indeksu i silnik FlexSearch. TOC i backlinki mogą pozostać opcjonalne po ograniczeniu do publicznych danych. Drzewo nie jest częścią panelu Wiki UX; istniejący graf pozostaje opcjonalną funkcją pomocniczą, bez nowego silnika relacji. Silnik Bases pozostaje zgodny, ale nie jest potrzebny do budowy sześciu prostych katalogów i nie może otrzymywać surowych prywatnych metadanych.

Własne partiale `components/user/wiki/*` mają jawne include; nie udajemy, że `wiki` jest automatycznym namespace slotów. `common.header` leży wewnątrz `main/header`, więc nie nadaje się do zastąpienia globalnego navbaru. Uzasadniona mała zmiana obu layoutów wstawia wspólny shell przed `main`, wybiera nowe menu albo fallback DG i zapewnia jeden kontener wyszukiwania. Ten sam shell musi objąć 404, katalogi i przyszły viewer map.

Flaga `wiki.enabled` steruje wyglądem. Wyłączenie przywraca DG, lecz **nie wyłącza kontroli publikacji**. Pliki core wymienione w `plugin-info.json/filesToModify` mogą zostać nadpisane aktualizacją. Utrzymujemy krótką listę zmian integracyjnych i regresję; nie kopiujemy całych layoutów dla każdej kategorii.

## 5. Wyszukiwanie na każdej stronie

Jedna instancja kontrolera i jeden `/searchIndex.json`. Pole home przekazuje zapytanie do tego samego dialogu co globalny przycisk. Ctrl/Cmd+K działa globalnie; opcjonalny `/` odkładamy, aby nie kolidował z formularzami i mapą. Wyszukiwanie nie zależy od per-note `dgEnableSearch` w trybie Wiki UX.

Dialog: etykietowane pole, przycisk zamknięcia, focus początkowy, focus utrzymany w dialogu, Escape i powrót do wyzwalacza. Wyniki są prawdziwymi linkami; strzałki i Enter uzupełniają Tab. Na telefonie pełna szerokość dostępnego ekranu, bez hover jako warunku działania i bez obowiązkowego panelu preview. W MVP rezygnujemy z pobierania całego HTML preview; wystarczą tytuł, kategoria i fragment bezpiecznej treści indeksu.

Pola indeksu: `id`, `title`, `url`, `category`, `content`, zatwierdzone `tags`, opcjonalne jawne `aliases`. Bez `metadata`, prywatnych ścieżek i całego frontmatteru. Serializacja całej tablicy przez JSON.stringify zamiast ręcznego składania JSON. Alias nie tworzy drugiego wyniku. Filtr kategorii zawęża publiczne wyniki; domyślnie „Wszystkie”. Priorytet: dokładny tytuł/alias, prefiks tytułu, treść. Normalizacja zapytań i dokumentów identyczna, uwzględnia polskie znaki, w tym `ł`; test „Łódź”/„lodz”. Zaklęcia zapisane wyłącznie na PNG nie są automatycznie przeszukiwalne pełnotekstowo: bez OCR, dopuszczamy zatwierdzony alias istniejącego wpisu.

Ładowanie indeksu przy pierwszym otwarciu, cache jednej wersji buildu w pamięci; bez trwałego offline cache w tym etapie. Debounce około 200 ms na zdarzeniu `input`, obsługa composition, wklejania i wyścigów zapytań. Stany: początkowy, ładowanie, wyniki/liczba, brak wyników, błąd z „Spróbuj ponownie”; komunikaty przez `aria-live`. Renderowanie tekstu przez textContent i bezpieczne węzły `mark`, walidacja lokalnych URL, bez interpolacji zapytania do HTML. Brak JS lub CDN: czytelny komunikat i linki kategorii, bez obietnicy działającego full-text.

## 6. Motywy i konfiguracja kampanii

Rozdzielone warstwy niezależne od systemu RPG:

| Warstwa | Odpowiedzialność |
|---|---|
| Layout / komponenty | Semantyka, kolejność, grid, zachowanie; bez nazw świata i kolorów kampanii |
| Konfiguracja informacji | Menu, kategorie, podmenu, wymiary katalogów i słownik relacji; niezależne od wyglądu |
| Design tokens | Semantyczne zmienne CSS `--lk-*`, neutralne wartości domyślne |
| Konfiguracja kampanii / motywu | Nazwa, opis, zatwierdzone logo, ID motywu z allowlisty; osobny zestaw nadpisań tokenów |
| Markdown i relacje | Fakty, ilustracje źródłowe i zatwierdzone relacje po stabilnych ID; bez wymuszonego przepisywania wpisów pod nowy motyw |

`src/site/_data/wiki.js` definiuje stabilne kategorie i funkcje. `src/site/_data/campaign.js` zawiera wyłącznie publiczne `id`, `name`, `description`, `logo`, `themeId`. Żadnych kluczy usług ani swobodnych fragmentów CSS/HTML. Konfiguracja nie jest przekazywana w całości do klienta.

Proponowane tokeny semantyczne: `--lk-bg`, `--lk-surface`, `--lk-text`, `--lk-muted`, `--lk-accent`, `--lk-border`, `--lk-focus`, fonty, odstępy, szerokości czytania/katalogu oraz panelu rozwiniętego i zwiniętego. Konkretne kolory, fonty, ornamenty i rozmiary panelu nie są teraz finalnym projektem graficznym. Dwa testowe zestawy tokenów mają wykazać wymienność bez edycji Markdown/Nunjucks. Finalny motyw i warianty jasny/ciemny wymagają osobnego odbioru.

Jedno `styles/user/wiki.scss` importuje tokeny, komponenty i zatwierdzony motyw z partiali poza automatycznie wykrywanym katalogiem `styles/user`. To unika dołączania partiali jako osobnych arkuszy przez `dynamics.js`. Selektory ograniczone do `.lk-shell` i `body.lk-wiki`; nie resetujemy globalnie obrazów ani HTML map. W zakresie wiki kontrolowany adapter mapuje potrzebne `--dg-*` i zmienne Obsidiana na tokeny; nie zmieniamy `style.scss` i bazowych SCSS upstream.

Kolejność kaskady i Style Settings musi być jawnie sprawdzona: konfiguracje nadpisujące kontrast lub geometrię wymagają korekty przed odbiorem. Breakpoint nowego menu 1000 px odpowiada istniejącemu progowi DG; układ kart używa responsywnego gridu. Testujemy też 768/800/1400 px z uwagi na odziedziczone reguły. Brak uzależnienia nawigacji od ilustracji, frakcji i terminologii konkretnego świata.

## 7. Metadane, klasyfikacja i daty

Rozwijamy proponowany wcześniej `src/wiki/public-entries.json`, bez drugiego równoległego rejestru. Każdy dopuszczony wpis ma: stabilne `id`, istniejący `permalink`, jedną `category`, opcjonalne zatwierdzone `published_at`; opcjonalnie `kind`, zatwierdzony tytuł, `summary`, `aliases`, `map_id`. Jawne typowane relacje poniżej zastępują nieprecyzyjne `related_ids`. Daty ISO z jawną strefą. Lista dozwolonych załączników ma osobny manifest `src/wiki/public-assets.json`. Nieznane pola są błędem; dla M1A nie dodajemy public_stats ani dowolnych public_facts.

Kategoria nie wynika automatycznie z folderu ani tytułu. Brak zatwierdzonej klasyfikacji jest zadaniem przeglądu, nie powodem do zgadywania. Przed przełączeniem UI należy przejrzeć wszystkie dotychczasowe wpisy przeznaczone dla graczy, aby nie zniknęły z katalogów i search. Niedopuszczone materiały blokują wydanie; nie rozszerzamy allowlisty automatycznie.

„Ostatnio dodane” sortujemy po zatwierdzonym `published_at`, następnie stabilnym ID. Nie używamy mtime checkoutu, daty buildu ani domniemanej daty pierwszej sesji. Wpis bez daty pozostaje w katalogu/search, ale nie w tej sekcji; pokazujemy krótszą listę lub pusty stan. Datę historycznej publikacji trzeba potwierdzić, nie fabrykować. `session_date` może później porządkować Kronikę i nie zastępuje daty dodania.


### Minimalne rozszerzenie modelu danych

Jedna główna kategoria i jedna notatka pozostają niezmienne. Przynależność do wielu grup nie wynika z folderów, nazwy ani wikilinków. Wersjonowany model ma trzy dodatki do istniejącego rejestru:

| Element | Minimalny kontrakt |
|---|---|
| `public-entries.json` | Istniejące stabilne `id`, `permalink`, jedna `category`; `kind` rozróżnia m.in. character, faction, organization, location, document, item. Strona encji wymaga dopuszczonej notatki. |
| `src/wiki/public-facets.json` | `schema_version`; wymiary: `id`, `label`, `categories`, `source` = entity_relation lub terms. Pierwszy wskazuje typ relacji i rodzaj encji docelowej; drugi zawiera terminy `id`, `label` bez URL i jawne przypisania `entry_id`, `dimension_id`, `term_id`. |
| `src/wiki/public-relations.json` | `schema_version`; konfigurowalny słownik typów: ID, etykieta w przód/wstecz i dozwolone rodzaje końców; krawędzie: `id`, `source_id`, `type`, `target_id`, `approved: true`. |

Przykład syntetyczny: postać pc-1 ma dwie jawne relacje member_of do faction-1 i faction-2, dwie associated_with_location do lokacji oraz termin profession:merchant. Frakcje mają notatki i URL; merchant jest tylko etykietą filtra. To przykład kontraktu, nie fakt kampanijny. „Magowie” mogą być terminem, a konkretna organizacja magów encją: rozstrzyga konfiguracja, nie słowo. Zamiana terminu w encję wymaga jawnego mapowania i dopuszczenia notatki.

„Znani członkowie” to odwrócony odczyt tej samej zatwierdzonej krawędzi member_of, bez kopiowania i bez wnioskowania. Powiązanie frakcji z lokacją/dokumentem wymaga osobnej jawnej krawędzi. Nie wyprowadzamy lokacji frakcji z miejsca pobytu członka, afiliacji przechodnich ani relacji z folderów i nieopublikowanych wikilinków. Zwykłe indeksy po ID wystarczają; brak nowego silnika grafowego.

Publiczne pliki nie przechowują prywatnych kandydatów, `approved: false`, uzasadnień DM ani prywatnych identyfikatorów. Każde przypisanie terminu jest również przeglądane. Sama publikacja obu encji nie zatwierdza relacji między nimi. Nieznany/niedopuszczony koniec, brak jawnej akceptacji, nieznany typ lub zduplikowana krawędź blokują walidację bez ujawnienia danych w publicznym błędzie. Projekcja odkrywalności pomija `hide` i przyległe relacje na listach frakcji, w katalogach, filtrach i licznikach. Nie publikujemy nazw pustych grup zdradzających niepubliczne encje. Wyszukiwarka nie otrzymuje relacji ani przypisań spoza tej projekcji.

Konfiguracja wymiarów, rodzajów encji i relacji jest niezależna od komponentów, menu i tokenów wizualnych; pozwala dostosować katalog do dowolnej kampanii/systemu RPG. Stabilne ID i schema_version pozwolą Lore Managerowi przygotować propozycję/diff w tym samym kontrakcie. Dopiero przegląd człowieka dopuszcza wynik do publicznych rejestrów. Brak automatycznego importu prywatnego kontekstu, inferencji i zapisu do vaulta w M1A.

## 8. Publiczna treść i ochrona informacji DM

### Granica bezpieczeństwa

Publiczne znaczy dostępne każdemu, kto otrzyma statyczny artefakt. Logowanie Maps, ukrycie CSS, `hide`, `hideInGraph`, `hideInFiletree`, robots.txt i brak odnośnika nie zabezpieczają notatki. Sam filtr wyszukiwarki nie rozwiązuje dostępu po URL ani ujawnienia sekretu w publicznym artykule/obrazie.

Proponowana polityka fail closed:

1. Źródła publikacyjne są oddzielone od oryginalnego vaulta. Nigdy nie skanujemy go w buildzie i nie włączamy eksportu całego frontmatteru.
2. Publikacja notatki wymaga jawnego `dg-publish: true` i dopuszczenia w przejrzanym rejestrze. String `"true"`, brak flagi, `false` lub rozbieżność są błędem walidacji. Rejestr potwierdza przegląd całej treści i załączników, a nie tylko metadanych.
3. Przed Eleventy walidator sprawdza wszystkie wejścia publikacyjne, referencje i manifest zasobów. Niedopuszczona notatka/załącznik zatrzymuje build przed renderowaniem. Nie polegamy wyłącznie na `permalink: false`, usunięciu z kolekcji lub filtrze szablonu. Ewentualny przyszły staging może fizycznie odseparować wejścia, ale nie jest konieczny do pierwszej wersji.
4. Publiczny DTO powstaje jako nowy obiekt z allowlisty. Zakazane surowe `data`, `...data`, `raw_frontmatter`, prywatne relacje i dowolne `metadata`. Znane pola prywatne powodują błąd, lecz ich brak nie zastępuje przeglądu ludzkiego.
5. Wspólna kolekcja/projekcja zasila home, katalogi, breadcrumbs, search, graf, backlinki, filetree, Bases, sitemap i feed. `hide` pozostaje filtrem odkrywalności publicznych treści, nie zgodą na publikację. Home/search/katalogi, strony frakcji, filtry i liczniki pomijają `hide`; ukryty publiczny wpis nadal musi przejść identyczny przegląd.
6. Załączniki są dopuszczane jawnie, łącznie z logo, faviconami, zasobami CSS i mapami. Usuwamy przyszłym patchem szeroką kopię `src/site/img` na rzecz kontrolowanego kopiowania. Niepodlinkowany obraz nie otrzymuje automatycznej zgody. Prywatne nazwy plików, alt, komentarze HTML, transkluzje i podpisy też wymagają przeglądu.
7. Link/transkluzja do niedopuszczonego wpisu zatrzymuje walidację bez kopiowania jego tytułu lub treści do publicznego błędu. Statyczne markery legacy są częścią publicznego HTML i również wymagają przeglądu.
8. Build tworzy czysty nowy artefakt; kontrola wynikowa sprawdza wszystkie pliki, a nie tylko indeks. Nie publikuje się częściowego wyniku po błędzie. Logi/raport publiczny nie zawierają treści odrzuconych notatek. Poprzednie artefakty i cache podlegają osobnemu usunięciu w przyszłej procedurze publikacji; nowy build nie cofa wcześniejszego ujawnienia.

Full-text obejmuje tylko zatwierdzony tekst artykułu, bez nawigacji, skryptów, stylów, komentarzy i ukrytych bloków. Parser HTML wybiera publiczny obszar artykułu; żadna heurystyka nie potrafi bezpiecznie rozpoznać sekretu fabularnego. Notatka mieszana DM/gracz musi zostać odrębnie przygotowana przez właściciela przed publikacją. Nie tworzymy automatycznie „publicznej wersji” prywatnej notatki.

Twardy warunek przed uruchomieniem nowej wyszukiwarki: przegląd treści, załączników i wszystkich kanałów wyjściowych, testy negatywne oraz czysty artefakt bez DM. To celowa zmiana dotychczasowego zachowania publikacyjnego wymagająca zatwierdzenia, zachowująca format DG i URL dopuszczonych wpisów.


### Stan wykonania M1A.2 (2026-10-22)

Przygotowano rejestry entries/assets/system/relations/decisions w src/wiki, inwentaryzację 31 notatek, 34 zasobów i 39 plików systemowych oraz adapter metadanych z kontrolą fingerprintów i jawnych zgód. Historyczna obserwacja o pustych rejestrach dotyczyła stanu na dzień sporządzenia tej sekcji; aktualny stan opisano w końcowym raporcie diffu. dg-publish=true i lokalny dist nie zastępują zgody DM. Lista rekordów i bezpieczne lokalne identyfikowanie plików są generowane wyłącznie w lokalnym katalogu review i nie są dołączone do kandydata. Nie przypisano automatycznie tytułów, kategorii, statusów lub relacji.

Produkcja jest celowo blokowana przed uruchomieniem starej .eleventy.js i przed prebuild/rimraf; nie ma jeszcze selektywnej bezpiecznej implementacji HTML, search, graph, sitemap, feed i kopiowania obrazów. Wypełnienie rejestru samo nie wyłącza tej blokady. Adapter publikuje tylko jawne metadane, bez body/fulltext i bez źródłowych ścieżek. Dzisiejsza kontrola to fail-closed i testy odmowy całego generatora, a nie dowód produkcyjnego bezpieczeństwa kanałów. Stary dist/cache i wcześniejsze wdrożenia pozostają poza tą kontrolą. Prototyp UI działa oddzielnie, bez zmian UX. Pełny zakres, ograniczenia i 13 testów bezpieczeństwa: PUBLICATION_READINESS.md.


### Proces przeglądu M1A.2B

Lokalny panel `publication:review` pokazuje rzeczywiste nazwy, grupy/foldery, zależności i diffy wyłącznie na 127.0.0.1:8082. Domyślny prywatny magazyn poza repo/OneDrive zachowuje dopisywaną historię decyzji i snapshoty. Zgoda na treść notatki/zasobu jest odrębna od technicznego przeglądu systemu. Pierwszy przegląd nie ma automatycznych zgód; później przeglądamy tylko zmienione pliki oraz faktycznie zmienione/nowe zależności. Zmiana obrazu wymaga zgody na obraz, bez automatycznego unieważniania niezmienionej notatki. Hash całego pliku nadal wiąże zgodę z konkretnymi bajtami; diff ułatwia świadome ponowienie decyzji.

Eksport z panelu tworzy lokalną propozycję, bez samoczynnego nadpisywania src/wiki i bez odblokowania buildu. Od M1A.2C osobny importer pozwala jawnie scalić ją po sprawdzeniu diffu i potwierdzeniu jego identyfikatora. Obserwacja publicznych URL-i jest osobnym faktem, nie akceptacją DM. Porównanie 2026-10-22 potwierdziło 31 URL-i i zgodność znormalizowanego tekstu lokalnego main, lecz nie certyfikuje źródeł ani kanałów. Instrukcja i minimalne blokady integracji: PUBLICATION_WORKFLOW.md; wyniki online: ONLINE_COMPARISON.md. Prototyp UI, jego typografia, nawigacja i komponenty encji bez zmian.

### Stan faktyczny M1A.2C — decyzje a aktywne rejestry

`publication:import` działa jako preview → apply z hashem planu; `publication:status` pokazuje aktywne zgody/zmienione źródła i uwagę dla zależności. Eksport v2 zawiera identyfikator repo, bazowe hashe rejestrów i wskazania zdarzeń DM. Import wymaga zgodności aktualnych bajtów, najnowszej decyzji i aktywnej rewizji zastępowanej podczas przeglądu. Stare/obce propozycje, duplikaty, zmiana ID/permalinku i nierozwiązane zależności są odrzucane. Import sprawdza pełny scalony model, dopuszczając pozostawienie niezatwierdzonych/odrzuconych wejść jako blokady całej przyszłej publikacji.

Scalanie dotyczy wskazanych rekordów, zachowuje dodatkowe zatwierdzone metadane i nie zmienia rejestru relacji. Odmowa przenosi poprzedni rekord do prywatnej historii importu i zapisuje aktywne denied; ponowne zatwierdzenie zachowuje metadane z archiwum. Nie ma automatycznego wycinania relacji do wycofanej encji — wymagają odrębnego rozstrzygnięcia. Zmiana załącznika nie unieważnia niezmienionej notatki, ale blokuje zależną publikację do czasu jego własnej zgody. Lokalny dziennik before/after i znaczniki przerwanej operacji blokują walidację do zakończenia lub jawnego odzyskania; nie jest to atomowa transakcja pięciu plików ani zabezpieczenie przed właścicielem systemu plików.

Aktywne rejestry rzeczywistych materiałów nie zostały zmienione. Testy syntetyczne potwierdzają przepływ zgody, ale produkcyjne kanały nadal są niedopuszczone. Kryteria tego etapu: brak zapisu na preview, potwierdzenie dokładnego diffu, zachowanie ID/URL/statusów/relacji, odrzucenie konfliktów i starych hashy, osobny przegląd zmienionych zależności oraz fail-closed po awarii zapisu. Wyniki i ograniczenia: PUBLICATION_READINESS.md i PROJECT_STATUS.md.

## 9. Punkt styku z Maps 2.0

Menu rezerwuje `/maps/`; frontend ma wspólny shell, breadcrumbs `Start → Mapy → Nazwa`, tokeny i kontrolowaną szeroką powierzchnię bez `99vw` powodującego overflow. Zwykły artykuł nie wymaga Leaflet/Auth. Początkowo katalog prowadzi do istniejących zatwierdzonych map, bez pozorowania działającego edytora gracza.

Przyszły viewer `/maps/view/?map=<id>` może pobierać tytuł dopiero po autoryzowanym odczycie. `map_id` nie nadaje dostępu. Publiczna wiki i uwierzytelnione dane drużyny pozostają oddzielne: wspólne znaczniki graczy nie trafiają do statycznego indeksu, feedu, SSR ani listy ostatnich materiałów. Ewentualne wyszukiwanie takich danych będzie osobnym mechanizmem respektującym uprawnienia.

Zachowujemy kierunek wcześniejszego projektu: oficjalne lore oddzielone od adnotacji graczy, synchronizacja bez reloadu, stany łączenia/błędu i lista punktów jako alternatywa mapy. Backend, RLS i Realtime pozostają zakresem M1B do zatwierdzenia, nie są wdrażane w M1A. Zgodnie z późniejszą decyzją istniejąca mapa Neverwinter jest obowiązkową częścią migracji M1A: adapter i lokalny viewer zachowują jej 11 punktów, obraz i współrzędne, bez przenoszenia ich do backendu Maps 2.0. Błąd przyszłej usługi nie blokuje czytania statycznej wiki. Faktyczny zakres i ograniczenia: [LEGACY_MAP_MIGRATION.md](LEGACY_MAP_MIGRATION.md).

Rozpoznany format HTML mapy jest dekodowany do kontrolowanego DTO, nie wykonywany jako HTML. Źródło/obraz i cele odnośników muszą mieć aktualne zgody. Domyślnie niezatwierdzony cel blokuje publikację; DM może osobno zatwierdzić politykę pominięcia takich linków (`legacy_map: {approved: true, link_policy: "omit_unresolved"}`), bez usuwania punktów lub przepisywania źródła. Lokalny podgląd nie wymaga tej polityki do pokazania zatwierdzonych punktów z nieaktywnymi linkami i nie stanowi certyfikacji publikacji. Renderer legacy, pełne kanały produkcji i Maps 2.0 pozostają osobnymi etapami.


### Zatwierdzony kierunek lokacja ↔ mapa (M1A.1)

Oficjalny publiczny znacznik może otwierać kanoniczny artykuł lokacji. Artykuł może zawierać „Pokaż na mapie”, kierujące przyszły viewer na konkretny znacznik. Jedna lokacja może być widoczna na wielu mapach. Wiązanie używa stabilnych ID, nigdy nazw ani folderów.

Proponowany minimalny kontrakt: `schema_version: 1`, rekordy `location_id`, `map_id`, `marker_id`, `approved: true`. location_id wskazuje dopuszczony publiczny wpis kind=location; map_id i marker_id są stabilnymi identyfikatorami Maps 2.0. Klucz unikalności to trójka ID; wiele rekordów dla jednej lokacji jest dozwolonych. URL artykułu rozwiązuje rejestr permalinków, a nie pole tekstowe znacznika. Docelowy link viewer: `/maps/view/?map=<map_id>&marker=<marker_id>`, z walidacją ID i sprawdzeniem, że marker należy do mapy. Viewer po uprawnionym odczycie centruje/otwiera wskazany marker; brak rekordu daje neutralny komunikat, bez zgadywania lokalizacji. Przy wielu mapach artykuł pokazuje wybór publicznych map.

Do publicznej projekcji trafiają wyłącznie zatwierdzone wiązania oficjalnych znaczników z opublikowaną publiczną mapą i ujawnioną publiczną lokacją. Publiczny artykuł sam nie nadaje dostępu do mapy/znacznika. Prywatne znaczniki DM, nieujawnione lokacje, ich ID, opisy i liczniki nie trafiają do HTML, demo, wyszukiwania ani linków „Pokaż na mapie”. Ochrona danych runtime pozostaje po stronie przyszłego backendu; ukrycie przycisku jej nie zastępuje.

Znacznik gracza nie wymaga artykułu wiki i ma opcjonalne powiązanie z lokacją, bez automatycznego tworzenia notatki. Wspólna edycja, autoryzacja, migracja punktów i backend są poza M1A.1. W prototypie nie ma aktywnych deep-linków sugerujących działający viewer.

## 10. Konkretne pliki i kolejność implementacji

Ścieżki względem repo; **poniższa tabela opisuje docelową integrację produkcyjną**. Odrębny prototyp M1A.1 ma już własny shell, fixture i build; jego faktyczne pliki/testy opisuje WIKI_UI_PROTOTYPE.md. Prototyp nie dowodzi wdrożenia P0–P6.

| Etap | Pliki | Wynik |
|---|---|---|
| P0 — decyzje i inwentaryzacja | `src/wiki/public-entries.json`, `src/wiki/public-assets.json`, `src/wiki/public-facets.json`, `src/wiki/public-relations.json` (nowe) | Przegląd publicznych wpisów, permalinków, kategorii, dat i zasobów. Bez edycji vaulta. |
| P1 — bramka publikacji | `scripts/validate-publication.js`, `src/helpers/wiki/publicationPolicy.js`, `publicMetadata.js` (nowe), `package.json` | Walidacja przed generowaniem; zatrzymanie przy niedopuszczonych wejściach. Testy canary przed UI. |
| P1 — domknięcie kanałów | `src/helpers/userSetup.js`, `src/helpers/wiki/catalogs.js` (nowy), `src/site/search-index.njk`, `graph.njk`, `sitemap.njk`, `feed.njk`, `src/helpers/linkUtils.js`, `filetreeUtils.js`, `src/site/notes/notes.11tydata.js`, `.eleventy.js` | Jedna polityka, projekcja Bases/grafu, poprawna data feedu, kontrolowane kopiowanie zasobów i jawne włączenie zasobów potrzebnych DG. Celowane zmiany core są tu konieczne. |
| P2 — konfiguracja i styl | `src/site/_data/wiki.js`, `campaign.js` (nowe), `src/site/styles/user/wiki.scss`, `src/site/styles/wiki/{_tokens,_layout,_components,_themes}.scss` (nowe), `custom-style.scss` | Tokeny, neutralna baza i motyw kampanii; custom-style tylko jako mały adapter, bez drugiej kopii tokenów. |
| P3 — shell i breadcrumbs | `src/helpers/userUtils.js`, `src/site/_includes/components/user/wiki/{shell,navigation,breadcrumbs}.njk`, `src/site/scripts/wiki/navigation.js` (nowe), layouty `index.njk`, `note.njk`, `src/site/404.njk` | Stały zwijany panel desktop, modalny drawer mobile, podmenu, aktywna kategoria, breadcrumbs, H1 i fallback DG; jeden globalny search. |
| P4 — home i katalogi | slot `components/user/index/beforeContent/wiki-home.njk`, `components/user/wiki/{category-cards,recent,catalog}.njk`, slot `user/notes/afterContent/wiki-catalog.njk` (nowe), `src/site/{dokumenty,przedmioty,kronika,maps}/index.njk` tylko dla wolnych URL | Home i katalogi z publicznych danych; istniejące Postacie/Lokacje wzbogacane przez slot po permalinku. Nie nadpisywać źródeł Markdown. |
| P4 — grupowanie i frakcje | `src/helpers/wiki/{facets,relations}.js`, `components/user/wiki/{catalog-controls,grouped-list,faction-relations}.njk`, slot `user/notes/afterContent/wiki-relations.njk`, `src/site/scripts/wiki/catalog.js` (nowe) | Walidacja i projekcja relacji po ID, grupowanie/filtry, listy relacji na istniejącej stronie rozpoznanej po kind; bez nowej kopii notatki i bez layoutu NPC. |
| P5 — wyszukiwarka | `components/{searchButton,searchContainer,searchScript}.njk`, `src/site/scripts/wiki/search.js` (nowy) | Bezpieczne i dostępne UI oparte na FlexSearch, polska normalizacja, filtry, błędy i jedna instancja. |
| P6 — odbiór | `tests/wiki/`, `tests/security/`, `tests/e2e/`, `package.json`, `package-lock.json` tylko jeśli potrzebne narzędzia, `docs/WIKI_UX_VALIDATION.md` (nowe) | Wykonane testy, screenshoty, lista regresji i wynik kontroli prywatności. |

Nie dodajemy nowego frameworka, CMS, backendu wiki ani kolejnego indeksu lore. Rozszerzenia rejestrujemy przez `userSetup`, zamiast przenosić całą `.eleventy.js`. Domknięcie bezpieczeństwa ma pierwszeństwo przed włączeniem rzeczywistych danych do nowego interfejsu. Zgodnie z poleceniem M1A.1 dopuszczony jest wcześniej odizolowany prototyp na wyłącznie demonstracyjnych danych, bez odczytu notatek i bez nowego rzeczywistego full-text. Po P6 użytkownik ocenia lokalny wynik; publikacja pozostaje osobną czynnością. Rollback wizualny przez flagę i zachowane źródła, bez cofania polityki bezpieczeństwa.

## 11. Kryteria akceptacji

- [ ] Jeden `/` i jeden H1 na stronę. Home ma widoczne szukanie, dokładnie sześć wymaganych kategorii i uczciwą listę ostatnio dodanych.
- [ ] Każdy dopuszczony istniejący wpis zachowuje permalink, treść, obrazy i możliwość znalezienia; stare wikilinki przechodzą regresję.
- [ ] Menu, breadcrumbs i szukanie są na notatkach, home, katalogach oraz 404; nowy shell nie dubluje navbar/filetree.
- [ ] Pełne katalogi, linki menu i czytanie działają bez JS; zaawansowane filtry mają jawny fallback do pełnej listy. Brak JS/CDN pokazuje uczciwe ograniczenie full-text, a błąd indeksu daje możliwość ponowienia.
- [ ] Tytuł, treść publiczna, zatwierdzone aliasy i polskie znaki dają poprawne wyniki; filtr kategorii nie ukrywa dopuszczonych wyników omyłkowo.
- [ ] Wszystkie kanały publikacji stosują tę samą zgodę. Niedopuszczona notatka/załącznik i nieznane pole rejestru blokują build. Żaden syntetyczny sekret nie trafia do artefaktu.
- [ ] Karty mają identyczne SHA-256, kolejność i proporcje; pełna rozdzielczość jest dostępna także na telefonie. Brak nowego renderera i OCR.
- [ ] Zmiana nazwy/logo/themeId/tokenów nie wymaga zmiany layoutów ani Markdownu; drugi zestaw tokenów przechodzi tę samą kontrolę czytelności.
- [ ] Bez poziomego scrolla całej strony przy 320 px; tabele i mapy mogą mieć własny kontrolowany obszar. Cele dotykowe co najmniej 44×44 px.
- [ ] Klawiatura obsługuje całość; focus widoczny i niezasłonięty. Kontrast tekstu minimum 4.5:1, dużego tekstu i istotnych elementów nietekstowych minimum 3:1. Zoom 200% i reflow 400% nie powodują utraty funkcji.
- [ ] Maps 2.0 ma punkt rozszerzenia, bez runtime danych graczy w publicznym indeksie i bez zależności czytania wiki od logowania.
- [ ] Panel desktop jest stały i zwijany, mobile używa drawera. Kolejność Start + sześć sekcji zachowana; brak poziomego menu kategorii i drzewa Obsidiana w panelu.
- [ ] Drawer i podmenu obsługują klawiaturę, focus, Escape, nieaktywne tło i zmianę breakpointu; search jest dostępny także przy zamkniętym/zwiniętym panelu.
- [ ] Jedna postać może należeć do wielu frakcji/lokacji/terminów przy jednym URL i jednej kategorii; grupowanie nie zawyża unikalnego licznika. URL i Wstecz odtwarzają filtry.
- [ ] Strony frakcji używają źródłowego opisu i tylko jawnych relacji; zwykły termin pozostaje filtrem bez strony. Prywatne wpisy i relacje nie ujawniają się także w licznikach i pustych grupach.
- [ ] Trzy kluczowe ekrany mają sprawdzone desktop/mobile i stany pustych danych; brak przypisania nie jest deklaracją braku afiliacji.
- [ ] Postać/lokacja poprawnie renderują brak portretu, statusu, ilustracji i powiązanych postaci. Statusy/zasoby wymagają jawnej zgody; lista lokacji nie oznacza obecności; widoki są czytelne przy 320 px i bez JS.
- [ ] Aktualizacja DG ma udokumentowane miejsca integracji i test fallbacku; flaga UI nie przywraca niebezpiecznej publikacji.

## 12. Plan testów i dowody odbioru

| Warstwa | Przypadki | Dowód |
|---|---|---|
| Jednostkowe | Polityka publikacji: true/false/brak/string; walidacja rejestru i lokalnych URL, kolizje `/`, duplikaty ID, klasyfikacja, daty i sortowanie; projekcja bez prywatnych pól; normalizacja polska | Raport Vitest na syntetycznych fixture, bez prawdziwych danych DM |
| Integracyjne builda | Publiczna notatka i załącznik; prywatna notatka, osierocony obraz, prywatna transkluzja, nieznane pole. Błąd przed generowaniem albo nieudany artefakt zabroniony do publikacji | Wynik komendy i manifest czystego artefaktu |
| Prywatność | Canary w tytule, treści, frontmatterze, nazwie pliku, HTML komentarzu i załączniku. Kontrola HTML/JSON/XML/CSS/JS, graph, search, feed, sitemap, Bases, filetree, previews i bezpośrednich URL | Zero canary w dopuszczonym artefakcie; negatywne fixture zatrzymują build; brak cytowania sekretów w raporcie |
| Search / XSS | Tekst tytułu, fragment środka artykułu, alias, „Łódź/lodz”, brak wyników, zapytanie z cudzysłowem/HTML, paste/mobile input, wolny fetch, HTTP 500, błędny JSON, brak CDN | Testy przeglądarkowe; payload pozostaje tekstem, brak wykonania kodu i niekontrolowanej nawigacji |
| Regresja treści | Wszystkie zatwierdzone URL, wikilinki, nagłówki, tabele, obrazy, przypisy, opcjonalny TOC/backlinki, Bases; istniejąca mapa i 11 punktów bez migracji | Raport linków; porównanie manifestu kart i kolejności obrazów; mapa sprawdzona wizualnie |
| Dostępność | Tab/Shift+Tab, Enter/Space, Escape, dialog focus/return, menu, skip link, aria-live, pojedynczy H1, długi tytuł i brak wyników | Automatyczna kontrola axe lub równoważna + ręczny test NVDA/Firefox i VoiceOver/Safari |
| Grupy i relacje | Jedna postać w wielu frakcjach/lokacjach, termin bez strony, OR/AND, brak przypisania, zerowe wyniki, unikalne liczniki, reload i Wstecz | Syntetyczne fixture i scenariusz katalog → frakcja → kanoniczny członek |
| Prywatność relacji | Dwie publiczne encje bez zatwierdzonej relacji, prywatny członek/frakcja, brak approved, błędny typ, duplikat i koniec hide; brak inferencji z folderu/wikilinku | Błędne wejścia blokują build; poprawny artefakt bez prywatnych ID/nazw/krawędzi, liczników i filtrów zdradzających grupę |
| Panel/drawer | Zwijanie, podmenu, scroll panelu, krótki viewport, Escape/backdrop, focus restore, search z drawera, obrót i 999/1000 px z otwartym panelem | Screenshoty trzech ekranów, ręczna klawiatura/czytnik; brak pozostawionego inert/scroll lock |
| Motywy / aktualizacja | Dwa testowe zestawy tokenów bez finalnej stylistyki, kaskada Style Settings, flaga off, porównanie punktów integracji DG | Screenshoty i kontrola kontrastu obu wariantów |

Macierz ekranów: desktop 1440×900 i 1280×800, tablet 1024×768, telefon 390×844 i 360×800, minimum 320 px; granice 767/768, 799/800, 999/1000 i 1399/1400 px. Chromium i Firefox desktop, rzeczywisty Safari iOS oraz Chrome Android przy końcowym odbiorze; emulacja nie zastępuje testu klawiatury ekranowej. Testować obrót, 200% tekstu, 400% zoom/reflow, długie polskie nazwy, menu i modal z otwartą klawiaturą ekranową.

Scenariusz grupowania: home → Postacie → Według frakcji → filtr lokacji → strona frakcji → członek → Wstecz do zachowanego katalogu. Powtórzyć na desktopie i mobile, bez JS przez pełną listę i linki, oraz ze stanami pustymi wszystkich trzech ekranów.

Scenariusz gracza: home → wyszukanie hasła z relacji → wynik → breadcrumbs do kategorii → karta przedmiotu w pełnej rozdzielczości → powrót → mapa. Powtórzyć dotykiem i samą klawiaturą, z wolnym połączeniem i bez JS. Cel lokalny na fixture do 500 wpisów: pierwsze wyniki do 300 ms od zakończenia debounce po załadowaniu indeksu, bez blokowania wpisywania; pomiar na wskazanym urządzeniu w raporcie, nie deklaracja gwarantowanej wydajności obecnego kodu.

Każdy raport zapisuje commit, środowisko, faktycznie wykonane komendy, datę, szerokości i screenshoty. P0–P6 są planem; w tym zadaniu nie wykonano tych testów.

## 13. Ryzyka i decyzje wymagające zatwierdzenia

| Ryzyko | Odpowiedź projektu |
|---|---|
| Sekret w pozornie publicznym artykule lub obrazie | Przegląd właściciela i allowlista całych materiałów; automat nie ocenia spoilerów |
| Aktualizacja DG nadpisuje integrację | Minimalne patche core, wykaz plików, regresja po aktualizacji |
| Motyw pobierany przy buildzie i Style Settings zmieniają wygląd | Neutralne tokeny i izolacja; późniejsze przypięcie wersji motywu do rozważenia, rzeczywisty test kaskady |
| Brak eksportu nowych pól | Rejestr poza Markdownem, bez zmiany `dgPassFrontmatter` |
| Nieznana historia publikacji | Jawne daty lub pominięcie wpisu w „Ostatnio dodane”; bez dat mtime |
| PNG zawiera tekst niewidoczny dla search | Zatwierdzone tytuły/aliasy, bez obietnicy OCR |
| Starszy artefakt nadal udostępnia usunięte materiały | Osobna kontrola hostingu/cache przy późniejszej publikacji; brak obietnicy cofnięcia ujawnienia |
| Ręczny rejestr się rozchodzi z eksportem DG | Walidacja przed każdym buildem, brak automatycznej zgody dla nowych wpisów |

Zatwierdzony kierunek UX: stały zwijany panel desktop, drawer mobile, globalne szukanie, Start + sześć wskazanych sekcji, opcjonalne podmenu bez drzewa Obsidiana, wielowymiarowe grupowanie przy jednej kategorii/URL, strony frakcji bez dodatkowej sekcji głównej oraz wyłącznie jawne publiczne relacje. Nie wymaga ponownej akceptacji. Polityka bezpieczeństwa sekcji 8 pozostaje zachowana.

Nadal otwarte szczegóły:

1. Docelowe URL nowych katalogów i umiejscowienie wejścia Organizacje; prototyp używa podmenu Postaci bez uznawania organizacji za dokument. Istniejące permalinki pozostają zachowane.
2. Schemat public-facets/public-relations, słownik wymiarów i typów oraz konkretne jawne przypisania dla pierwszego odbioru.
3. OR w wymiarze / AND między wymiarami, pomijanie pustych grup i parametry URL; sposób prezentacji wielokrotnego wystąpienia jednej postaci w grupach.
4. Breakpoint 1000 px, zakres zwiniętego panelu, zapamiętywanie zwinięcia i modalne szczegóły drawera. Finalna stylistyka i rozmiary są poza obecną aktualizacją.
5. Potwierdzone published_at dla Ostatnio dodane, pomijanie wpisów bez daty oraz zachowanie starego Markdownu home poniżej nowych sekcji.
6. Techniczna realizacja zachowanej polityki publikacji przez rejestry, manifest i małe zmiany core DG, z kontrolą relacji we wszystkich kanałach wyjściowych.
7. Backend Maps 2.0 pozostaje M1B; finalny motyw i warianty jasny/ciemny wymagają osobnego odbioru.

Docelowa integracja produkcyjna pozostaje niewdrożona. Stan faktycznej odizolowanej implementacji UI i jej testów zapisano w WIKI_UI_PROTOTYPE.md i PROJECT_STATUS.md. Zachowuje kompatybilność z Digital Garden, Markdownem i istniejącymi permalinkami. Nie daje zgody na deployment, commit, push ani zmianę oryginalnego vaulta.
