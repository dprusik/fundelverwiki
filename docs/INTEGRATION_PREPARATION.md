# Przygotowanie integracji — 2026-10-24

## Dane w pierwotnym pakiecie — stan historyczny przed decyzjami DM

Poniższe liczby opisują pakiet sprzed późniejszych odmów DM i uzgodnienia workspace. Bieżący status podaje sekcja „Uzgodnienie po decyzjach DM” na końcu.

Kandydat końcowy i jego zakres są opisane w [raporcie diffu](DIFF_REVIEW.md). Prywatny pakiet znajduje się pod `.worktrees/dark-archive-theme/.integration-prepared/<najnowszy-katalog>/`; zawiera snapshot, manifest, patch, bazę oraz kopię głównej wersji `PROJECT_STATUS.md`.

Podstawę stanowi główny HEAD `e65fcc0a`. Zachowano nowszy plik `Przedmioty.md` z głównego workspace. Wspólne sekcje równoległych dokumentów statusu były zgodne; zachowano pełniejszą historię worktree i oznaczono starszy plan jako historyczny.

Spośród 18 notatek z wcześniejszego zestawienia 13 ma aktywne zgody z pasującymi hashami, a 5 pozostaje pending. Wszystkie 3 zmienione notatki są zatwierdzone. Plik `Przedmioty.md` nie ma aktywnej zgody i nie trafia do zatwierdzonego preview. Rejestry zgód i ich historia pozostają niezmienione.

Pełny walidator nadal blokuje publikację z powodu niezatwierdzonych wejść; produkcyjna blokada buildu pozostaje aktywna. Build preview i regresja przeglądarkowa są wykonywane na izolowanym kandydacie. Nie wykonano merge, commita, pushu ani deploymentu.

## Uzgodnienie po decyzjach DM — 2026-10-24

84 rozbieżności preflightu sklasyfikowano jako 49 nowych ścieżek oraz 35 zmian istniejących plików. Brakujące pliki nie były konfliktami. Wśród zmienionych wpisów kampanii trzy zatwierdzone hashe pasują do źródeł kandydata i zachowują permalinki; aktywne zatwierdzenia pozostałych materiałów również są zgodne. Zawartość pięciu odmów DM oraz ich historia zostały zachowane; szczegóły są w [DM_DECISION_UPDATE.md](DM_DECISION_UPDATE.md).

Uzgodnione drzewo zastosowano do gałęzi `feat/wiki-layout-2`; commit zamykający integrację wykonano po ponownej kontroli manifestu i listy stagingu. `wiki:build` zakończył się sukcesem (58 stron), `wiki:test` 18/18, `publication:test` 60/60, test organizacji 3/3. `publication:validate` pozostaje zablokowane zgodnie z projektem: 65 niezatwierdzonych i 5 odrzuconych wejść. Kontrola projekcji potwierdziła 28 artykułów, 17 zasobów, 28 rekordów wyszukiwania oraz brak tras, odnośników katalogowych i wyników wyszukiwania dla wpisów pending/denied.

Regresje uruchomiono z Playwright 1.64.1 zainstalowanym wyłącznie w ignorowanym `.integration-checks` oraz lokalnym Edge. Wszystkie 11 scenariuszy przeszło. `wiki:build` PASS (58 stron), `wiki:test` 18/18, `publication:test` 60/60, organizacje 3/3. `publication:validate` pozostaje BLOCKED: 65 `UNAPPROVED_INPUT`, 5 `DENIED_INPUT`. Szczegóły podaje [FINAL_VALIDATION_RECONCILED.json](reports/wiki-layout-2.0-integration/FINAL_VALIDATION_RECONCILED.json). Nie wykonywano produkcyjnego buildu. Bez pushu i deploymentu; blokada produkcyjna pozostaje aktywna.
