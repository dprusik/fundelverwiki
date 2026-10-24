# M1A.2B — porównanie publicznej wiki i repozytorium

Odczyt: **2026-10-22, 19:06 UTC**, [fundelverwiki.vercel.app](https://fundelverwiki.vercel.app). Gałąź lokalna: feat/wiki-layout-2. To porównanie techniczne, **nie zgoda DM na publikację ani certyfikat bezpieczeństwa**.

## Zweryfikowane wyniki

| Kontrola | Wynik |
|---|---|
| Home, sitemap.xml, searchIndex.json, graph.json, feed.xml | Każdy endpoint HTTP 200 |
| Lokalne kanoniczne URL-e notatek | 31/31 ujawnionych online i potwierdzonych HTTP 200 |
| Obecność tych URL-i w publicznej sitemap / search / graph | 31 / 31 / 31 |
| Znormalizowany tekst main względem lokalnego dist | 31 zgodnych, 0 różnych |
| Bezpośrednie linki home do lokalnych notatek | 5 |
| Niedziałające sprawdzone linki home | 0 |
| Zasoby lokalne | 34 |
| Zasoby ujawnione w sprawdzonych odwołaniach i porównane bajtowo | 28: 27 identycznych, 1 różny |
| Pozostałe zasoby | 6 nie odpytywano pod zgadywanymi adresami |
| Ujawnione publiczne URL-e poza zbiorem lokalnych notatek | 1; może być stroną systemową, wymaga klasyfikacji |

Zredagowany snapshot JSON pozostaje lokalnym artefaktem i nie jest dołączony do kandydata. Szczegółowe URL-e i czytelne ścieżki są dostępne wyłącznie w lokalnym narzędziu `npm run publication:review`. Pierwszy snapshot publicznych URL-i zachowano w ignorowanym `.publication-review/online/`; kolejne porównania i prywatne snapshoty przeglądu trafiają domyślnie poza repo, do lokalnego magazynu opisanego w PUBLICATION_WORKFLOW.md.

## Różnice i kwestie do sprawdzenia

1. **Jeden SVG ma inne bajty niż lokalne źródło:** kontrolne ID `asset-eaf06fc0a615dfa9b873`. W M1A.2C zweryfikowano różnicę CRLF/LF — szczegóły niżej. Nie nadpisywano żadnej wersji ani nie udzielono zgody. Wpisz ID w wyszukiwanie lokalnego panelu, aby zobaczyć rzeczywistą ścieżkę; SVG pozostaje podglądem tekstowym.
2. **Sześć zasobów nie zostało potwierdzonych:** nie znaleziono ich w obsługiwanych odwołaniach sprawdzonych stron. Mogą istnieć online po bezpośrednim adresie lub w innych kontekstach/srcset/CSS. To nie dowód prywatności ani usunięcia. Nie wysyłano lokalnych nieujawnionych nazw do serwera.
3. **Jeden dodatkowy publiczny URL nie odpowiada lokalnej notatce.** W M1A.2C potwierdzono stronę systemową braku treści, zgodną z lokalnym szablonem. Nie jest brakującą encją lore; szczegóły niżej.
4. **searchIndex i graph są publicznie dostępne.** Wyłączenie kontrolek UI nie ukrywa tych endpointów. Ich dostępność nie dowodzi wycieku konkretnego sekretu, lecz wymaga realnego przeglądu wszystkich dopuszczonych treści/metadanych w przyszłej integracji.
5. **Zgodność tekstu main nie oznacza identyczności źródła.** Nie porównuje komentarzy, frontmatteru, całego HTML, obrazów i wszystkich dynamicznych interakcji. Lokalny dist to historyczny artefakt; nie został odbudowany z obecnego zablokowanego generatora. Przegląd treści i bajtów nadal należy do DM.

## Metoda i ograniczenia

Skrypt odczytał stałe publiczne endpointy, zebrał ujawnione URL-e, dopasował je do lokalnych permalinków i odczytał pasujące strony. Z nich zebrał odwołania do zasobów. Nie wykonywał JS, nie logował się do Vercel, nie zmieniał ustawień, nie wysyłał notatek ani nazw lokalnych kandydatów. Zmiany online mogą nastąpić po tym pomiarze.

Publiczne raporty nie kopiują nazw encji, treści ani potencjalnie spoilerowych ścieżek. Dla lokalnie znanych materiałów używają kontrolnych ID, dla dodatkowych publicznych ścieżek hashy. Raport nie ustala aktualnej zgody graczy/DM, nie ujawnia prywatnych danych i nie odblokowuje buildu.

Powtórzenie: `npm run publication:compare`. Powstaje nowy snapshot JSON; istniejący raport i historia nie są nadpisywane. Wynik lokalnego panelu jest oznaczony czasem obserwacji. Dalszy przegląd i blokady techniczne: [PUBLICATION_WORKFLOW.md](PUBLICATION_WORKFLOW.md).

## M1A.2C — wyjaśnienie dwóch różnic

Ponowny odczyt wyłącznie dwóch wcześniej ujawnionych publicznych adresów: **2026-10-22, 19:35–19:38 UTC**. Nie wysyłano prywatnych nazw ani źródeł i nie zmieniano zgód.

- SVG `asset-eaf06fc0a615dfa9b873`: HTTP 200, `image/svg+xml`; lokalnie 3187 bajtów, online 3163. Lokalny SHA-256 `cc862684edc105b61d2086cec3caf2857d09dba6ca148d6d562ebd20e230a64a`; online `8daa0c047ade3a13837a1c19e33cf9b9a18c486ea032c00dc3dce1ba27441307`. Po **wyłącznie** zamianie CRLF na LF teksty są identyczne. To dowód różnicy zakończeń linii, bez wnioskowania o procesie wdrożenia. Importer nadal wymaga dokładnego hasha lokalnego pliku, bez automatycznej normalizacji lub zgody na obie wersje. Treść SVG, bezpieczeństwo i prawo publikacji nadal zatwierdza DM/odpowiedni przegląd techniczny.
- Dodatkowy URL (hash zachowany w historycznym snapshocie) odpowiada systemowemu `src/site/404.njk`. Odpowiedź HTTP **200** ma ten sam title, h1, akapit i link powrotu co lokalny szablon. Nazwa trasy nie gwarantuje statusu 404. `.eleventy.js` kieruje nierozwiązane wikilinki do tego widoku. Nie znaleziono w tym porównaniu brakującej notatki; nie dopisano encji ani zgody. W przyszłej integracji należy rozstrzygnąć semantykę statusu HTTP i kontrolować systemowe strony w sitemap.

Przeglądarka narzędziowa nie odczytała tych endpointów; wykonano bezpośredni odczyt HTTP Node po uzyskaniu dostępu sieciowego. W raporcie zapisano wyłącznie statusy, hashe, rozmiary i wynik porównania struktury, bez kopii treści. Starszy snapshot pozostaje niezmieniony. Dostępność online nie stanowi zgody DM ani potwierdzenia bezpieczeństwa kanałów.
