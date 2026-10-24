# Postacie na stronach frakcji — bogatszy widok

Stan: 2026-10-23, wyłącznie lokalny worktree `feat/dark-archive-theme`, podgląd 8083.

Dotychczasowy widok organizacji w demo pokazywał nazwę i krótki opis członka. Zastąpiono go dwukolumnową siatką kart (jedna kolumna na mobile): portret albo inicjał, nazwa/link, jawny publiczny status, zatwierdzony opis, opcjonalny opis członkostwa i linki do istniejących publicznych lokacji. Puste pola nie są zastępowane domysłami. Nie pokazujemy postaci bez odpowiedniej istniejącej relacji member_of w demo.

Rzeczywista frakcja ma obecnie dwa odnośniki do postaci, ale aktywny rejestr relacji jest pusty. Prezentacyjny model widoku rozpoznaje te konkretne odnośniki z zatwierdzonego HTML i pokazuje karty pod nagłówkiem **Postacie wymienione we wpisie**. Nie nazywa ich członkami i nie tworzy relacji. Ilustracje są miniaturami istniejących obrazów z zatwierdzonych wpisów postaci, nie nowymi referencjami portretu; sprawdzane jest istnienie obrazu w plikach zatwierdzonego modelu. Obraz nie jest cropowany ani modyfikowany. Brak krótkiego opisu/statusu w publicznych metadanych oznacza brak tych elementów na karcie.

Kanoniczne, samodzielne listy linków są zastępowane kartami. Opisowa narracja, niestandardowe etykiety odnośników oraz linki do innych typów treści pozostają w artykule. Zduplikowana wzmianka nie tworzy kolejnej karty. Żaden Markdown, rejestr zgód ani źródło relacji nie jest zapisywane. Wyszukiwarka zachowuje dotychczasowy zweryfikowany indeks.

Podgląd rzeczywistej frakcji: http://127.0.0.1:8083/postacie/bregan-d-arthe/. Przykład z pełniejszymi istniejącymi metadanymi: http://127.0.0.1:8083/demo/entities/guild/.

Materiały wizualne z poprzedniej oceny nie są częścią kandydata; nie linkujemy do pominiętych screenshotów.

Sprawdzenia: lokalny build PASS, istniejące wiki:test 13/13 PASS, nowy `node --test tests/wiki/organization.test.cjs` 3/3 PASS. `node scripts/organization-browser-check.cjs`: 9 kombinacji stron i szerokości 1440/390/320, obrazy/inicjały/statusy, odnośniki do postaci, brak overflow i błędów JS, karta bez JavaScript — PASS. Screenshoty sprawdzono wizualnie; skorygowano ciasny nagłówek z CTA na mobile i podwójne kodowanie apostrofu w breadcrumbs rzeczywistego wpisu. Historyczna kontrola integralności nie jest bieżącą regresją kandydata.

Nowe pliki: `src/wiki-ui/organization-view.cjs`, `prototype/site/_data/organizationViews.cjs`, `src/wiki-ui/templates/organization-character-card.njk`, `tests/wiki/organization.test.cjs`, `scripts/organization-browser-check.cjs`, ten raport i cztery PNG. Zmienione: `prototype/site/entities.njk`, `prototype/site/approved-articles.njk`, `src/wiki-ui/wiki.scss`, lista oczekiwanych zmian prezentacji w historyczny skrypt integralności Dark Archive (pominięty w kandydacie), `docs/PROJECT_STATUS.md`. Adapter publikacji i istniejąca konfiguracja integracji danych pozostają bez zmian względem poprzedniego etapu. Bez commita, push i deploymentu.
