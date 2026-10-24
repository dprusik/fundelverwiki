# Raport diffu — finalny kandydat Wiki Layout 2.0

Historyczny opis pakietu przygotowanego przed decyzjami końcowymi; bieżący stan podaje sekcja „Odbiór po uzgodnieniu” poniżej.

## Aktualny status — odbiór techniczny

Integracja Wiki Layout 2.0 i Dark Archive została zamknięta lokalnie na gałęzi `feat/wiki-layout-2` (baza `e65fcc0a513e6179b7cc3b27938614a91ef7327a`). Wszystkie 11 regresji przeglądarkowych, build preview oraz testy wiki i publikacji przeszły. Pięć decyzji DM `denied` i ich historia są zachowane. Produkcyjna walidacja nadal blokuje publikację, a blokada buildu pozostaje aktywna.

Szczegółowy stan i zakres wcześniejszego kandydata w dalszych sekcjach opisuje moment jego przygotowania. Późniejsze decyzje i odbiór końcowy są podsumowane w sekcji [Odbiór po uzgodnieniu](#odbiór-po-uzgodnieniu).

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

## Decyzje pozostawione DM — stan historyczny przy przygotowaniu kandydata

1. Pięć wpisów wówczas opisanych jako pending otrzymało później jawne decyzje `denied`; szczegóły i zachowana historia są w [DM_DECISION_UPDATE.md](DM_DECISION_UPDATE.md).
2. Zgoda na integrację została udzielona; kandydat zastosowano do roboczego drzewa `feat/wiki-layout-2`.
3. Produkcyjne kanały wymagają osobnego projektu zabezpieczeń i zgód; obecny kandydat ich nie odblokowuje.

Poprzednie zdanie o braku scalenia opisywało stan w chwili sporządzenia pierwotnego raportu i zostało zastąpione aktualnym statusem powyżej.

## Uzgodnienie kandydata — 2026-10-24

Preflight 84 różnic został sklasyfikowany i uzgodniony z bieżącym workspace. 49 ścieżek było nowymi plikami kandydata (11 notatek lokacji i 38 plików UI, dokumentacji, testów, konfiguracji lub zasobów). Pozostałe 35 różnic dotyczyło istniejących ścieżek: 9 dokumentacji, 12 UI, 4 publikacji i przeglądu, 6 buildu/weryfikacji, 1 rejestru zatwierdzonych wpisów oraz 3 notatek.

Trzy zmienione notatki są zatwierdzone dla bajtów kandydata; ich permalinki pozostały bez zmian. Kandydat zachowuje wszystkie 17 wcześniej aktywnych wpisów i zasobów, dodaje 11 zatwierdzonych lokacji oraz aktualizuje zatwierdzenia dla trzech zmienionych notatek. Bieżący `Przedmioty.md` zachowuje oryginalne bajty i brak zgody. Równoległa dokumentacja statusu została rozstrzygnięta przez zachowanie pełniejszej historii kandydata. Nie stwierdzono nierozstrzygniętego konfliktu źródłowej treści ani zgód DM.

Reguła `.gitattributes` dla notatek zachowuje ich bajty zamiast pozwalać Gitowi konwertować końce linii. Dlatego status Git pokazuje surowe różnice dla 29 śledzonych notatek: 26 to wyłącznie końce linii, trzy zatwierdzone notatki zawierają zmianę treści. Wszystkie hashe aktywnych zgód przechodzą kontrolę.

Pięć późniejszych odmów opisano w [DM_DECISION_UPDATE.md](DM_DECISION_UPDATE.md). Rejestr odmów został zachowany podczas uzgodnienia. Szczegółowy wynik walidacji po integracji: [FINAL_VALIDATION_RECONCILED.json](reports/wiki-layout-2.0-integration/FINAL_VALIDATION_RECONCILED.json).

## Odbiór po uzgodnieniu — 2026-10-24

Regresje uruchomiono z Playwright 1.64.1 w ignorowanym `.integration-checks` i lokalnym Edge. Wszystkie 11 przeszły: desktop/mobile i nawigacja, encje i wyszukiwarka, 111 widoków zatwierdzonych artykułów, portrety/modal, 44 przejścia atlas–lokacja, mobilna mapa i obrót, sticky header, 24 disclosure, organizacje/frakcje oraz 24 widoki Dark Archive z DragonBanner.

`npm run wiki:build`: PASS (58 stron). `npm run wiki:test`: PASS (18/18). `npm run publication:test`: PASS (60/60). `node --test tests/wiki/organization.test.cjs`: PASS (3/3). `npm run publication:validate`: BLOCKED zgodnie z polityką (65 `UNAPPROVED_INPUT`, 5 `DENIED_INPUT`). Pełne szczegóły: [FINAL_VALIDATION_RECONCILED.json](reports/wiki-layout-2.0-integration/FINAL_VALIDATION_RECONCILED.json).

Pięć wpisów denied oraz dziewięć pending pozostaje poza lokalną projekcją, katalogami i wyszukiwarką. 45/45 aktywnych hashy zgód jest zgodnych; wcześniejsze permalinki pozostały bez zmian. Nie uruchomiono produkcyjnego buildu. Integracja została zamknięta lokalnym commitem; pushu ani deploymentu nie wykonano.

## Podsumowanie do commita

Integracja obejmuje responsywny Wiki Layout 2.0, katalogi i profile encji, wyszukiwarkę zatwierdzonych wpisów, strony organizacji, interaktywną mapę z lokacjami, motyw Dark Archive i DragonBanner, testy UI/publikacji oraz dokumentację. Rejestry zawierają 28 zatwierdzonych wpisów, 17 zasobów i pięć jawnych odmów. Blokada produkcyjnej publikacji pozostaje aktywna.
