# Dark Archive — lokalny motyw Wiki Layout 2.0

Implementacja: 2026-10-23. Podgląd: **http://127.0.0.1:8083/**. Gałąź: `feat/dark-archive-theme`, worktree: `.worktrees/dark-archive-theme`. Bez commita, push i deploymentu.

## Baza i izolacja

Punktem odniesienia był zaakceptowany prototyp Wiki Layout 2.0. Motyw rozwijano w osobnym worktree i połączono w prywatnym kandydacie opartym na `e65fcc0a`. Historyczny baseline i skrypt integralności zależny od dawnego układu plików nie są częścią kandydata ani bieżącą kontrolą akceptacyjną. Integralność treści sprawdzają aktywne rejestry publikacji i aktualne testy adaptera.

Przy pierwszym checkoutcie Git zmienił zakończenia linii notatek, a jeden ignorowany wygenerowany arkusz nie był dostępny w nowym worktree. Walidator prawidłowo odmówił pierwszego buildu z powodu hashy trzech zatwierdzonych notatek. Wyrównano kopie bajt w bajt z oryginalnym workspace, bez edycji treści, aktualizacji zgód lub zmiany walidatora. Cztery kopie Markdown mogą przez to wyglądać w Git na zmodyfikowane względem starego commita; ich bajty są identyczne z zaakceptowanym workspace. Kolejny lokalny build i testy przeszły.

Końcowa kontrola potwierdza identyczność **124 plików chronionych** (źródła, rejestry, helpery publikacji i integracja danych) oraz **210 plików oryginalnego workspace** z manifestem. Główny katalog nie został przełączony na nowy motyw. W jego statusie może być widoczny nowy katalog `.worktrees/`, ponieważ celowo nie zmieniano oryginalnego `.gitignore`. Nie wykonywano zablokowanego produkcyjnego buildu.

## Warstwy prezentacji

1. Dotychczasowe komponenty, gridy, breakpointy i skrypty zachowują działanie.
2. `--lk-*` pozostają semantycznym interfejsem stylów.
3. `campaign-theme.json` wybiera `themeId` oraz opcjonalne dekoracje. `theme.cjs` wybiera zarejestrowany zestaw i waliduje wartości przed utworzeniem deklaracji CSS.
4. `themes/dark-archive.cjs` zawiera paletę, a `_dark-archive.scss` wyłącznie reguły prezentacyjne ograniczone do `html[data-theme="dark-archive"]`.

Globalne dane `appearance` dotyczą tylko prezentacji. Nie zmieniono `wiki-preview.config.cjs`, parserów, modeli relacji, klientów wyszukiwania, źródłowego Markdown ani decyzji DM. Nazwy świata i smoków nie są zaszyte w komponentach. Dodanie innego motywu wymaga rejestracji zestawu tokenów i jego stylów; nie wymaga przepisywania szablonów stron. Systemowy font tekstu i Palatino w nagłówkach działają bez pobierania zewnętrznych fontów.

## Paleta i tokeny

| Token `--lk-…` | Wartość | Zastosowanie |
|---|---|---|
| `bg` | `#141618` | tło i spokojna powierzchnia artykułu |
| `sidebar` | `#101214` | panel boczny, drawer i topbar |
| `surface` | `#222528` | karty, filtry, dialog i panele |
| `card`, `soft` | `#2B2F32` | powierzchnie podniesione, hover, statusy i chips |
| `text` | `#E8E8E4` | tekst główny |
| `muted` | `#B9B1A4` | opisy, etykiety i tekst pomocniczy |
| `border` | `#5E523E` | dekoracyjne linie i podziały |
| `metal` (legacy alias `steel`) | `#B69A66` | ikony i ornamenty w przygaszonym złocie |
| `accent` / `link` | `#C5A66C` / `#D0B77F` | ciepłe złoto dla tekstu interaktywnego |
| `focus` | `#E3C995` | obrys focusu i hover przycisku głównego |
| `control-border` | `#A58E65` | granice pól i przycisków o wyższym kontraście |
| `on-accent` | `#141618` | tekst na złotym przycisku |
| `dragon-red` | `#A13D42` | oszczędny dekoracyjny detal aktywnej nawigacji |
| `dragon-blue` | `#367CA3` | bazowy akcent dekoracyjny, nie kolor drobnego tekstu |
| `conflict` | `#69436B` | opcjonalny fioletowy detal/zaznaczenie w treści |
| `selection` | `#574932` | tło zaznaczonego tekstu o właściwym kontraście |
| `font-body` | `system-ui, sans-serif` | czytanie i kontrolki |
| `font-heading` | `Palatino Linotype, Book Antiqua, Palatino, serif` | nagłówki i znak archiwum |

