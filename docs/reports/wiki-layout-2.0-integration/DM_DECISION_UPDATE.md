# Aktualizacja decyzji DM

Data: 2026-10-24. Po przygotowaniu `FINAL_VALIDATION.json` DM jawnie odrzucił pięć notatek z poprzedniej kampanii. Decyzje zapisano przez lokalny proces przeglądu i kontrolowany importer; każda ma snapshot źródła, hash i zdarzenie historii. Nie zmieniono treści notatek ani nie nadano zgody innym oczekującym materiałom.

Odrzucone identyfikatory:

- `entry-09d427745ba4337c3b2b`
- `entry-ef2bb9085a20e4df2e69`
- `entry-607aef782082b2dfc6bc`
- `entry-88b39ec00e9fd41ceaf6`
- `entry-ed9a91f9d63a91e75887`

W przypadku `entry-ef2bb9085a20e4df2e69` zachowano wcześniejsze zdarzenie `approved`; nowa decyzja `denied` je zastępuje, bez usuwania historii. Wszystkie pięć wpisów ma teraz stan `denied` w `publication-decisions.json` i nie ma aktywnego wpisu w `public-entries.json`. Rejestr relacji nie zawiera ich identyfikatorów. Pliki źródłowe zachowują hashe z finalnego kandydata.

Po imporcie status rejestrów wynosi: 34 `approved`, 65 `pending`, 5 `denied`. Produkcyjne kanały pozostają wyłączone; walidacja nadal blokuje publikację niezatwierdzonych wejść.

## Status integracji

Scalenie pozostaje wstrzymane. Ponowny preflight wykazał 84 różnice między 259 ścieżkami manifestu kandydata a bieżącym katalogiem roboczym (brakujące pliki lub inne bajty). W związku z warunkiem zatrzymania zlecenia nie scalono kandydata, nie uruchomiono testów po scaleniu i nie zaktualizowano `PROJECT_STATUS.md` jako stanu po scaleniu. Wymagane jest uzgodnienie manifestu z bieżącym checkoutem, a następnie ponowna walidacja przed integracją.

Nie wykonano commita, pushu ani deploymentu. Oryginalny vault i `.obsidian` nie były modyfikowane. Produkcyjny build pozostaje zablokowany.

## Aktualizacja po uzgodnieniu kandydata — 2026-10-24

84 rozbieżności zostały sklasyfikowane i rozwiązane: 49 nowych plików dodano, a 35 zmian istniejących ścieżek uzgodniono z kandydatem. Nie stwierdzono konfliktu treści ani zgód DM. Pięć odmów i historia `approved → denied` pozostały w rejestrach. Szczegółowy wynik testów znajduje się w [FINAL_VALIDATION_RECONCILED.json](FINAL_VALIDATION_RECONCILED.json).

Build preview i testy wiki, publikacji oraz organizacji przechodzą. Wszystkie 11 regresji przeglądarkowych przeszło po uruchomieniu Playwright 1.64.1 w ignorowanym katalogu testowym z Edge headless. Integracja została zastosowana do niezacommitowanego workspace `feat/wiki-layout-2`. Produkcyjna walidacja nadal blokuje publikację; nie uruchomiono produkcyjnego buildu ani deploymentu.
