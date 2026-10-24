# Wiki Layout 2.0 — status i dalsze kroki

## Aktualny odbiór i plan — 2026-10-24

Użytkownik potwierdził wykonanie testów manualnych i zgłoszenie uwag po zaakceptowaniu ostatnich poprawek. Odbiór bieżącego układu uznajemy za zakończony w ocenionym zakresie. Nie jest to pełny audyt dostępności ani certyfikacja produkcyjnych kanałów publikacji.

Gotowe są: motyw Dark Archive i banner menu, przypięty pasek nawigacji/wyszukiwania, zwijane i przewijane katalogi, opis frakcji, 11 lokacji Neverwinter, hierarchia przez artykuł miasta, osobny atlas, zaznaczanie znaczników i mobilny panel, nagłówki z ilustracją/placeholderem oraz portrety z modalem oryginału. Szczegóły: [PROJECT_STATUS.md](PROJECT_STATUS.md).

Ostatnie wykonane kontrole: build PASS (58 stron), wiki:test 18/18, publication:test 60/60, 28 kontroli portretów/modali, 111 kontroli zatwierdzonych artykułów, regresja encji i 24 warianty motywu PASS. Nie uruchamiano ich ponownie przy aktualizacji tego raportu.

Najbliższe kroki:

1. **Przygotować pakiet do integracji.** Uporządkować lokalne zmiany kodu, treści i rejestrów; odróżnić odziedziczone pliki prototypu od późniejszych zmian. Uwzględnić różnicę baz: worktree Dark Archive ma HEAD 994d1c3, główny katalog e65fcc0. Nie nadpisywać nowszych notatek i zmian użytkownika. Commit i push wymagają osobnej zgody.
2. **Dokończyć bezpieczny proces produkcyjnego budowania.** Zintegrować zaakceptowany interfejs z workflow Digital Garden oraz zabezpieczyć docelowe kanały HTML, wyszukiwania, grafu/backlinków, sitemap/feed, zasobów i hostingu. Bramka starego produkcyjnego buildu pozostaje aktywna.
3. **Sprawdzić artefakt w podglądzie wdrożeniowym.** Zatwierdzony zakres treści, istniejące permalinki, obrazy, linki i brak wejść pending/denied we wszystkich generowanych kanałach, potem podstawowe scenariusze użytkownika.
4. **Opublikować po osobnej zgodzie** na konkretną sprawdzoną wersję.

Zmiany pozostają lokalne, niezacommitowane i nieprzeniesione do głównego katalogu. Aktywne zgody obejmują 28 notatek i 17 zasobów, 70 wejść pozostaje pending. Brak testów fizycznych telefonów i pełnego audytu czytników ekranu. Maps 2.0 i kolejne moduły nie wchodzą do tego etapu.

## Raport historyczny — 2026-10-23

Poniższe listy otwartych zadań są historyczne. Aktualne wykonanie i następny etap opisano powyżej; brak opisu frakcji i niedokończony odbiór wizualny nie są już bieżącymi blokadami.

Stan na 2026-10-23. Prace nad Dark Archive są w roboczym worktree `feat/dark-archive-theme` podglądanym lokalnie na `http://127.0.0.1:8083/`. Zmiany nie zostały zacommitowane, wypchnięte ani wdrożone.

## Status

Zaakceptowana struktura i zachowanie Wiki Layout 2.0 pozostały podstawą prac. Dodano warstwę Dark Archive: ciemne grafitowe powierzchnie, jasny tekst, złote akcenty, lokalne czerwone i niebieskie detale, ornamenty fantasy oraz dostarczony `DragonBanner.png`. Banner zdobi stronę główną i nagłówki, a na wąskich ekranach ustępuje miejsca treści. Szczegóły tokenów i screenshoty są w [raporcie motywu](DARK_ARCHIVE_THEME.md).

Sekcje postaci przy organizacjach/frakcjach mają teraz karty z ilustracją albo inicjałem i prowadzą do istniejących stron postaci. Demo pokazuje wyłącznie istniejące informacje o członkostwie, statusach, opisach i lokacjach. Na rzeczywistej stronie frakcji nagłówek brzmi **Postacie wymienione we wpisie**: istniejące odnośniki nie są traktowane jako dowód członkostwa. Nowy widok nie dopisuje treści, relacji ani statusów. Zrzuty rzeczywistej i demonstracyjnej frakcji znajdują się w [raporcie sekcji organizacji](ORGANIZATION_LAYOUT.md).

Weryfikacje ostatniej iteracji przeszły: lokalny build; `npm run wiki:test` (13/13); testy organizacji (3/3); kontrola przeglądarkowa organizacji (9 wariantów, w tym desktop, 390/320 px i bez JavaScript); kontrole motywu, kontrastu oraz integralności opisane w raportach. Nie wykonano produkcyjnego buildu. Wyniki dotyczą lokalnego prototypu, nie wdrożenia.

## Następne kroki

1. **Uzupełnić merytoryczny wpis frakcji** — przygotować opis samej frakcji: jej celów, organizacji, historii i aktualnego znaczenia. Można dopisać te informacje później; istniejąca sekcja kart pozostanie oddzielona od narracji. Jeśli tekst ma wejść do publicznej wiki, przeprowadzić go przez obowiązujący proces przeglądu i zatwierdzenia treści.
2. **Dodać wyłącznie potwierdzone relacje członkostwa** — gdy będą znane i zatwierdzone, zapisać je w obsługiwanym rejestrze relacji. Do tego czasu widok rzeczywisty nadal opisuje postacie jako wzmianki z wpisu.
3. **Ocenić wpis frakcji po uzupełnieniu treści** — sprawdzić czytelność dłuższego opisu obok kart postaci na desktopie i mobile, w tym szerokość 320 px. W razie potrzeby skorygować prezentację, bez zmiany kanonicznych adresów i zachowania nawigacji.
4. **Dokończyć odbiór wizualny layoutu** — ocenić wspólnie screenshoty strony głównej, katalogów, wpisu NPC, lokacji, frakcji i mobilnego drawera. Zebrać uwagi do jednej iteracji stylów.
5. **Przygotować rozdzielenie zmian do przeglądu** — oddzielić patch warstwy wizualnej od odziedziczonych zmian prototypu/migracji. Po przeglądzie zdecydować o scaleniu do uzgodnionej gałęzi bazowej. Commit, push i deployment wymagają osobnej zgody.

## Granice obecnego zakresu

- Opis frakcji nie został dopisany; nie dostarczono jeszcze jego treści.
- Rejestr rzeczywistych relacji pozostaje źródłem formalnego członkostwa. Widok wzmianek go nie zastępuje.
- Wyszukiwarka produkcyjnych zatwierdzonych artykułów, publiczny hosting oraz pozostałe kanały publikacji nie są certyfikowane przez tę pracę nad layoutem.
- Zmiany znajdują się w osobnym worktree i nie zostały przeniesione do głównego katalogu roboczego.

