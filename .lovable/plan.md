

# Audit détaillé — Menu "Données foncières" (Analytics)

## A. Données non fetchées (graphiques toujours vides)

| # | Problème | Bloc | Impact |
|---|----------|------|--------|
| 1 | **`lease_type` absent de `land_title_requests`** — La table DB n'a pas de colonne `lease_type`, or le bloc Titres fonciers affiche un graphique "Type bail" avec `countBy(filtered, 'lease_type')`. Ce graphique sera **toujours vide**. | TitleRequestsBlock | Graphique mort |
| 2 | **`construction_materials`, `standing`, `construction_year`, `floor_number`** non fetchés pour `land_title_requests` — Ces colonnes existent en DB mais le SELECT (ligne 68) ne les inclut pas. | TitleRequestsBlock | Données disponibles mais non exploitées |
| 3 | **`property_category`** non fetchée pour `land_title_requests` — Existe en DB via `construction_type` mais aucun graphique catégorie dans ce bloc. | TitleRequestsBlock | Absent |
| 4 | **`lease_years`** non fetchée pour `cadastral_contributions` — La colonne existe mais n'est pas dans le SELECT. | ContributionsBlock | Aucune analyse de durée de bail |
| 5 | **`permit_type`** non fetchée pour `cadastral_building_permits` — La colonne n'existe pas en DB. Le bloc déduit le type via `permit_number` (heuristique fragile). | BuildingPermitsBlock | Résultat approximatif |

## B. Variables croisées manquantes

| # | Graphique | Cross-variables absentes |
|---|-----------|--------------------------|
| 6 | Parcelles > `property-category` | Pas de cross-variables dans le registre (absent de `crossVariables.ts` pour `parcels-titled`) |
| 7 | Parcelles > `construction-materials` | Idem — absent du registre |
| 8 | Parcelles > `standing` | Idem |
| 9 | Parcelles > `subdivided` | Idem |
| 10 | Contributions > `property-category` | Absent du registre `contributions` |
| 11 | Building Permits > `permit-type` | Absent du registre `building-permits` |

## C. Métriques dérivées absentes (moyennes, ratios, pourcentages)

| # | Métrique manquante | Bloc |
|---|-------------------|------|
| 12 | **Surface moyenne par parcelle** (`totalSurface / count`) — KPI disponible mais pas affiché | Parcelles |
| 13 | **Densité parcellaire** (parcelles/hectare) — Métrique clé pour l'urbanisme, absente | Parcelles |
| 14 | **Taux de recouvrement fiscal** (`montant payé / montant total`) | Taxes |
| 15 | **Montant moyen des taxes** — Ni KPI ni graphique | Taxes |
| 16 | **Revenu moyen par hypothèque** — `avgField` disponible mais non utilisé | Hypothèques |
| 17 | **Durée moyenne des hypothèques** (mois) — Données disponibles, pas de KPI | Hypothèques |
| 18 | **Taux de rejet** (% rejetées/total) — Absent des KPI Titres, Mutations, Subdivisions | Titres, Mutations, Subdivisions |
| 19 | **Surface bâtie moyenne** via `building_shapes` — Données JSONB collectées mais jamais exploitées | Parcelles/Expertise |
| 20 | **Hauteur moyenne des constructions** via `building_shapes[].heightM` — Idem | Parcelles |

## D. Incohérences logiques

| # | Problème |
|---|----------|
| 21 | **`TitleRequestsBlock` affiche "Type bail" mais `land_title_requests` n'a pas `lease_type`** — Le graphique est structurellement cassé. Il faudrait soit ajouter la colonne en DB, soit supprimer le graphique, soit le baser sur les parcelles liées. |
| 22 | **`BuildingPermitsBlock` déduit `permit_type` du `permit_number`** (lignes 36-43) — Heuristique fragile basée sur la présence de "reg"/"régul" dans le numéro. Si le numéro ne contient pas ce mot-clé, tout est classé "Construction" par défaut. |
| 23 | **`TaxesBlock` — statuts mixtes** — Le filtre payé utilise `'paid' || 'payé'` et en attente `['pending', 'en_attente', 'unpaid']`. Si la DB a d'autres variantes, les KPI seront faux. Pas de normalisation comme dans `BuildingPermitsBlock`. |
| 24 | **`MortgagesBlock` — statuts mixtes** — `'paid' || 'soldée'` pour le KPI "Soldées". Même problème de normalisation manquante. |
| 25 | **`OwnershipHistoryBlock` — durée calculée avec `Date.now()`** — Pour les propriétaires actifs (sans `ownership_end_date`), la durée est calculée par rapport à "maintenant", ce qui biaise la moyenne avec le temps. |

