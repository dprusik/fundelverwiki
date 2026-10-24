# Bezpieczny build publikacyjny — bieżąca implementacja

## Status

Dodano osobny generator kontrolnego podglądu publikacji:

```powershell
npm run publication:build-preview
```

Build zapisuje artefakt do nowego katalogu `.publication-build/preview-*`; katalog i manifest hashy są ignorowane przez Git. Ten wynik jest lokalny i **nie nadaje się do wdrożenia**: HTML zawiera `noindex,nofollow`, a `robots.txt` zabrania indeksowania. Nie jest to komenda Vercel ani sposób na ominięcie bramki.

Legacy `npm run build` nadal kończy się na `assertProductionBuildAllowed()` przed czyszczeniem `dist`. Bramka nie jest sterowana zmienną środowiskową. Pełne `publication:validate` nadal odrzuca stan z materiałami pending i denied.

## Przepływ danych

1. `prepareLocalArticles()` waliduje rejestry i hashe, a następnie przekazuje dalej wyłącznie zatwierdzone, widoczne wpisy, zaakceptowane relacje, mapy i rastrowe assety.
2. Oddzielna konfiguracja `wiki-production.config.cjs` renderuje te DTO w dedykowanych szablonach `production/site/`. Nie wczytuje całego drzewa Eleventy, folderów vaulta, demo ani plików `.obsidian`.
3. Wyszukiwarka korzysta z renderowanego tekstu zatwierdzonych wpisów; graf zawiera wyłącznie jawne relacje z rejestru. Nie tworzy krawędzi z samych wikilinków.
4. Sitemapę buduje się z zatwierdzonych tras, a RSS wyłącznie z zatwierdzonych dat `published_at`. Brak dat daje pusty, poprawny kanał.
5. Wszystkie kanały oraz assety trafiają do tego samego odizolowanego katalogu stagingowego.

## Walidacja wyniku

`production-output.cjs` wymaga dokładnego zestawu oczekiwanych tras i plików, odrzuca symlinki i pliki specjalne, sprawdza lokalne referencje HTML, poprawność zakresu search/graph/sitemap/feed, tryb `noindex` oraz hashe zatwierdzonych assetów i plików runtime. Nieznany lub brakujący plik blokuje wynik. Osobny manifest SHA-256 zapisuje się poza katalogiem strony.

Ostatni lokalny wynik miał 65 plików: 38 tras, 28 rekordów wyszukiwarki, 28 węzłów grafu, 17 zatwierdzonych assetów i zero wpisów feedu. Pięć denied oraz pending nie otrzymały żadnej trasy ani rekordu. To liczby z aktualnej walidacji, a nie stałe projektu.

## Zakres i pozostałe bramki

- Motyw Dark Archive działa bez niezarejestrowanych dekoracji. Banner DragonBanner i maska Bekrita nie są dołączane do tego buildu, dopóki nie będą zatwierdzonymi assetami w kontrolowanym rejestrze.
- Adapter dopuszcza obecnie wyłącznie obsługiwany, sanitizowany Markdown i zweryfikowane assety rastrowe. HTML, Canvas, Bases, Dataview i nierozpoznane zależności nadal fail-closed.
- Konfiguracja akceptuje HTTPS `PUBLICATION_SITE_URL`; przed wdrożeniem należy dodać allowlistę produkcyjnej domeny i sprawdzić kanoniczne hosty.
- Trzeba osobno przejrzeć techniczny kod, szablony, CSS/JS, zależności i Vercelowe kanały cache. Hash runtime w bieżącym buildzie chroni spójność katalogu, ale sam nie stanowi decyzji audytowej.
- Przed realnym produkcyjnym buildem należy ustanowić certyfikat kanałów/konfigurację release, która jawnie zatwierdza ten renderer, wynik i hosting. Do tego czasu obecna bramka pozostaje bezwarunkowa.

Testy tej iteracji: `wiki:test` 19/19, `publication:test` 65/65, walidator katalogu 5/5, build preview PASS i przeglądarkowy smoke test desktop/mobile PASS. Pełna `publication:validate` pozostaje zablokowana (65 pending, 5 denied). Nie uruchamiano legacy production build, pushu ani deploymentu.

Historycznie widok katalogu przedmiotów pomijał wpis `entry-ea1ef23a3438fa49ba3d` (Bekrit’s Mask) wyłącznie na poziomie prezentacji. Decyzję tę zastąpiło wycofanie publikacji opisane w aktualizacji z 2026-10-24 poniżej.

## Wycofanie Bekrit’s Mask — 2026-10-24

Na prośbę DM cofnięto aktywne zgody dla artykułu Bekrit’s Mask i używanej wyłącznie przez niego karty. Wpis oraz asset mają jawny status `denied`; źródłowe pliki pozostały w repozytorium. Generator publikacyjny nie tworzy permalinku `/przedmioty/bekrits-mask/`, wpisu wyszukiwarki ani pliku obrazu. Usunięto też nieaktualną regułę ukrywania tylko w katalogu przedmiotów.

Weryfikacja lokalna: `publication:build` PASS (36 tras, 26 wpisów wyszukiwania/grafu, 17 assetów); kontrola artefaktu potwierdziła brak trasy, obrazu i referencji slug; `publication:test` 75/75 PASS, `wiki:build` PASS, `wiki:test` 20/20 PASS. Zmiana wymaga nowego deploymentu Vercel, aby wejść na Production.

