# Raport diffu — finalny kandydat Wiki Layout 2.0

Data: 2026-10-24. Kandydat jest prywatnym, niezacommitowanym drzewem zbudowanym na głównym HEAD `e65fcc0a`, z zaakceptowanego worktree `994d1c3b` i zachowanym plikiem Przedmioty.md z głównego workspace.

## Rzeczywisty diff względem głównego HEAD

Po normalizacji wyłącznie CRLF do LF: 259 plików manifestu, 130 dodanych, 7 zmienionych merytorycznie i 122 bez zmian. Wśród zmian treści są 11 nowych artykułów lokacji Neverwinter oraz 3 zmienione notatki: artykuł miasta Neverwinter, wpis Bregan D’aerthe i tytuł dziennika Tergona. Pozostałe zmiany obejmują prototyp Wiki Layout 2.0, warstwę Dark Archive, narzędzia i testy bezpieczeństwa publikacji oraz dokumentację. Produkcyjna blokada pozostaje włączona.

Wcześniejszy raport nazywał 18 notatek „nowymi”. Kontrola na właściwej bazie e65fcc0a wykazała, że siedem z tej osiemnastki już istnieje w bazie. Dlatego faktyczny diff względem głównej gałęzi zawiera 11 nowych notatek. Zgodnie z poleceniem zweryfikowano jednak wszystkie 18 notatek z wcześniejszego zestawienia, niezależnie od tego, czy są nową zmianą w tym diffie.

## Kontrola zgód DM

Z osiemnastu sprawdzonych notatek 13 ma aktywną zgodę z hashem zgodnym z bieżącym źródłem: 11 nowych lokacji oraz 2 z 7 notatek istniejących już w bazie. Pięć istniejących notatek nie ma aktywnego zatwierdzenia i pozostaje poza rejestrem oraz projekcją publiczną. Wszystkie trzy zmienione notatki mają aktywne zgody i pasujące hashe. Rejestrów zgód ani historii recenzji nie zmieniano.

W całym kandydacie aktywne dane obejmują 28 notatek i 17 zasobów; wszystkie 45 hashy są zgodne. Pełne polecenie `npm run publication:validate` nadal odmawia publikacji z powodu 69 niezatwierdzonych wejść. Odmowa jest oczekiwana i blokada nie została osłabiona.

## Przedmioty.md

Kandydat zachowuje dokładne bajty wersji z głównego workspace. Plik nie ma aktywnego wpisu w rejestrze zatwierdzonych artykułów, więc nie trafia do zatwierdzonego preview ani indeksu wyszukiwarki. Produkcyjny kanał pozostaje zablokowany. Nie dodawano zgody ani nie modyfikowano treści.

## Rozstrzygnięcie równoległej dokumentacji

Wspólne sekcje obu wersji `PROJECT_STATUS.md` są zgodne. Wersja głównej gałęzi zawierała krótszy, starszy wpis o stanie Dark Archive i dalszym kroku; wersja worktree zawierała nowszą historię odbioru UI oraz kolejne korekty. Finalny kandydat zachowuje wspólną historię i pełniejszą wersję worktree, oznacza dawny plan jako historyczny i dodaje sekcję bieżącego kandydata. Oryginalna wersja z głównego workspace pozostaje w prywatnym katalogu `main-before` do audytu.

## Porządek w dokumentacji Dark Archive

Usunięto odnośniki do pominiętych screenshotów i JSON-ów oraz link do historycznego baseline. Test integralności oparty na starym układzie plików nie jest już przedstawiany jako bieżący test. Instrukcja powtórzenia kontroli używa izolowanego preview i wrappera regresji, który kieruje przeglądarkę na port kandydata. Pozostałe wzmianki o dawnych kontrolach są oznaczone jako historyczne.

