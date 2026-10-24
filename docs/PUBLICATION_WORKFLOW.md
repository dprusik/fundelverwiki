# M1A.2B / M1A.2C — lokalny przegląd i kontrolowany import

Aktualizacja 2026-10-23: [zatwierdzone artykuły w lokalnym prototypie](LOCAL_APPROVED_ARTICLES.md). Zaimportowano poprawny podzbiór istniejących decyzji: aktywne rejestry mają 17 notatek i 17 załączników, 70 wejść pozostaje pending. Zapisanej lokalnej zgody na pominięty wpis nie trzeba powtarzać; nierozwiązany odnośnik wymaga wyjaśnienia. Dalszy opis wcześniejszych iteracji jest historyczny. Produkcyjna blokada pozostaje aktywna; bez commita/push/deploymentu.

## M1A.2C — świadome scalanie z aktywnymi rejestrami

Mapa ma teraz osobny lokalny podgląd dostępny z notatki. Wymaga zapisanej aktualnej zgody na notatkę i obraz. Zachowuje punkty, a brakujące cele pokazuje bez aktywnych linków. Pod mapą można jawnie zatwierdzić politykę zachowania punktów bez niedostępnych odnośników; zapis dopisuje wersję decyzji i tworzy nową propozycję, bez edycji Markdownu lub zastosowania rejestrów. Starsza propozycja tej notatki stanie się nieaktualna. Nie trzeba ponawiać innych zgód. Zakres i ograniczenia: [LEGACY_MAP_MIGRATION.md](LEGACY_MAP_MIGRATION.md).

Po przeglądzie w panelu kliknij **Utwórz lokalną propozycję**. Skopiuj jej lokalną ścieżkę. W terminalu repozytorium:

```powershell
npm run publication:import -- preview "C:\lokalny-magazyn\exports\UUID.json"
npm run publication:import -- apply "C:\lokalny-magazyn\exports\UUID.json" --confirm HASH_Z_WIERSZA_CONFIRM
npm run publication:status
npm run publication:status -- --needs-review
npm run publication:status -- --json
npm run publication:validate
```

`preview` niczego nie zapisuje. Pokazuje dodane zgody/odmowy, zakres content/technical, pełny diff zmienianych rekordów (hash, ID, permalink, metadane) oraz zależności z hashami podczas przeglądu i obecnie. Ten terminal jest **lokalnym narzędziem DM**: nie kopiuj diffu do publicznych raportów. Po obejrzeniu użyj identyfikatora `CONFIRM`; apply oblicza plan jeszcze raz i odrzuca stare potwierdzenie. Zmiana dowolnego rejestru wymaga nowego eksportu; zmiana źródeł lub historii decyzji wymaga ponownego podglądu, a zmieniony zatwierdzany materiał — własnego przeglądu. Import niczego nie publikuje.

Eksport v2 wiąże propozycję z repozytorium, bazowymi hashami pięciu rejestrów i konkretnymi zdarzeniami w tym samym lokalnym magazynie. Import wymaga zgodności z najnowszym zdarzeniem danego pliku, bieżącym SHA-256 i aktywną rewizją zastępowaną podczas przeglądu. Nie przyjmuje propozycji z innego komputera bez odpowiedniej lokalnej historii. Stare eksporty v1 należy zachować jako historię; nowy eksport jest wymagany. Jeśli sama decyzja pochodzi sprzed M1A.2C i nie zawiera `active_revision`, ponownie przejrzyj i jawnie potwierdź jej zastąpienie w panelu. Nie migrujemy takich zgód automatycznie.

Scalanie zmienia wyłącznie wskazane rekordy. Formularz może zmienić podstawowe publiczne pola: title/category/kind dla wpisu i alt dla zasobu. ID i istniejący permalink muszą pozostać zgodne; adres zasobu też weryfikuje walidator. Nieobecne w formularzu statusy, aliasy, streszczenia, daty i referencje obrazów pozostają zachowane. `public-relations.json` nie jest edytowany ani wywnioskowany z linków. Zmiany tych dodatkowych pól/relacji wymagają osobnego jawnego przeglądu; importer ich nie zatwierdza.