Nie zmieniono tokenów geometrii panelu i szerokości treści. Odcienie czerwieni i ciemnego błękitu służą dekoracji; linki i istotne kontrolki mają jaśniejsze warianty. Zgodnie z późniejszą korektą użytkownika szare detale zastąpiono przygaszonym złotem; czerwone i niebieskie akcenty pozostają miejscowe. Subtelne linie kartograficzne i metaliczne pasma są generowane w CSS, bez wielkiej bitmapy pod tekstem. `decorations.texture: "none"` całkowicie je wyłącza.

## Banner kampanii

Referencje odczytano z `lorekeeper/examples/mock1.jfif`, `mock2.jfif` i `thememock.png`. Traktowano je jako kierunek artystyczny, a nie gotowe tło lub źródło treści.

Po wskazaniu przez użytkownika odnaleziono właściwy plik `lorekeeper/examples/DragonBanner.png`. Skopiowano go bez modyfikacji do `src/wiki-ui/themes/assets/dragon-banner.png`. Oryginalne proporcje, kolory i przezroczystość pozostają zachowane; nie wycinano makiety ani nie generowano zastępstwa. Do tego komponentu nie brakuje już zasobu graficznego.

`decorations.banner` wskazuje `/assets/branding/dragon-banner.png`. Na home banner jest widoczny po prawej, obok tytułu i wyszukiwania (do 300 px szerokości). Na podstronach jest niewielkim znakiem wodnym w prawym górnym rogu. Hero ukrywa obraz przy szerokości do 1100 px, a mniejszy wariant podstron przy szerokości do 600 px. Komponent ma `aria-hidden`, pusty alt, wyłączone zdarzenia myszy i ładowanie lazy. Po ustawieniu `banner: null` nadal nie powstaje obraz ani puste miejsce; sprawdzono stabilność geometrii bez niego.

W konfiguracji lokalnego podglądu dodano dokładnie jedną jawną rejestrację passthrough dla tego pliku UI. Kontrola integralności sprawdza, że po odjęciu tej linii reszta konfiguracji jest identyczna z oryginałem; integracja danych pozostała bez zmian. Zasób nie trafia do rejestrów zgód treści ani do indeksu wyszukiwarki. Hash PNG w źródle i wynikowym podglądzie jest identyczny. Nie zmieniano istniejących ilustracji i kart.

## Materiały wizualne

Historyczne zrzuty desktop/mobile i wyniki kontrastu pozostają lokalnymi artefaktami oceny; nie są dołączone do kandydata, aby nie publikować zrzutów rzeczywistej kampanii. Ta sekcja nie zawiera odnośników do nieobecnych plików. NPC i lokacja w dawnych zrzutach używały syntetycznych danych demo.

## Faktycznie wykonane sprawdzenia

| Sprawdzenie | Wynik |
|---|---|
| Lokalny `npm run wiki:build` | PASS, 46 wyjść; nie uruchamia produkcyjnego buildu |
| Istniejące `npm run wiki:test` | **13/13 PASS** |
| Tokeny kolorystyczne | **26 par PASS** według wzoru kontrastu WCAG |
| Kontrola motywu w Edge | **24 strony/viewporty PASS**, 1440/390/320 px |
| Istniejący test UI demo | PASS: drawer, focus, Escape, filtry, reset/reload, search, no-JS |
| Istniejący test stron encji | PASS: warianty portretu/statusu/ilustracji, linki, no-JS, 320 px |
| Istniejący test wyszukiwania | PASS: trzy szerokości, wyniki, retry, bezpieczny tekst/URL, rozdzielenie zakresów |
| Istniejący test zatwierdzonych stron | **78 kontroli PASS**, katalogi/artykuły, linki, obrazy, no-JS |
| Historyczna kontrola integralności Dark Archive | Pominięta; jej baseline zakłada dawny układ i nie jest bieżącym testem kandydata |

Historyczne wyniki pomiaru kontrastu (nie są aktualną regresją kandydata): Najniższe kontrasty na sprawdzanych powierzchniach: tekst główny **10,99:1**, tekst pomocniczy **6,36:1**, link **6,92:1**, stalowy tekst **5,02:1**, granice kontrolek **4,28:1**, focus **8,39:1**. Pierwotny dobór zaznaczenia tekstu dawał 3,74:1; przed odbiorem zastąpiono go osobnym ciemniejszym tokenem i powtórzono kontrolę. Pełny historyczny JSON nie jest dołączony.