## E. Redondances

| # | Problème |
|---|----------|
| 26 | **Parcelles vs Contributions** — Les graphiques `title-type`, `legal-status`, `usage`, `construction-type`, `property-category` existent dans les deux blocs avec les mêmes normaliseurs. Après approbation, les données se retrouvent dans les deux tables → double comptage. |
| 27 | **`evolution` + `revenue-trend`** dans le même bloc — Titres, Mutations, Subdivisions, Factures ont les deux. Ce sont essentiellement deux area charts similaires (volume vs montant). |
| 28 | **Boilerplate identique dans 14 blocs** — Le pattern `MapProvinceContext` + `useEffect` + `filterLabel` + `useTabChartsConfig` est copié-collé dans chaque bloc (~15 lignes identiques). Pourrait être un hook partagé `useBlockSetup(TAB_KEY, data)`. |

## F. Données fictives / non alimentées

| # | Problème |
|---|----------|
| 29 | **`fraud_attempts`** — Aucun mécanisme fonctionnel ne crée des lignes dans cette table en production. Le bloc "Fraude" affiche potentiellement des données de test/seed uniquement. |
| 30 | **`cadastral_invoices.geographical_zone`** — Non alimenté dynamiquement. Le graphique "Zone géographique" montre des données vides ou fictives. |
| 31 | **`MutationBlock` — `market_value_usd` et `title_age`** — Le code accède à `(r as any).market_value_usd` et `(r.proposed_changes as any)?.market_value_usd`, mais `proposed_changes` n'est pas fetchée dans le SELECT. Les graphiques "Valeur vénale" et "Ancienneté titre" seront vides. |
| 32 | **`MutationBlock` — `late_fee_amount`** — Même problème : non fetchée, graphique "Retard mutation" vide. |

## G. Optimisations

| # | Proposition |
|---|-------------|
| 33 | **Hook `useBlockSetup`** — Factoriser le boilerplate commun (context, filter, config, filterLabel) en un hook réutilisable. ~15 lignes × 14 blocs = 210 lignes de code mort. |
| 34 | **Lazy loading par onglet** — Le hook charge 14 tables simultanément même si un seul onglet est consulté. Découper en requêtes individuelles par onglet actif. |

---

## Plan de corrections

### Priorité 1 — Graphiques cassés (données inaccessibles)

**`useLandDataAnalytics.tsx`** :
- `land_title_requests` SELECT : ajouter `construction_materials, standing, construction_year, floor_number, property_category` (Note : ne PAS ajouter `lease_type` car la colonne n'existe pas dans cette table)
- `mutation_requests` SELECT : ajouter `proposed_changes, market_value_usd, late_fee_amount, title_age` (vérifier existence en DB)

**`TitleRequestsBlock.tsx`** :
- Supprimer le graphique `lease-type` (la table `land_title_requests` n'a pas de colonne `lease_type`)
- Ajouter graphiques `property-category`, `construction-materials`, `standing`

**`crossVariables.ts`** :
- Ajouter les entrées manquantes pour `property-category`, `construction-materials`, `standing`, `subdivided` dans `parcels-titled`
- Ajouter `property-category` dans `contributions`
- Ajouter `permit-type` dans `building-permits`

### Priorité 2 — KPI dérivés manquants

**`ParcelsWithTitleBlock.tsx`** :
- Ajouter KPI `kpi-avg-surface` : Surface moyenne (totalSurface / count)
- Ajouter KPI `kpi-density` : Densité (parcelles/ha)

**`TaxesBlock.tsx`** :
- Ajouter KPI `kpi-recovery` : Taux de recouvrement (payé / total)
- Ajouter KPI `kpi-avg` : Montant moyen

**`MortgagesBlock.tsx`** :
- Ajouter KPI `kpi-avg-amount` : Montant moyen
- Ajouter KPI `kpi-avg-duration` : Durée moyenne

### Priorité 3 — Normalisation des statuts

**`TaxesBlock.tsx`** : Ajouter une fonction `statusNorm` comme dans `BuildingPermitsBlock`
**`MortgagesBlock.tsx`** : Ajouter une normalisation des statuts

### Priorité 4 — Nettoyage

- Supprimer graphiques vides dans `MutationBlock` (`market-value`, `title-age`, `late-fees`) si les colonnes n'existent pas en DB
- Supprimer `lease-type` du registre `useAnalyticsChartsConfig.ts` pour `title-requests`
- Documenter le statut fictif de `fraud_attempts` et `geographical_zone`

**Impact total** : ~80 lignes modifiées dans 7 fichiers.