Odmowa usuwa aktywną zgodę i zapisuje `denied`, zachowując prywatny snapshot poprzednich rejestrów i historię zdarzeń. Późniejsze zatwierdzenie odtwarza dodatkowe pola poprzedniej zgody z lokalnego archiwum oraz aktualizuje jawnie przejrzane pola. Archiwum importów jest częścią magazynu DM poza repo/OneDrive — zachowaj je razem z historią i snapshotami. Powtórny eksport już zastosowanego zdarzenia jest no-op; nie odtwarza dawnych pól formularza ponad późniejszymi metadanymi.

Cały scalony model musi przejść walidację, z wyjątkiem nadal pending/denied wejść nieobjętych zgodą. **Nie oznacza to pozytywnej walidacji publikacji całego repozytorium.** Każda zależność aktywnej zgody musi mieć własną aktualną zgodę; brak, niejednoznaczność, zewnętrzny nieobsługiwany link lub niedopuszczony zasób blokują import. Zmiana obrazu wymaga ponownego przeglądu obrazu, bez cofania zgody na niezmienione bajty rodzica. Odmowa nie może pozostawić aktywnej zgody zależnej od odrzuconego pliku: w tej samej propozycji jawnie odrzuć rodzica albo osobno popraw jego źródło i przejrzyj zmianę. Jeżeli odmowa pozostawiłaby zatwierdzoną relację bez końca, import też zostaje odrzucony; relacja wymaga osobnego rozstrzygnięcia, bez automatycznego usuwania krawędzi.

`publication:status` odczytuje **aktywne** rejestry (a nie same lokalne oczekujące decyzje), pokazuje pending/approved/changed/denied i zależności wymagające uwagi. `approved` oznacza zapis zgody zgodny z bieżącym hashem; pełne błędy metadanych/modelu nadal sprawdza walidator, a podsumowanie statusu podaje liczbę jego problemów. `--needs-review` zawęża listę, `--json` udostępnia bezpieczne ID i kody. Brak nazw i treści w tym wyjściu. W rzeczywistym repo po tej implementacji nadal jest **104 pending, 0 nowych zgód i odmów**.

### Przerwany zapis i odzyskiwanie

Importer stosuje wyłączną blokadę, prywatny dziennik before/after i podmianę każdego pliku przez rename. Znaczniki `.publication-import.pending` / `.publication-import.lock` blokują walidator do czasu ukończenia lub odzyskania. Nie jest to transakcja pięciu plików systemu plików ani gwarancja odporności na utratę zasilania. Nie uruchamiaj równolegle ręcznych edycji rejestrów.

```powershell
npm run publication:import -- recover
npm run publication:import -- recover --confirm HASH_ODZYSKIWANIA
```

Pierwsza komenda wyświetla lokalny diff przywrócenia, druga po ponownej kontroli go stosuje. Przy częściowym imporcie przywracane są bajty sprzed importu; osierocona blokada przed pierwszym zapisem lub po zakończonym commicie jest tylko zwalniana. Historia nie jest usuwana. Żywy proces właściciela blokady oraz jakakolwiek obca edycja rejestrów zatrzymują odzyskiwanie. Brak lub uszkodzenie dziennika/znaczników wymaga ręcznej diagnozy — nie usuwaj ich dla obejścia bramki. Nie zabezpiecza to przed osobą mającą możliwość dowolnego zmieniania lokalnego systemu plików.

Testy importu używają wyłącznie syntetycznych źródeł i świeżych katalogów tymczasowych. Produkcyjny renderer, pełnotekstowy search, graph, sitemap/feed i kopiowanie zasobów nadal wymagają osobnego etapu. Obecne zgody nie wyłączają blokady `.eleventy.js` ani `prebuild`.

