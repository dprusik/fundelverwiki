# Fundelver Wiki — zasady pracy agentów

## Delegowanie

Główny Codex koordynuje pracę i łączy wyniki w jeden raport. Przy złożonych zadaniach deleguj tylko te niezależne przeglądy, w których osobna analiza wnosi realną wartość; nie uruchamiaj wszystkich agentów do drobnych zmian. Subagenci audytowi zwracają ustalenia zamiast równolegle edytować te same pliki. Instrukcja read-only opisuje oczekiwany sposób pracy, ale sama nie stanowi technicznej gwarancji sandboxa — obowiązują ustawienia uprawnień sesji. Nie wykonuj automatycznych commitów, push ani deploymentów.

Wyspecjalizowane role znajdują się w `.codex/agents/`: `publication_auditor`, `ui_reviewer` i `test_engineer`.