Archiwum bazowe zostało ponownie wyekstrahowane z jawnym kodowaniem UTF-8 i porównane z listą ścieżek Git: 129/129 ścieżek zgodnych. Wcześniejsza ekstrakcja Windows tworzyła błędnie zakodowane duplikaty; nie występują w finalnym kandydacie. Skrypt przygotowania teraz weryfikuje nazwy wszystkich ścieżek po ekstrakcji i kończy pracę błędem przy rozbieżności.

## Walidacja i testy kandydata

- Aktywne zatwierdzenia: 45/45 hashy zgodnych; round-trip dokładnych bajtów przez filtry Git: 28/28 notatek.
- `npm run publication:validate`: BLOCKED, 69 `UNAPPROVED_INPUT`; produkcyjny kanał pozostaje zamknięty.
- `npm run wiki:build`: PASS, 58 stron lokalnego preview.
- `npm run wiki:test`: PASS, 18/18.
- `npm run publication:test`: PASS, 60/60.
- `node --test tests/wiki/organization.test.cjs`: PASS, 3/3.
- Regresja przeglądarkowa na własnym serwerze kandydata: 11 scenariuszy PASS: nawigacja, encje, wyszukiwanie, zatwierdzone artykuły (111 widoków), portrety (28), atlas i lokacje (44 przejścia), mobilna mapa, sticky header, disclosure (24), organizacje oraz Dark Archive (24 widoki).
- `src/site/notes/Przedmioty.md` zachowuje bajty głównego workspace i nie pojawia się w zatwierdzonym preview.

Nie uruchamiano produkcyjnego `npm run build`. Jego blokada jest utrzymana. Wyniki opisują prywatny podgląd oraz rejestry zgód, nie certyfikację produkcyjnego Digital Garden/Vercel.

## Decyzje z chwili przygotowania — historyczne i rozwiązane

1. Pięć notatek pending z tego snapshotu otrzymało później jawne decyzje `denied`; ich rejestr i historia są zachowane.
2. Zgoda na integrację została udzielona, a kandydat zastosowano do roboczego drzewa `feat/wiki-layout-2`.
3. Produkcyjne kanały wymagają osobnego projektu zabezpieczeń i zgód; obecny kandydat ich nie odblokowuje.

Informacja o braku scalenia opisywała wyłącznie stan w chwili przygotowania pierwotnego kandydata.

## Stan po uzgodnieniu i odbiorze — 2026-10-24

Późniejsza decyzja DM i uzgodnienie 84 rozbieżności opisane są w [aktualizacji DM](DM_DECISION_UPDATE.md). Kandydat zastosowano do roboczego drzewa `feat/wiki-layout-2`; zmiany pozostają niezacommitowane. Pięć decyzji `denied` i historia ich przeglądów są zachowane. Wyniki końcowej walidacji zawiera [FINAL_VALIDATION_RECONCILED.json](FINAL_VALIDATION_RECONCILED.json).

`wiki:build` PASS (58 stron), `wiki:test` 18/18, `publication:test` 60/60, test organizacji 3/3. Wszystkie 11 regresji przeglądarkowych przeszło z Playwright 1.64.1 i Edge, w tym Dark Archive/DragonBanner, wyszukiwarka, encje, mapa, responsywność oraz nawigacja. `publication:validate` pozostaje BLOCKED zgodnie z polityką: 65 `UNAPPROVED_INPUT`, 5 `DENIED_INPUT`. Produkcyjny build pozostaje zablokowany; nie wykonano commita, pushu ani deploymentu.

## Pierwszy preflight po decyzji DM — stan historyczny, rozwiązany poniżej

Późniejszą decyzję DM i pierwszy wynik preflightu opisuje [aktualizacja DM](DM_DECISION_UPDATE.md). Wcześniejszą lokalną decyzję `approved` dla jednego wpisu zachowano w historii i zastąpiono przez `denied`. W pierwszym preflightzie wykryto rozbieżności; zostały sklasyfikowane, uzgodnione i zweryfikowane w sekcji „Stan po uzgodnieniu i odbiorze”.