## Uruchomienie narzędzia DM

```powershell
cd C:\Users\dawid\OneDrive\Dokumenty\git\fundelverwiki
npm run publication:review
```

Otwórz **http://127.0.0.1:8082**. Zatrzymanie: Ctrl+C. Nie używaj `localhost`, publicznego tunelu ani reverse proxy: narzędzie akceptuje wyłącznie własny Host/Origin 127.0.0.1. Nie jest częścią publicznej wiki ani serwera demo na 8081.

Panel pokazuje lokalne nazwy i ścieżki 31 notatek, 34 zasobów i 39 plików systemowych. Dostępne są filtry typu, folderu, stanu i wyszukiwanie po nazwie/ścieżce/ID. Otwiera tekst notatki/kodu, obrazy rastrowe, zależności, historię i diff. SVG, HTML i JS są wyświetlane jako tekst, bez wykonywania; inne binaria można pobrać do osobnego lokalnego przeglądu. Tekst powyżej 1 MiB nie może być zatwierdzony po skróconym podglądzie. Dla obrazu dostępny jest pełny rozmiar, a po zmianie także poprzedni snapshot.

Nie udostępniaj zrzutów panelu ani jego danych poza swoim komputerem: mogą zawierać prywatne nazwy, opisy i diffy. Lokalny dziennik i snapshoty są domyślnie zapisywane **poza repozytorium i katalogiem OneDrive**: `%LOCALAPPDATA%/Lorekeeper/publication-review/<ID-repo>/` na Windows (na innych systemach pod lokalnym katalogiem stanu użytkownika). Panel pokazuje dokładną ścieżkę. Nie są szyfrowane; dostęp do nich ma użytkownik systemu. Nie kopiuj magazynu do repo ani do katalogu synchronizowanego. Serwer nie wysyła danych do usług zewnętrznych. `.publication-review/` w repo pozostaje ignorowanym miejscem starszego porównania publicznych URL-i; nie przenoszono i nie usuwano jego plików.

## Pierwszy przegląd

### Szybki przegląd notatki i załączników

W podglądzie notatki dostępny jest **Przegląd notatki z załącznikami**: obrazy z powiększeniem, SVG/kod jako tekst, pola publicznych opisów i checkbox zakresu przy każdym pliku. Po obejrzeniu materiałów zaznacz wspólne potwierdzenie i użyj **Zatwierdź notatkę i wybrane załączniki**. Backend zapisze osobne decyzje i snapshoty z dotychczasową kontrolą hashy, rewizji i tokenów. Zatwierdzenie nie następuje przy samym wczytaniu podglądów.

Jeśli notatki mają już zapisane aktualne zgody, użyj przycisku **Przejrzyj załączniki zatwierdzonych notatek razem** nad listą. Zbiera wyłącznie załączniki z aktualnie zatwierdzonych notatek; każdy wspólny plik pojawia się raz. Aktualne zgody na załączniki są pomijane. Zgody na same notatki nie są ponawiane. Po zapisie nadal trzeba utworzyć nową propozycję i sprawdzić import.

Przy każdym materiale możesz wyłączyć go ze wspólnej decyzji. Wcześniej odrzucone pliki domyślnie nie są zaznaczone; zmienione/odrzucone pliki wymagają dodatkowego potwierdzenia zastąpienia decyzji. Obrazy muszą być załadowane; uszkodzone obrazy, niepełne podglądy i nieobsługiwane binaria wymagają osobnego przeglądu. Dla zmienionego obrazu widać poprzedni i obecny snapshot, dla tekstu diff. Wyłączenie załącznika z decyzji nie usuwa odwołania ze źródła — może nadal blokować import. Zależne notatki i pliki systemowe nie są automatycznie dodawane do tego batcha.

