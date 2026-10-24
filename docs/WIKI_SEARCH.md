# Lokalne wyszukiwanie zatwierdzonych treści

Stan: 2026-10-23, bez publikacji, commita i push. Start: `npm run wiki:dev`, adres `http://127.0.0.1:8081/`. Wybierz Szukaj, wpisz hasło na stronie głównej albo użyj Ctrl+K / Cmd+K. Escape zamyka okno i przywraca focus. Katalogi i artykuły pozostają dostępne bez JavaScript.

## Zakres

Wyszukiwarka głównej wiki obejmuje 17 zatwierdzonych wpisów: tytuły, jawnie przejrzane aliasy, tekst wyrenderowanych artykułów oraz nazwy i opisy zatwierdzonych punktów mapy. Tytuł lub alias ma pierwszeństwo przed dopasowaniem treści. Polskie znaki można wpisywać bez znaków diakrytycznych. Wynik prowadzi do kanonicznego adresu i pokazuje fragment tekstu wokół trafienia. Widocznych jest najwyżej 30 wyników z informacją o całej liczbie trafień.

Treść wewnątrz kart PNG/JPG nie jest rozpoznawana przez OCR. Takie wpisy można znaleźć po tytule i zatwierdzonych aliasach. Nie dopisujemy aliasów automatycznie na podstawie nazw plików lub treści obrazu.

Demo pod `/demo/` ma osobny zakres i indeks. Błąd pobrania prawdziwego indeksu daje możliwość ponowienia; nie przełącza na demo. Nie korzystamy z produkcyjnego `searchIndex.json` ani z usług zewnętrznych.

## Źródło i aktualizacja

`/approved-search.json` powstaje z tego samego zweryfikowanego modelu co artykuły. Ekstrakcja usuwa znaczniki i atrybuty HTML, zachowuje widoczny tekst (w tym kod), dekoduje encje i rozdziela bloki. Wyłącznie przejrzane pola `id/url/title/category/aliases/body/summary` trafiają do rekordu. Frontmatter, komentarze, nazwy i ścieżki źródłowe, hashe oraz niedostępne adresy znaczników mapy nie są kopiowane. HTML źródłowy i komentarze Obsidiana nadal blokuje adapter artykułów. Kod klasy języka bloku nie trafia do indeksu.

Indeks jest lokalnym snapshotem buildu. Po zmianie, ukryciu lub wycofaniu zgody trzeba przebudować podgląd i odświeżyć otwartą stronę. Polecenia `wiki:build` / `wiki:dev` usuwają poprzedni wynik przed walidacją; błędny nowy build nie zachowuje starego indeksu. Nie należy ręcznie edytować JSON w wygenerowanym katalogu.

Wyniki są tworzone przez `textContent`; odnośniki muszą mieć bezpieczny lokalny adres kanoniczny. Klient rozdziela cache obu zakresów, pomija niebezpieczne URL i odrzuca spóźnione odpowiedzi po zmianie zapytania lub zamknięciu okna.

## Weryfikacja i ograniczenia

Build PASS; `publication:test` **59/59 PASS**, `wiki:test` **13/13 PASS**. `scripts/wiki-search-browser-check.cjs` PASS w Edge headless przy 1440/390/320 px: tytuł/alias/treść, fragment dopasowania, brak wyników, puste zapytanie, focus/drawer/Escape, błąd pobrania i retry, złośliwe URL i tekst XSS, spóźniona odpowiedź, rzeczywisty indeks i osobne demo. Test używa syntetycznych odpowiedzi do negatywnych scenariuszy; nie dodaje zgód. Zrzuty sprawdzono wizualnie i zachowano w ignorowanym `.publication-review/search-visual-check/`.

Regresje katalogów i artykułów: 78 kontroli stron/viewportów, no-JS, linki i obrazy PASS. Dotychczasowa regresja demo również PASS. Testy negatywne adaptera obejmują pending/denied/hidden, zmianę bajtów, wycofanie wpisu, komentarze, frontmatter, atrybuty, klasy bloków kodu i surowe cele mapy. Środowisko Node 24; brak osobnej weryfikacji Node 22, fizycznych telefonów i pełnego odbioru czytników ekranu.

Nie zmieniono źródeł, aktywnych zgód ani blokady produkcyjnego Eleventy. Jest to lokalna implementacja wyszukiwania; produkcyjne kanały, hosting/cache, graf/backlinki, sitemap/feed i wdrożenie nadal wymagają osobnego etapu.
