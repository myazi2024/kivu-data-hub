

## Audit — Section "Vue d'ensemble" (admin)

### Périmètre audité (3 entrées sidebar)

| # | Entrée | Composant | État |
|---|---|---|---|
| 1 | Dashboard | `AdminDashboardOverview` | ✅ OK (refonte récente, RPC `get_admin_dashboard_full`) |
| 2 | Analytics | `AnalyticsDashboard` | 🔴 Bugs critiques (données simulées) |
| 3 | Config Graphiques | `AdminAnalyticsChartsConfig` | ✅ OK (récemment durci) |

### 🔴 Bugs critiques — `AnalyticsDashboard.tsx` (484 lignes)

| # | Problème | Ligne | Gravité | Impact |
|---|---|---|---|---|
| **B1** | **Activité utilisateurs simulée avec `Math.random()`** | 214-225 | 🔴 Critique | Le graphe « Activité Utilisateurs » affiche des **données fictives** — chaque rechargement change les valeurs. Trompeur pour l'admin. |
| **B2** | **Répartition territoriale codée en dur** avec ratios fixes (Kinshasa 22%, Nord-Kivu 18%, etc.) | 162-173 | 🔴 Critique | Le PieChart « Répartition Territoriale » n'est **jamais réel** — c'est un simple % du total. La province « Mai-Ndombe » et autres listées n'ont aucun lien avec les utilisateurs réels. |
| **B3** | `downloadGrowth` et `userGrowth` figés à `0` avec commentaire « Calculer si nécessaire » | 181-182 | 🟠 Élevé | Aucune indication de croissance réelle, contrairement à `revenueGrowth`. |
| **B4** | Aucun filtre `.lte('created_at', endDate)` — toujours « depuis startDate jusqu'à maintenant » | 78, 84, 90 | 🟠 Élevé | Comparaison période précédente faussée (chevauchement). |
| **B5** | `payments.amount_usd` lu sans coalescing (`?? 0`) → `NaN` si une ligne a `amount_usd` null | 113, 129 | 🟡 Moyen | KPIs financiers peuvent afficher `$NaN`. |
| **B6** | Pas de filtre `excludeTest` | global | 🟡 Moyen | Les commandes/utilisateurs TEST polluent les chiffres (vs `Dashboard` qui les exclut). |
| **B7** | Loading global plein écran (`min-h-dvh`) bloque toute la page tant qu'**une seule** requête n'a pas répondu | 227-233 | 🟡 Moyen | UX : pas de skeleton incrémental. |
| **B8** | XAxis `tick={{ fontSize: 6 }}` — police illisible | 357, 378 | 🟡 Moyen | Labels axes invisibles. |
| **B9** | `topPublications` cherche le `payment.publication_id` correspondant **au premier paiement** — un seul matching, pas une somme | 147 | 🟠 Élevé | Revenus top publications sous-estimés. |

### 🔴 Doublonnage architectural

`AnalyticsDashboard` (onglet Analytics) **réimplémente** ce que `AdminDashboardOverview` (onglet Dashboard) fait déjà mieux :
- KPIs revenus / utilisateurs / publications
- Comparatif période précédente
- Top performers
- Répartition zones (vraie via `top_zones` RPC)
- Onglet « Comparatif » et « Cohortes » (présents dans les 2 composants)

**Conséquence** : maintenance double, données discordantes (un onglet exclut TEST, l'autre non).

### ⚠️ `useAdvancedAnalytics` — problèmes connexes

- 8 `Promise.all` parallèles **sans cache React Query** → re-fetch complet à chaque changement de période
- Pas de `staleTime` ni d'invalidation
- Récupère `select('*')` sur `payments` → over-fetch

### 🟢 Ce qui fonctionne (à préserver)

- `AdminDashboardOverview` : RPC unifiée, période + comparaison, KPI cards, alerts panel ✅
- `AdminAnalyticsChartsConfig` : modes tabs/kpis/charts/filters/cross/sync, audit log ✅
- Onglets sous-composants Analytics (`PaymentAnalytics`, `CadastralAnalytics`, etc.) : alimentés par `useAdvancedAnalytics` (fiables, requêtes réelles)

---

### Plan correctif (priorisé)

#### 🔴 P1 — Éliminer les données fictives `AnalyticsDashboard`

**P1.1** — Remplacer `generateUserActivity` (Math.random) par une vraie agrégation `daily_active_users` :
```ts
// Group profiles + payments par jour réel
const userActivity = aggregateByDay(users, range, 'created_at');
```

**P1.2** — Remplacer la répartition territoriale hardcodée par les vraies données via `dashFull.top_zones` (RPC `get_admin_dashboard_full` déjà existante) — réutiliser le même pattern que `AdminDashboardOverview`.

**P1.3** — Calculer `downloadGrowth` et `userGrowth` via une 2e requête sur la période précédente (idem pattern `revenueGrowth`).

**P1.4** — Ajouter `.lte('created_at', endDate.toISOString())` sur les 5 requêtes Supabase concernées.

**P1.5** — Sécuriser : `payment.amount_usd ?? 0` partout.

**P1.6** — Corriger `topPublications` :
```ts
const sumByPub = payments.reduce((acc, p) => {
  acc[p.publication_id] = (acc[p.publication_id] ?? 0) + (p.amount_usd ?? 0);
  return acc;
}, {} as Record<string, number>);
// puis injecter dans publicationStats
```

**P1.7** — Police XAxis : `fontSize: 11` (au lieu de 6).

#### 🟠 P2 — Déduplication architecturale

**Option A (recommandée)** — Supprimer l'onglet « Vue d'ensemble » de `AnalyticsDashboard` et **rediriger** vers le `Dashboard` admin déjà unifié. Conserver uniquement les 8 onglets spécialisés (Paiements, Cadastral, Business, Territorial, Comparatif, Cohortes, Funnel, Prédictif).

**Option B** — Garder l'onglet mais le brancher 100% sur `useDashboardKPIs` (RPC unifiée) au lieu de réimplémenter.

#### 🟡 P3 — Performance `useAdvancedAnalytics`

- Migrer vers React Query (`useQuery` par sous-section, `staleTime: 60_000`)
- Sélectionner uniquement les colonnes nécessaires (au lieu de `*`)
- Ajouter sélecteur `excludeTest` partagé avec le Dashboard

#### 🟡 P4 — UX

- Skeletons par card au lieu du spinner plein écran
- Aligner le sélecteur de période d'`AnalyticsDashboard` avec celui du Dashboard (`PeriodFilter` partagé)
- Synchroniser `excludeTest` via `useDashboardSettings`

---

### Détails techniques

**Fichiers à modifier** :
- `src/components/analytics/AnalyticsDashboard.tsx` — refonte onglet "Vue d'ensemble" + corrections P1.1→P1.7
- `src/hooks/useAdvancedAnalytics.tsx` — migration React Query (P3)

**Aucune migration BD** nécessaire (les RPC `get_admin_dashboard_full`, `get_admin_statistics` existent déjà).

**Hors périmètre immédiat** :
- Refonte complète des 8 sous-onglets Analytics (Funnel/Prédictif sont déjà alimentés par vraies données)
- Fusion des onglets « Comparatif » dupliqués entre Dashboard et Analytics

### Priorités proposées

1. **P1 d'abord** (élimination données fictives) — impact crédibilité immédiat
2. **P2 (Option A)** — supprimer doublon Vue d'ensemble dans Analytics
3. **P3 + P4** en finition

Veux-tu que je traite **P1 + P2 (Option A)** d'abord ?