Opisy alt można wpisać przy obrazach. Opcjonalny wspólny opis trafia po kliknięciu **Wstaw opis do pustych pól wybranych załączników** tylko do zaznaczonych pustych pól; musi być świadomie podany przez DM. Nie zgadujemy publicznych opisów z prywatnych nazw. Przed zapisem można poprawić każdy opis osobno. Jest to edycja lokalnego formularza, bez zmiany źródłowych zasobów lub zgody.

Dotychczasowy indywidualny tryb nadal działa:

1. Wybierz Notatki, Zasoby lub Pliki systemowe, ewentualnie folder. Otwórz każdy plik z grupy. Zaznaczenie całej grupy nie oznacza zatwierdzenia.
2. Dla notatki obejrzyj cały materiał oraz zależności: obrazy, notatki, linki. Kliknięcie zależności otwiera jej osobny przegląd. Odwołania niejednoznaczne/zewnętrzne są jawnie pokazane, nie są automatycznie dopuszczane.
3. Sprawdź publiczny tytuł, stabilne ID, wybierz sekcję i rodzaj encji. Rodzaj/sekcja nie są zgadywane z folderu. Zasób wymaga publicznego alt. Sugerowana nazwa w formularzu nie jest zgodą na jej publikację.
4. Zaznacz przejrzane pliki, potwierdź zakres i użyj Zatwierdź/Odrzuć. Każdy element grupy musi mieć otwarty podgląd odpowiadający nadal bieżącym bajtom. Nie zatwierdzamy automatycznie zależności.
5. **Notatki i zasoby:** zgoda na publikację treści dla graczy. **Pliki systemowe:** techniczny przegląd kodu; nie jest zgodą na dowolne treści fabularne generowane przez ten kod. Panel wyraźnie oznacza oba zakresy.
6. Jeżeli istnieje poprzednia decyzja, zaznacz dodatkowe świadome zastąpienie jej nową wersją. Stara decyzja pozostaje w historii. Odmowa nie usuwa źródła ani wcześniejszej zgody.

Decyzje są zapisywane w nowych plikach `<magazyn lokalny>/events/<uuid>.json`, z hashem i snapshotem. Nie ma automatycznego zatwierdzania po otwarciu, po wykryciu dg-publish, po porównaniu z online ani po zaznaczeniu folderu. W trakcie implementacji nie zapisano żadnej decyzji dotyczącej rzeczywistych plików.

## Regularna aktualizacja — przegląd tylko faktycznej zmiany

Proponowany proces zachowuje prostą kontrolę SHA-256 całego pliku. Nie próbujemy zgadywać, czy zmiana jest „tylko kosmetyczna” i czy może ujawnić sekret.

- Otwórz filtr **Zmienione od decyzji**. Niezmienione pliki zachowują decyzje; nie zaczynasz od 104 pozycji.
- Dla zmienionej notatki/kodu zobacz diff poprzedniego snapshotu i bieżącego tekstu. Nowe materiały wymagają pierwszego pełnego przeglądu. Duży diff ma konserwatywny widok pełnego usunięcia/dodania, bez ukrywania treści.
- Zmieniony obraz przeglądasz osobno; można porównać poprzednią i obecną wersję. Zmiana obrazu nie cofa zgody na niezmienione bajty notatki, która do niego linkuje. Zależność jest oznaczona do sprawdzenia i nadal blokowałaby publikację do czasu własnej zgody.
- Dodana/usunięta zależność jest pokazywana przy zmienionej notatce. Zmiana dziecka nie powoduje automatycznej fali ponownych zgód na wszystkich rodzicach. Brak zależności lub niejednoznaczne rozwiązanie wymaga osobnej decyzji/naprawy przed przyszłą publikacją.
- Ponownie zatwierdzasz/odrzucasz wyłącznie przejrzane zmienione pliki. To dopisuje nową decyzję i zachowuje poprzednie. Backend odrzuca zgodę na stare bajty lub starą rewizję decyzji, jeśli inny odczyt/zmiana zdążył je zastąpić.