Kontrola w przeglądarce obejmuje tła, obrazy bez filtrów i przepełnienia, długi artykuł (co najmniej 16 px, interlinia 1,5+, szerokość do 740 px), widoczność focusu, drawer/search i poprawny brak bannera. Przeprowadzono też test bez tekstur. JSON z tych historycznych przebiegów nie jest dołączony. Niezależny przegląd UI wskazał wyrównanie liczników kart na mobile; poprawiono je i odświeżono screenshoty/test motywu.

Nie jest to pełny certyfikat WCAG. Nie testowano fizycznych telefonów, NVDA/VoiceOver, innych silników ani Node 22; środowisko to Node 24.22.0 i headless Edge. Nie uruchamiano zestawu bezpieczeństwa zawierającego próby zablokowanego generatora — kod tego obszaru pozostaje identyczny ze snapshotem.

## Zakres historycznego motywu

Opisane wcześniej zmiany obejmują tokeny i style Dark Archive, banner, ikony oraz komponenty prezentacyjne. Ta lista jest zapisem historycznym, a nie patchsetem do odtworzenia. Użyj manifestu/diffu prywatnego kandydata jako źródła rzeczywistego zakresu zmian; nie kopiuj całego worktree na inną gałąź.

## Powtórzenie kontroli w kandydacie

W PowerShell, z katalogu finalnego kandydata, uruchom `npm run wiki:build`, `npm run wiki:test`, `npm run publication:test` i `node --test tests/wiki/organization.test.cjs`. Dla przeglądarki uruchom własny lokalny preview kandydata: `$env:WIKI_THEME_PORT="8084"; node scripts/dark-archive-preview.cjs`. Do regresji użyj `node scripts/integration-browser-check.cjs <nazwa-skryptu>` z dozwoloną nazwą scenariusza. Wymagane są `WIKI_PLAYWRIGHT_MODULE` i `WIKI_BROWSER_EXECUTABLE`. Historyczny skrypt integralności nie jest testem akceptacyjnym; jego baseline i dawne zrzuty pominięto. Produkcyjny build pozostaje zablokowany.

Korekta fantasy po ocenie użytkownika: dodano rycinowy znak kompasu w hero/sidebarze, ozdobne linie pod tytułami, stalowe narożniki kart i tarczowe oprawy ikon. Nagłówki i tytuły kart korzystają z Palatino. Są to małe dekoracje wektorowe zapisane w CSS, bez nowej bitmapy lub zamiennika smoczego sztandaru. Zachowano neutralną paletę i czytelny tekst artykułów. Powtórzono build, 26 par kontrastu, 24 kontrole motywu i dotychczasową regresję interakcji demo — PASS. Wszystkie screenshoty motywu odświeżono.

Kolejna korekta na prośbę użytkownika: złoto zamiast szarych akcentów. Token metal=#B69A66, accent=#C5A66C, link=#D0B77F. Lokalne czerwone/niebieskie detale występują w znaku archiwum, nad hero, na krawędziach wyszukiwania i w aktywnej nawigacji; linki relacji mają czytelny błękit. Dodano warianty tekstowe dragon-red-ink=#E5938F i dragon-blue-ink=#83B9D5. Grafitowe powierzchnie bez zmian. Powtórzono build, 34 pary kontrastu (minimum tekstu 5,02:1), 24 kontrole motywu i integralność — PASS. Wszystkie screenshoty odświeżono. Ta korekta zastępuje wcześniejsze ograniczenie złota w pierwotnej specyfikacji zgodnie z najnowszą instrukcją użytkownika.

Podłączono wskazany DragonBanner.png z examples. Hero: oryginalny banner obok treści na desktopie; podstrony: mały znak wodny; mobile: ukryty. Dodano tylko jawne kopiowanie tego pojedynczego zasobu UI, bez zmian integracji danych i rejestrów. Hash źródła i kopii w buildzie zgodny. Lokalny build, wiki:test13/13, kontrast34 i kontrola motywu24 PASS, screenshoty odświeżono; fallback bez bannera zachowuje położenie wyszukiwania. Integralność123 chronione + config wyłącznie jedna rejestracja UI, oryginalne210 plików bez zmian. Wcześniejsze informacje o brakującym zasobie są historyczne.

Po podłączeniu bannera dotychczasowa regresja encji również PASS; wrapper oddziela dekorację od ilustracji treści, aby nie próbować przewijać do ukrytego na mobile bannera.
