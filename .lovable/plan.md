

# Audit du mode test — Résultats

## Problèmes identifiés

### Bug 1 — `AdminDisputeAnalytics` : filtre par `'signalement'`/`'levee'` au lieu de `'report'`/`'lifting'`
**Fichier** : `AdminDisputeAnalytics.tsx` lignes 66-67, 112
**Problème** : Les formulaires (`LandDisputeReportForm`, `LandDisputeLiftingForm`) et le test data insèrent `dispute_type = 'report'` ou `'lifting'`. Mais `AdminDisputeAnalytics` filtre par `'signalement'` et `'levee'` → les KPIs "Signalements" et "Levées" affichent toujours **0**, et le graphique de tendance mensuelle est entièrement faux (tout est compté comme "signalements" dans le `else`).
**Correction** : Remplacer `'signalement'` par `'report'` et `'levee'` par `'lifting'`.

### Bug 2 — `nationality` dans `generateTitleRequests` : `'RDC'`/`'Belgique'`/`'France'` au lieu de `'congolais'`/`'etranger'`
**Fichier** : `testDataGenerators.ts` ligne 497, 520
**Problème** : Le formulaire (`LandTitleRequestDialog`) utilise `NATIONALITY_OPTIONS` avec les valeurs `'congolais'` et `'etranger'` (cf. `landTitleDeduction.ts`). Le test génère `'RDC'`, `'Belgique'`, `'France'` → le graphique "Nationalité" dans `TitleRequestsBlock` ne matche jamais les données réelles.
**Correction** : Utiliser `['congolais', 'congolais', 'congolais', 'congolais', 'congolais', 'congolais', 'congolais', 'congolais', 'etranger', 'etranger']`.

### Bug 3 — `construction_year` incohérent entre `generateParcels` et `generateContributions`
**Fichier** : `testDataGenerators.ts` lignes 189 vs 242
**Problème** : Parcelles utilisent `randInt(1990, 2024)` (aléatoire), contributions utilisent `seededInt(idx * 11 + 1, 1990, 2024)` (déterministe). Pour la même parcelle, les deux tables auront des années de construction différentes.
**Correction** : Utiliser `seededInt` dans les deux fonctions avec la même formule de seed.

### Bug 4 — `whatsapp_number` incohérent entre parcelles et contributions
**Fichier** : `testDataGenerators.ts` lignes 196 vs 279
**Problème** : Les deux fonctions appellent `randInt()` indépendamment → numéros différents pour la même parcelle.
**Correction** : Utiliser `seededInt` avec un seed commun.

### Bug 5 — `lease_type` absent des contributions
**Fichier** : `testDataGenerators.ts` (generateContributions)
**Problème** : Le champ `lease_type` est généré pour les parcelles (ligne 192) mais jamais pour les contributions. Le formulaire CCC le lit/écrit (`useCCCFormState.ts` ligne 1075), et il est affiché dans `AdminCCCContributions` (ligne 1113) et utilisé dans les analytics (`ParcelsWithTitleBlock`).
**Correction** : Ajouter `lease_type` aux contributions avec la même logique.

### Bug 6 — `expertise_payments` sans batching
**Fichier** : `testDataGenerators.ts` lignes 674-680
**Problème** : Insère tous les records (351+) en un seul appel. Avec le volume actuel (~351 expertises), cela peut dépasser les limites payload de Supabase.
**Correction** : Ajouter le batching par 50 comme les autres fonctions.

### Bug 7 — `boundary_history` limité à 10 parcelles fixes
**Fichier** : `testDataGenerators.ts` ligne 932
**Problème** : `.slice(0, 10)` — seulement 10 bornages, indépendamment des 7 020 parcelles. Disproportionné par rapport aux autres sous-tables qui utilisent ~8-15%.
**Correction** : Supprimer le `.slice(0, 10)`, utiliser `i % 15 === 0` (~7%) et ajouter du batching.

### Bug 8 — `fraud_attempts` sans batching
**Fichier** : `testDataGenerators.ts` lignes 793-796
**Problème** : Insère tous les records en un seul appel. Avec 52 records c'est acceptable, mais incohérent avec le pattern des autres fonctions.
**Correction mineur** : Ajouter le batching pour cohérence.

### Bug 9 — `certificates` sans batching
**Fichier** : `testDataGenerators.ts` lignes 1048-1051
**Problème** : Même problème que fraud_attempts.

## Résumé des corrections

| # | Fichier | Correction |
|---|---------|------------|
| 1 | `AdminDisputeAnalytics.tsx` | `'signalement'`→`'report'`, `'levee'`→`'lifting'` |
| 2 | `testDataGenerators.ts` | nationality: `'RDC'`→`'congolais'`, `'Belgique'`/`'France'`→`'etranger'` |
| 3 | `testDataGenerators.ts` | Synchroniser `construction_year` avec `seededInt` dans `generateParcels` |
| 4 | `testDataGenerators.ts` | Synchroniser `whatsapp_number` avec `seededInt` |
| 5 | `testDataGenerators.ts` | Ajouter `lease_type` à `generateContributions` |
| 6 | `testDataGenerators.ts` | Ajouter batching à `generateExpertisePayments` |
| 7 | `testDataGenerators.ts` | Proportionnaliser `boundary_history` (~7%) + batching |
| 8-9 | `testDataGenerators.ts` | Ajouter batching à `fraud_attempts` et `certificates` |