## Audyt wydania Vercel — 2026-10-24

Audyt techniczny, lista dwóch assetów oczekujących na osobną decyzję DM, testy i procedura staging/release/rollback są opisane w [VERCEL_RELEASE_AUDIT.md](VERCEL_RELEASE_AUDIT.md). Ocena pozostaje **NO-GO dla Vercel**.

Walidator katalogu sprawdza teraz origin sitemap/feed, HTML `srcset` i CSS `url()` w ramach dokładnej allowlisty outputu. Generator odrzuca `PUBLICATION_SITE_URL` spoza `https://fundelverwiki.vercel.app`. Dark Archive używa DragonBanner jako bannera i logo tylko wtedy, gdy zatwierdzony adapter zawiera dokładnie ten asset; pending maska nie jest wyświetlana.

Stan zależności zweryfikowano na Node 24.22.0/npm 11.19.1 (`npm ls --depth=0` bez braków); Node 22.x z `npm ci` pozostaje wymaganym krokiem przed release. `vercel.json` nadal wskazuje zablokowany legacy `npm run build`; nie ma komendy release ani konfiguracji Vercel staging/cache. Nie zmieniono `assertProductionBuildAllowed()`.

Najnowsze lokalne wyniki: `publication:test` 70/70, `wiki:test` 19/19, `publication:build-preview` PASS (65 plików, 38 tras, 28 search, 28 graph, 17 zatwierdzonych assetów, 0 wpisów RSS). Potwierdzono, że output nie zawiera nowych pending grafik ani ich referencji, wszystkie 39 HTML zachowują noindex, a `robots.txt` ma `Disallow: /`. Pełne `publication:validate` nadal poprawnie blokuje: 67 `UNAPPROVED_INPUT`, 5 `DENIED_INPUT`.
Korekta zakresu powyżej: po audycie generator odrzuca każdy host poza `https://fundelverwiki.vercel.app`. DragonBanner i maska Bekrita są nadal pending i pominięte; zatwierdzony DragonBanner zostanie warunkowo użyty jako banner/logo, natomiast maska nie należy do aktywnego motywu.
## Aktualizacja po decyzji DM — 2026-10-24

DM zatwierdził DragonBanner i maskę Bekrita osobno w istniejącym przepływie recenzji. Oba aktywne wpisy w `src/wiki/public-assets.json` mają zgodne hashe źródła; DragonBanner jest dostępny dla bannera i logo Dark Archive, a maska jest zatwierdzonym assetem poza aktywnym motywem. Podgląd zawiera obie grafiki jako zatwierdzone zasoby.

Po decyzji: `publication:build-preview` PASS (67 plików, 38 tras, 28 search, 28 graph, 19 zatwierdzonych assetów, 0 wpisów RSS), `publication:test` 70/70 PASS, `wiki:test` 19/19 PASS. Walidacja kompletnego repozytorium nadal blokuje wydanie: 65 pending i 5 denied. Te zgody nie certyfikują generatora ani Vercel; produkcyjna blokada i ocena NO-GO pozostają bez zmian.

## Produkcyjny tryb istniejącego generatora — 2026-10-24

`npm run publication:build-preview` pozostaje lokalnym preview z `noindex,nofollow` i `Disallow: /`. Nowa komenda `npm run publication:build` uruchamia ten sam `prepareLocalArticles()`, szablony i walidator w jawnie wybranym trybie produkcyjnym; nie przechodzi przez stary Digital Garden build. Do katalogu `.publication-build/production` trafia wyłącznie wynik zatwierdzonego DTO. Pending i denied zostają w źródłach i rejestrach, ale nie dostają tras ani danych w kanałach.

W trybie produkcyjnym każda strona otrzymuje canonical na `https://fundelverwiki.vercel.app` zgodny z istniejącym permalinkiem. `robots.txt` pozwala indeksować i wskazuje `/sitemap.xml`; meta `noindex` jest zabronione. Ten sam output guard wymaga dokładnego zestawu tras i plików, porównuje search/graph/feed/sitemap z zatwierdzonym modelem oraz weryfikuje hash assetów i runtime. Preview zachowuje wcześniejsze wymagania noindex.

`vercel.json` wskazuje `npm ci`, `npm run publication:build` i `.publication-build/production`, zachowuje dotychczasowe reguły routingu i dodaje cache `max-age=0, must-revalidate`. Node `22.x` jest zadeklarowany w `package.json` i będzie wyborem Vercel; lokalny build tej zmiany uruchomiono na Node 24.22.0. Nie zmieniano projektu ani domeny w panelu Vercel. Zmiana konfiguracji zadziała w Vercel po następnym deploymentcie; w tej iteracji nie wykonano pushu ani deploymentu.

Odbiór: build produkcyjny PASS (67 plików, 38 tras, 39 canonical HTML, 28 rekordów search i graph, 19 assetów, 11 markerów atlasu Neverwinter), `publication:test` 72/72 PASS, `wiki:test` 19/19 PASS. Walidacja pełnego repozytorium nadal BLOCKED: 65 pending, 5 denied; generator nie przyznaje im zgód ani nie ujawnia ich danych.