Panel odczytuje wcześniejsze aktywne rejestry: ich zgody/odmowy są widoczne. Zapis do nich wymaga osobnego importu opisanego w M1A.2C poniżej. Gdy nie ma historycznego snapshotu, narzędzie uczciwie wymaga pełnego przeglądu zamiast pozorowanego diffu. Istniejące ID i kanoniczne URL nie mogą zostać po cichu zmienione podczas ponownego zatwierdzania.

## Eksport bez nadpisywania decyzji

Przycisk **Utwórz lokalną propozycję** zapisuje nowy UUID w `<magazyn lokalny>/exports/`. Obejmuje bieżące decyzje lokalne; pomija zgody/odmowy o starych hashach. Wcześniejsze pliki eksportu pozostają zachowane. Nie zmienia `src/wiki/*.json`, nie usuwa odmów, nie publikuje danych i nie odblokowuje buildu.

To pakiet zmian do jawnego scalenia przez importer M1A.2C, a nie gotowy manifest produkcyjny. Zawiera zakres, wersję źródła, metadane z formularza, zależności, identyfikator decyzji i wskazanie poprzedniej decyzji. Zapisana decyzja z aktywnego rejestru jest archiwizowana przy jej świadomym zastąpieniu. Importer zachowuje dodatkowe metadane, relacje i statusy; nie zastępuje całego rejestru samym eksportem formularza. Lokalny dziennik sam nie jest wejściem walidatora: dopiero potwierdzony import aktualizuje jego aktywne rejestry.

## Porównanie z opublikowaną wiki

```powershell
npm run publication:compare
```

Odczyt dotyczy wyłącznie `https://fundelverwiki.vercel.app` oraz ujawnionych tam URL-i. Nie wysyła na hosting lokalnych niepotwierdzonych nazw plików. W tym środowisku wykonanie wymagało dostępu poza ograniczeniem sieciowym; po uzyskaniu dostępu porównanie zakończyło się sukcesem. Raport publiczny zawiera tylko liczniki i opaque ID. Kolejne szczegółowe adresy są zapisywane lokalnie pod nowym UUID w `<magazyn lokalny>/online/`; panel ma sekcję ich lokalnego podglądu. Pierwszy snapshot utworzony podczas tej iteracji pozostał w ignorowanym `.publication-review/online/` i jest odczytywany jako starszy wynik; zawiera wyłącznie ujawnione przez witrynę URL-e, bez kopii treści czy lokalnych nazw. Kolejne porównania tworzą nowe pliki, nie nadpisują poprzednich.

Wynik bieżącego porównania: [ONLINE_COMPARISON.md](ONLINE_COMPARISON.md). Obserwacja online jest oznaczana przy pliku jako informacja techniczna, nie zgoda DM.

## Ochrona narzędzia i granice

Nasłuch wyłącznie na 127.0.0.1, kontrola Host/Origin/Sec-Fetch-Site, token sesji do POST, brak CORS, no-store, CSP bez zewnętrznych usług i bez wykonywania źródłowego HTML/JS/SVG. Decyzja wymaga tokenu otwartego podglądu, zgodnego hasha i rewizji oraz potwierdzenia zakresu. Przeglądający nadal musi rzeczywiście przeczytać materiał — technika nie oceni sekretów fabularnych ani uwagi człowieka.

Pierwszy dostęp do panelu nie tworzy zgód ani snapshotów. Snapshot powstaje po jawnej decyzji. Zwykłe ścieżki spoza src/site ani `.obsidian` nie są serwowane. Dziennik jest append-only na poziomie aplikacji; osoba z dostępem do systemu plików nadal może zmienić pliki. Nie jest to uwierzytelnianie wielu DM ani podpis kryptograficzny decyzji.

