

# Diagnostic complet du Mode Test — Couverture des données et optimisations

## Contexte

Le Mode Test génère actuellement 17 types d'entités. Cependant, l'application collecte des données dans **2 tables supplémentaires** consommées par les Analytics et les modules Admin qui ne sont pas couvertes. De plus, le nettoyage (manuel, rollback, cron) et les statistiques ne couvrent pas ces tables.

---

## Tables manquantes dans le Mode Test

### Entité 1 — `mutation_requests` (Demandes de mutation)

**Consommateurs** :
- `useLandDataAnalytics.tsx` L80-81 : `fetchAll('mutation_requests', ...)` — alimente les graphiques Analytics (type mutation, statut, montants, délais)
- `AdminMutationRequests.tsx` — module admin de gestion des demandes
- `Admin.tsx` L177-181 — compteur sidebar "Mutations en attente"

**Impact** : Les graphiques Analytics "Mutations" restent vides en mode test. L'admin ne peut pas tester le flux d'approbation/rejet des mutations.

**Champs requis** : `reference_number` (TEST-MUT-xxx), `parcel_number`, `parcel_id`, `mutation_type`, `requester_type`, `requester_name`, `status`, `payment_status`, `total_amount_usd`, `user_id`, `proposed_changes` (JSON), `fee_items` (JSON)

### Entité 2 — `subdivision_requests` (Demandes de lotissement)

**Consommateurs** :
- `useLandDataAnalytics.tsx` L82-83 : `fetchAll('subdivision_requests', ...)` — alimente les graphiques Analytics (nombre de lots, statuts, montants)
- `AdminSubdivisionRequests.tsx` — module admin complet
- `Admin.tsx` L208-212 — compteur sidebar "Lotissements en attente"

**Impact** : Les graphiques Analytics "Lotissements" restent vides en mode test. L'admin ne peut pas tester le flux de lotissement.

**Champs requis** : `reference_number` (TEST-SUB-xxx), `parcel_number`, `parcel_id`, `number_of_lots`, `lots_data` (JSON), `parent_parcel_area_sqm`, `parent_parcel_owner_name`, `requester_first_name`, `requester_last_name`, `requester_phone`, `status`, `user_id`, `purpose_of_subdivision`, `requester_type`

---

## Résumé des actions par fichier

### Fichier 1 : `testDataGenerators.ts` — Ajouter 2 générateurs

| Fonction | Entité | Enregistrements |
|----------|--------|----------------|
| `generateMutationRequests` | `mutation_requests` | 3 (pending, approved, rejected) |
| `generateSubdivisionRequests` | `subdivision_requests` | 2 (pending, approved) |

- Les `mutation_type` utiliseront les valeurs du référentiel : `'vente'`, `'donation'`, `'succession'` (constantes dans `MutationConstants.ts`)
- Les `parcel_id` seront liés aux parcelles TEST générées
- Les `reference_number` suivront le pattern `TEST-MUT-xxx` / `TEST-SUB-xxx`

### Fichier 2 : `useTestDataActions.ts` — Brancher les générateurs

- Importer `generateMutationRequests` et `generateSubdivisionRequests`
- Ajouter un Step 13 "Mutations & lotissements" dans `GENERATION_STEPS`
- Appeler les 2 fonctions dans le flux de génération (après les certificats)
- Ajouter le nettoyage des 2 tables dans `cleanupTestData` (section "Independent tables")
- Ajouter les 2 tables dans le `rollbackTestData`
- Ajouter `'mutation_requests'` et `'subdivision_requests'` dans le log audit `entities`

### Fichier 3 : `types.ts` — Étendre stats et registre

- Ajouter `mutationRequests: number` et `subdivisionRequests: number` dans `TestDataStats`
- Ajouter les valeurs dans `EMPTY_STATS`
- Ajouter les 2 tables dans `TEST_TABLES_DELETION_ORDER`

### Fichier 4 : `useTestDataStats.ts` — Ajouter compteurs

- Ajouter 2 requêtes count sur `mutation_requests` (ilike reference_number TEST-%) et `subdivision_requests` (ilike reference_number TEST-%)
- Mapper les résultats dans le state

### Fichier 5 : `TestDataStatsCard.tsx` — Ajouter lignes UI

- Ajouter 2 entrées dans `STAT_ITEMS` : "Mutations" et "Lotissements"
- Mettre à jour la description du dialog de génération (mentionner mutations et lotissements)

### Fichier 6 : `cleanup-test-data/index.ts` — Ajouter nettoyage cron

- Ajouter le nettoyage des 2 tables dans la section "Independent tables" de l'edge function

---

## Résumé

| Métrique | Avant | Après |
|----------|-------|-------|
| Entités couvertes | 17 | 19 |
| Tables dans cleanup manuel | 17 | 19 |
| Tables dans cleanup cron | 17 | 19 |
| Tables dans rollback | 17 | 19 |
| Tables dans stats UI | 17 | 19 |
| Steps de génération | 13 | 14 |

6 fichiers modifiés, 2 nouveaux générateurs, couverture complète de toutes les données collectées par l'application.

