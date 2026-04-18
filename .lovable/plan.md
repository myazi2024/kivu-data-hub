

## Audit détaillé — Espace admin "Vue d'ensemble"

### Périmètre
3 vues × ~4 360 LOC + 3 hooks + 1 RPC `get_admin_statistics`.

| Vue | LOC | Hooks | État |
|---|---|---|---|
| `AdminDashboardOverview` (Dashboard) | 461 + 13 sous-comp. (~1 800) | `useAdminStatistics`, `useDashboardData`, `useEnhancedAnalytics`, `usePeriodFilter` | KPIs faux (test data), incohérence multi-source |
| `AnalyticsDashboard` | 484 + 8 sous-comp. | `useAdvancedAnalytics` | Doublon logique, pas de cache |
| `AdminAnalyticsChartsConfig` | 707 monolithique | `useAnalyticsChartsConfig` | Audité ailleurs (déjà OK) |

---

### A. Bugs & incohérences (P0)

1. **Pollution test data dans tous les KPIs** — `cadastral_invoices` contient 1 170 lignes, **toutes `TEST-%`** (10 429 $ "payé", 6 874 $ "pending"). `get_admin_statistics`, `useDashboardData` n'excluent pas → revenus, conversion, top performers tous faux. Seul `useEnhancedAnalytics` filtre.
2. **Triple source de vérité** — KPIs (RPC), Advanced Metrics (`useDashboardData`), Business (`useEnhancedAnalytics`) recalculent revenus/conversion de 3 manières différentes ⇒ chiffres divergents sur la même page.
3. **Période ignorée** — `useEnhancedAnalytics` accepte `startDate/endDate` mais 5 requêtes sur 7 ne les utilisent pas (LTV, churn, cohortes, zones). Filtre période = inopérant pour l'onglet Business.
4. **`total_users` non périodisé** — RPC overview retourne *tous* les profils, mais le front calcule `change vs période précédente` → delta toujours 0 %.
5. **`pending_payments`** — RPC = somme USD ; UI affiche "X à traiter" comme un compte. Label trompeur.
6. **Inactive resellers** — `.select('reseller_id').lt(...).length` au lieu de `count distinct` → surcompte.
7. **PII fuite** — `topUsers` expose `client_email` brut côté client sans masquage.

### B. Performance (P1)

8. `useDashboardData` : **11 requêtes** plein-table (limit 1000 implicite) à chaque changement de période, sans React Query, pas de cache, recalcul JS de tous les agrégats côté client.
9. RPC `get_admin_statistics` génère `generate_series` × `LEFT JOIN cadastral_invoices` sans index sur `created_at::date` → coût élevé sur > 12 mois.
10. `AnalyticsDashboard` duplique 5 requêtes du dashboard → double charge réseau en navigation.
11. Dashboard rerender complet à chaque tick de date custom (pas de debounce sur `onCustomStartDateChange`).

### C. UX & fonctionnel (P1)

12. Pas de **toggle "Exclure données test"** alors que c'est le bug #1.
13. Pas de **bouton Refresh** global (seuls Export CSV/JSON présents).
14. Pas de **comparaison YoY** ni **moyenne mobile 7 j** sur le graphique revenus.
15. **Drill-down absent** : cliquer une carte KPI n'ouvre pas la vue détaillée correspondante.
16. **URL non partageable** : période et onglet (`overview/business/comparative/cohort/reports`) ne sont pas dans l'URL.
17. `Recent Activity` : pas de filtre par type, pas de pagination, mélange 3 listes de 10.
18. `AlertsPanel` : seuils figés (7 j retard, 30 j inactif) → devraient lire `system_settings`.
19. `cccUsageRate` divise par codes créés *dans la période* alors que la base = codes actifs/non expirés.
20. Onglet "Vue d'ensemble" du dashboard a **lui-même** un sous-onglet "Vue d'ensemble" (confusion sémantique).

### D. Architecture & dette (P2)

21. `AdminDashboardOverview` 461 lignes monolithique → extraire `KPICards`, `RevenueChart`, `DashboardTabs`.
22. `AdminAnalyticsChartsConfig` 707 lignes — déjà couvert par audit précédent, pas re-traité ici.
23. Pas de typage des résultats RPC (`as any` ×8).
24. Pas de **gestion d'erreur visible** (toast destructif mais pas de fallback d'état).
25. `useAdminStatistics` recrée 5 instances pour 5 stat_types → 5 round-trips. Une RPC unique `get_admin_overview_full` consoliderait.

### E. Sécurité (P0)

26. `topUsers` côté front contient `client_email` → ajouter masquage (`m***@domain.tld`) ou retourner `user_id` + lookup via RPC PII paid model.
27. RPC valide bien `has_any_role(['admin','super_admin'])` ✅.

---

### Plan d'action proposé

**Lot 1 — P0 (corrections critiques)**
- Migration : RPC `get_admin_statistics` ajout `_exclude_test BOOLEAN DEFAULT true`, filtre `parcel_number NOT ILIKE 'TEST-%'` sur toutes les agrégations factures/contributions/codes.
- Hook `useDashboardData` : même filtre + `count: exact, head: true` partout où applicable.
- Toggle UI "Inclure données de test" (off par défaut), persisté dans `system_settings`.
- Hook unifié `useDashboardKPIs` consolidant les 3 sources → une seule source de vérité.
- `pending_payments` → renvoyer `count` + `sum_usd` séparés, UI affiche "X factures · Y $".
- `total_users` → calculer aussi `new_users_period` pour delta cohérent.
- Masquage PII `topUsers` (front + RPC).
- Inactive resellers : `count distinct` via RPC.

**Lot 2 — P1 (performance & UX)**
- Migration consolidée : RPC unique `get_admin_dashboard_full(start, end, exclude_test)` → 1 round-trip JSON complet (KPIs + revenue + alerts + tops).
- React Query (déjà installé) avec cache 60 s + bouton Refresh visible.
- Période + onglet dans URL (`?period=30days&tab=business`).
- `useEnhancedAnalytics` : appliquer réellement startDate/endDate sur LTV/zones/cohortes.
- Drill-down : chaque KPI card → `navigate('/admin?tab=...')`.
- Chart revenus : ligne MA(7) + comparatif YoY pointillé.
- Index BD : `CREATE INDEX cadastral_invoices_status_created_idx ON cadastral_invoices(status, created_at) WHERE parcel_number NOT ILIKE 'TEST-%';`.
- Debounce 400 ms sur date custom.

**Lot 3 — P2 (qualité)**
- Découpe `AdminDashboardOverview` en 4 fichiers (≤ 200 lignes).
- Types stricts sur tous les retours RPC.
- Renommage onglet inner "Vue d'ensemble" → "Croissance & zones".
- Seuils alertes lus depuis `system_settings` (réutilise mécanisme sous-lot 2).
- `cccUsageRate` basé sur codes actifs (cohérence métier).
- Tests Deno sur RPC `get_admin_dashboard_full`.

---

### Quel périmètre dois-je implémenter ?

- **(A) Lot 1 seul** — corrige les KPIs faux, unifie les sources, masque PII, sécurise. ~1 migration + 4 fichiers.
- **(B) Lots 1 + 2** — + RPC unifiée, React Query, drill-down, URL state, perfs. ~2 migrations + 8 fichiers.
- **(C) Plan complet (1+2+3)** — + découpe, typage strict, alertes paramétrables, tests. ~12 fichiers.