Grupa jest walidowana przed zapisem pierwszej decyzji. Nie deklarujemy transakcji całego batcha odpornej na awarię dysku w połowie zapisu; po błędzie należy odświeżyć historię i przejrzeć tylko niezapisane pozycje. Źródła i aktywne rejestry nie są nadpisywane.

Ekstraktor zależności obejmuje podstawowe wikilinki, linki/obrazy Markdown i atrybuty src/href HTML. To pomoc przeglądu, nie kompletny parser Bases, Canvas, Dataview, dynamicznego JS/CSS, srcset lub całego Obsidiana. Ich bezpieczeństwo pozostaje blokadą następnego etapu.

## Minimalne blokady przed integracją i odblokowaniem buildu

1. Przegląd rzeczywistych materiałów i potwierdzony import decyzji treści i technicznych, bez utraty historii, z rozstrzygnięciem nieznanych zależności. Importer M1A.2C jest wdrożony; nie przyznano rzeczywistych zgód. Różnicę SVG wyjaśniono jako CRLF/LF, bez zmiany bajtów lub zgody DM. Dotychczasowe permalinki i jeden kanoniczny wpis na ID muszą pozostać niezmienione.
2. Świeży staging dopuszczonych źródeł i **jeden publiczny model** dla wszystkich kanałów. Prywatne/odrzucone pliki nie mogą trafiać do kolekcji, danych computed, transkluzji, fallbacków i szerokiego passthrough.
3. Kontrolowany renderer publicznego Markdown z obsługą rzeczywistych używanych składni; jawna sanitizacja dopuszczonego HTML, linków i embedów. Obsługa lub blokada Canvas/Bases/Dataview. Bez wykonywania szablonów/notatek jako kodu.
4. Indeks title/body/alias z tego samego zatwierdzonego wyrenderowanego obszaru; bez komentarzy, sekretów, raw frontmatter i niepublicznych transkluzji. Bezpieczne renderowanie wyników i testy wycofania wpisu.
5. Graf/backlinki/filetree/relacje, sitemap i feed wyłącznie z tej samej projekcji; brak surowych metadata i ujawniania odrzuconych końców relacji. Nie wnioskować publicznej afiliacji z wikilinku.
6. Kopiowanie tylko dopuszczonych zasobów i identyfikowalnych pochodnych, kontrola URL i metadanych obrazów/SVG/CSS. Wygenerowany artefakt musi pochodzić ze świeżego stagingu i przejść kontrolę wszystkich plików; stary dist nie jest certyfikowany.
7. Testy na rzeczywistych **jawnie zatwierdzonych** materiałach: 31 dotychczasowych URL-i, zachowanie Markdown/PNG/kart, poprawność źródła i wszystkich kanałów, plus negatywne canary w izolowanych kopiach testowych. Zielone fixture i porównanie widocznego tekstu online nie wystarczają.

Blokada `.eleventy.js` i skryptów produkcyjnych nie została zmieniona. Nie ma flagi omijającej ją ani automatycznego deploymentu. Możemy kontynuować przegląd i przygotowanie tych zabezpieczeń; nie ma jeszcze podstaw do pełnej integracji realnego lore lub deklaracji gotowości produkcyjnej.

## Testy i pliki

- `npm run publication:test`: **21/21 PASS** (dotychczasowe 13 + testy lokalnego przeglądu, historii, zakresów, batcha, diffów, zależności, CSRF/Host i prywatności porównania).
- `node scripts/review-browser-check.cjs`: **PASS**, headless Edge/Playwright, 1440 i 390 px; fikcyjna notatka, obraz i dwa pliki kodu. Przegląd grupy, zmiana zależności, diff, odmowa z historią, eksport, kod źródłowy jako tekst i brak zmian rejestrów. Wyłącznie świeży katalog tymczasowy; żadnych decyzji realnego DM.
- `npm run wiki:test`: **7/7 PASS**. Nie zmieniono prototypu ani nie wykonywano ponownego odbioru jego grafiki.
- Odczyt rzeczywistego repo przez silnik przeglądu: 31/34/39, **0 lokalnych decyzji**. Dostępność online sprawdzono na realnej witrynie; zgód z niej nie wyprowadzano.
- Test przeglądarkowy wymaga tych samych zmiennych WIKI_PLAYWRIGHT_MODULE/WIKI_BROWSER_EXECUTABLE co wcześniejsze skrypty. Nie dodano nowych zależności. Node 24.22.0; Node 22 i rzeczywiste telefony nie zostały osobno przetestowane.

