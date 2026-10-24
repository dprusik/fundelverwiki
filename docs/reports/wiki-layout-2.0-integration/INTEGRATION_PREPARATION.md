# Przygotowanie integracji — 2026-10-24

Kandydat końcowy i jego zakres są opisane w [raporcie diffu](DIFF_REVIEW.md). Prywatny pakiet znajduje się pod `.worktrees/dark-archive-theme/.integration-prepared/<najnowszy-katalog>/`; zawiera snapshot, manifest, patch, bazę oraz kopię głównej wersji `PROJECT_STATUS.md`.

Podstawę stanowi główny HEAD `e65fcc0a`. Zachowano nowszy plik `Przedmioty.md` z głównego workspace. Wspólne sekcje równoległych dokumentów statusu były zgodne; zachowano pełniejszą historię worktree i oznaczono starszy plan jako historyczny.

Spośród 18 notatek z wcześniejszego zestawienia 13 ma aktywne zgody z pasującymi hashami, a 5 pozostaje pending. Wszystkie 3 zmienione notatki są zatwierdzone. Plik `Przedmioty.md` nie ma aktywnej zgody i nie trafia do zatwierdzonego preview. Rejestry zgód i ich historia pozostają niezmienione.

Pełny walidator nadal blokuje publikację z powodu niezatwierdzonych wejść; produkcyjna blokada buildu pozostaje aktywna. Build preview i regresja przeglądarkowa są wykonywane na izolowanym kandydacie. Nie wykonano merge, commita, pushu ani deploymentu.

## Uzgodnienie kandydata — 2026-10-24

Kolejny preflight rozwiązał 84 rozbieżności bez konfliktów: 49 nowych ścieżek oraz 35 zmian istniejących plików. Zastosowano aktualny kandydat w roboczym drzewie `feat/wiki-layout-2`. Rejestr decyzji zachowuje pięć odmów DM; aktywne 28 wpisów i 17 zasobów mają zgodne hashe. Permalinki wcześniejszych 17 zatwierdzonych wpisów pozostały bez zmian.

Build preview: PASS, 58 stron. `wiki:test`: 18/18 PASS. `publication:test`: 60/60 PASS. Organizacje: 3/3 PASS. `publication:validate`: BLOCKED zgodnie z polityką (65 niezatwierdzonych, 5 odrzuconych). Pięć odmów i dziewięć pending nie trafia do lokalnych tras, katalogów ani wyszukiwarki. Wszystkie 11 regresji przeglądarkowych przeszło na Playwright 1.64.1 z Edge headless; szczegóły są w [FINAL_VALIDATION_RECONCILED.json](FINAL_VALIDATION_RECONCILED.json). Nie uruchomiono buildu produkcyjnego. Bez commita, pushu i deploymentu.
