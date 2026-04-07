
# Audit détaillé — Mode Test (Admin > Système)

## A. Architecture — Constat positif

Le mode test repose sur une architecture solide :
- ✅ Isolation par préfixe `TEST-` dans les numéros de parcelle/référence
- ✅ Routes dédiées `/test/*` via `TestEnvironmentProvider`
- ✅ Helper `applyTestFilter` appliqué dans 13 composants pour séparer test/production
- ✅ RPC côté serveur (`cleanup_all_test_data`, `count_test_data_stats`) pour éviter les limites client
- ✅ Rollback en cas d'échec pendant la génération (FK-safe)
- ✅ Batching par 50 pour les insertions massives
- ✅ Progression pas-à-pas avec UI (`GenerationProgress`)
- ✅ Cron quotidien configuré (`cleanup-test-data-daily` à 3h)
- ✅ Audit log systématique (`TEST_MODE_ENABLED`, `TEST_DATA_GENERATED`)

## B. Problèmes identifiés

### B1. Données analytics NON filtrées en mode test

| # | Problème | Impact |
|---|----------|--------|
| 1 | **`useLandDataAnalytics.tsx` ne filtre PAS les données TEST-** — Le hook `fetchAll` charge toutes les lignes sans `applyTestFilter`. Les 7 020 parcelles de test apparaissent dans les graphiques de production (onglet "Données foncières"). | **Critique** — Pollution des analytics en production |
| 2 | **`DRCInteractiveMap` ne filtre pas les données TEST-** — La carte RDC en production affiche les données test (les tooltips province incluent les compteurs TEST-). | **Élevé** — Fausse l'analyse géographique |

### B2. Nettoyage automatique — Fonctionnalité fictive

| # | Problème | Impact |
|---|----------|--------|
| 3 | **Le cron appelle une Edge Function `cleanup-test-data`** mais utilise la clé **anon** (`role: anon`) dans le header Authorization. L'Edge Function exige un JWT admin (vérification rôle). Le cron **ne peut pas fonctionner** car la clé anon n'est pas admin. | **Critique** — Le nettoyage automatique est inactif |
| 4 | **Le paramètre `test_data_retention_days` est affiché et configurable mais jamais utilisé** — Ni le cron, ni l'Edge Function, ni le RPC `cleanup_all_test_data` ne prennent en compte la durée de rétention. Toutes les données TEST- sont supprimées à chaque exécution. | **Moyen** — Paramètre fictif |

### B3. Générateur de données — Lacunes d'alignement

| # | Problème | Impact |
|---|----------|--------|
| 5 | **`generateTitleRequests` ne génère pas `construction_materials`, `standing`, `floor_number`, `construction_year`** pour les demandes de titres. Ces champs ont été récemment ajoutés au SELECT analytics mais les données test ne les remplissent pas → graphiques "Matériaux" et "Standing" vides dans l'onglet Titres. | **Moyen** — Graphiques vides en test |
| 6 | **`generateBuildingPermits` ne génère pas de statut `En attente`** — Seuls `Approuvé` et `Rejeté` sont utilisés. Le KPI "En attente" sera toujours à 0. | **Faible** — Couverture incomplète |
| 7 | **`generateTaxHistory` utilise `'unpaid'` comme statut** mais `TaxesBlock.statusNorm` normalise vers `'pending'` pour `['pending', 'en_attente', 'unpaid', 'impayé']`. Fonctionnel mais inconsistant avec les données CCC réelles qui utilisent "En attente". | **Faible** — Incohérence stylistique |
| 8 | **`generateMortgages` utilise `'Renégociée'`** — `MortgagesBlock.statusNorm` ne reconnaît pas ce statut (uniquement `active`/`paid`). Les hypothèques "Renégociée" tombent dans "Autre". | **Faible** — Statut non normalisé |
| 9 | **`rollbackTestData` utilise `.in()` avec potentiellement 7 020 parcel_numbers** — Dépasse la limite d'URI de Supabase. En cas d'erreur pendant la génération, le rollback peut échouer silencieusement. | **Moyen** — Rollback fragile |

### B4. Interface admin — Points d'amélioration

| # | Problème | Impact |
|---|----------|--------|
| 10 | **Pas d'indicateur de durée de génération** — La génération de 7 020 parcelles prend 30-60 secondes. Aucun timer visible. | **Faible** — UX |
| 11 | **Le bouton "Régénérer" est désactivé quand `total === 0`** mais le bouton "Générer" n'existe pas séparément. Si les données ont été supprimées manuellement, l'admin ne peut pas relancer la génération sans toggler le mode test off/on. | **Moyen** — Workflow bloquant |
| 12 | **Pas de comptage par province** dans les stats — L'admin voit le total par table mais pas la répartition géographique. | **Faible** — Info manquante |

### B5. Sécurité

| # | Problème | Impact |
|---|----------|--------|
| 13 | **La clé anon est en clair dans le cron job** — Exposée dans `cron.job.command`. Pas critique (c'est la clé publique) mais mauvaise pratique. | **Faible** — Hygiène |

## C. Plan de corrections

### Priorité 1 — Filtrer les données TEST- dans les analytics (critique)

**Fichier** : `src/hooks/useLandDataAnalytics.tsx`
- Dans `fetchAll`, ajouter un filtre global qui exclut les lignes `TEST-%` pour les tables qui utilisent `parcel_number` ou `reference_number`
- Concrètement : chaque appel `fetchAll` doit passer un filtre `.not('parcel_number', 'ilike', 'TEST-%')` (ou `reference_number` selon la table)

### Priorité 2 — Aligner le générateur avec les données CCC

**Fichier** : `src/components/admin/test-mode/testDataGenerators.ts`
- `generateTitleRequests` : ajouter `construction_materials`, `standing`, `floor_number`, `construction_year`
- `generateBuildingPermits` : ajouter le statut `'En attente'` dans le cycle
- `generateMortgages` : remplacer `'Renégociée'` par `'Soldée'` pour aligner avec `statusNorm`

### Priorité 3 — Ajouter un bouton "Générer" indépendant

**Fichier** : `src/components/admin/test-mode/TestDataStatsCard.tsx`
- Ajouter un bouton "Générer" visible quand `total === 0` et le mode test est actif

### Priorité 4 — Documenter les limitations

- Le nettoyage automatique via cron est non fonctionnel (clé anon, pas de gestion rétention)
- `rollbackTestData` est fragile pour les gros volumes

**Impact total** : ~40 lignes modifiées dans 3 fichiers.