Nowe pliki: `src/helpers/wiki/review.cjs`, `online-comparison.cjs`, `scripts/publication-review.cjs`, `compare-publication.cjs`, `review-browser-check.cjs`, `tools/publication-review/{index.html,review.js,review.css}`, `tests/security/review.test.cjs`, ten dokument i raport ONLINE_COMPARISON oraz nowy zredagowany snapshot JSON. Zmiany: `.gitignore`, package.json, README, instrukcja generowania DM_REVIEW i dokumentacja postępu/specyfikacji. Aktywne decyzje src/wiki, źródła publikacyjne, vault/.obsidian i aktualny prototyp UI bez zmian.

## Gdy kliknięcie Zatwierdź nie daje potwierdzenia

Wynik decyzji jest teraz pokazywany bezpośrednio pod przyciskami Zatwierdź/Odrzuć i pozostaje tam także po próbie eksportu. Błąd wskazuje brakujący podgląd, wymagane metadane albo problem sesji/zapisu. Nie traktuj samego kliknięcia jako zapisu: sprawdź komunikat „Zapisano … nowych decyzji”. Nieudana próba zachowuje zaznaczenie i otwarte formularze w bieżącej stronie. Eksport przy niezakończonym zaznaczeniu wymaga najpierw decyzji lub świadomego wyczyszczenia zaznaczenia; eksport bez aktualnych zapisanych decyzji jest blokowany.

Po aktualizacji kodu zatrzymaj stary serwer Ctrl+C, uruchom ponownie npm run publication:review i odśwież http://127.0.0.1:8082 przez Ctrl+F5. Odświeżenie strony usuwa niezapisane zaznaczenia/formularze, lecz nie zapisane decyzje. Nie wykonuj ponownie pełnego przeglądu tylko dlatego, że poprzedni komunikat był niewidoczny — rozstrzygnij wskazaną przyczynę i świadomie zapisz decyzję.
Błąd REVIEW_STORE_WRITE_DENIED (wcześniej ogólne LOCAL_REVIEW_ERROR) może oznaczać uruchomienie serwera w sandboxie agenta, który nie pozwala zapisywać poza workspace. Panel wymaga prawa zapisu do swojego magazynu w LocalAppData. Uruchom go w zwykłym terminalu użytkownika, poza sandboxem; konto administratora nie jest wymagane. Nie przenoś prywatnego magazynu do repo ani publicznego dist. Przy błędzie zapisu odśwież stan przed ponowieniem grupy, ponieważ część decyzji mogła zostać zapisana. Po restarcie serwera otwórz ponownie podgląd plików, aby uzyskać aktualne tokeny przeglądu.

Wspólny przegląd i tryb indywidualny mają osobne kontrolki. Wejście do wspólnego przeglądu usuwa tylko niezapisane zaznaczenie listy i jej checkboxy potwierdzenia, nie zapisane zgody. Przyciski indywidualne są wtedy ukryte, a checkboxy listy nieaktywne. Aby wrócić do ręcznego zaznaczania, wybierz Wróć do indywidualnego zatwierdzania z listy. Po komunikacie Zapisano użyj Utwórz lokalną propozycję z zapisanych decyzji — nie zatwierdzaj tych samych materiałów drugim przyciskiem.
