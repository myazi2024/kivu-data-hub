

# Revue du mode test — Bugs, logique manquante et optimisations

## Bugs identifiés

### Bug 1 : `useTestDataStats` — compteur `expertisePayments` toujours à 0
Ligne 59-62 de `useTestDataStats.ts` : la requête fait un `.ilike('expertise_request_id', 'TEST-%')` (l'ID est un UUID, pas un texte TEST-%), puis `.then(() => Promise.resolve({ count: 0 }))` qui écrase le résultat. Le compteur retournera **toujours 0**.

**Fix** : Joindre via les IDs des expertise requests TEST-%, comme pour les fraud_attempts :
```typescript
const expertiseReqIds = (await supabase.from('real_estate_expertise_requests')
  .select('id').ilike('reference_number', 'TEST-%')).data?.map(r => r.id) ?? [];
// puis .in('expertise_request_id', expertiseReqIds)
```

### Bug 2 : Edge function `cleanup-test-data` ne supprime pas `expertise_payments`
La fonction SQL `cleanup_all_test_data` (migration) supprime correctement `expertise_payments` avant `real_estate_expertise_requests`. Mais l'Edge Function de nettoyage automatique (cron) ne les supprime pas du tout — lignes 146-175 de `cleanup-test-data/index.ts` passent directement à `real_estate_expertise_requests`. La suppression échouera silencieusement si des `expertise_payments` existent (FK constraint).

**Fix** : Ajouter la suppression `expertise_payments` **avant** `real_estate_expertise_requests` dans l'Edge Function.

### Bug 3 : `ParcelMapPreview` — parcelles voisines non filtrées
Ligne 700-708 de `ParcelMapPreview.tsx` : la requête `cadastral_parcels` pour les parcelles voisines n'applique pas `applyTestFilter`. En production, les parcelles TEST-% apparaîtront sur la carte.

### Bug 4 : `LandTitleRequestDialog` — recherche parcelles non filtrée
Ligne 246-249 : la recherche de parcelles dans le dialogue de demande de titre foncier n'applique pas `applyTestFilter`.

### Bug 5 : Ordre FK incorrect dans `cleanup_all_test_data` SQL
Ligne 26 : `cadastral_contributions` est supprimé **avant** `cadastral_invoices` (ligne 51). Or `cadastral_invoices` pourrait avoir des FK vers contributions, et `payment_transactions` (ligne 42) est supprimé après les contributions. L'ordre actuel est :
1. fraud_attempts ✓
2. contributor_codes ✓  
3. **contributions** ← trop tôt
4. service_access
5. expertise_payments
6. payment_transactions
7. expertise_requests
8. **invoices** ← devrait être avant contributions

**Fix** : Déplacer la suppression de `cadastral_contributions` après `cadastral_invoices`.

### Bug 6 : `rollbackTestData` — `expertise_payments` non supprimé
Le rollback client-side (ligne 773-811) ne supprime pas `expertise_payments` avant `real_estate_expertise_requests`, ce qui fera échouer le rollback si des paiements d'expertise existent.

## Erreurs de logique

### L1 : Nettoyage automatique (cron) ne supprime pas les `mutation_requests`/`subdivision_requests` liés par `parcel_id`
La fonction SQL (lignes 93-99) utilise `parcel_id = ANY(parcel_ids) OR reference_number ILIKE 'TEST-%'` mais l'Edge Function (lignes 168-175) ne filtre que par `reference_number`. Si des mutations/subdivisions sont liées par `parcel_id` sans `TEST-%` dans leur reference, elles seront orphelines.

### L2 : Pre-fetch `parcelIds`/`contribIds` inutile dans `useTestDataStats`
Lignes 19-24 : on fetch les IDs complets des parcelles/contributions, puis on refait un `count` sur les mêmes tables (lignes 28-29). Le pre-fetch est nécessaire pour les tables enfant (ownership_history, etc.) mais les 2 count queries initiales (index 0 et 1) sont redondantes avec le pre-fetch.

## Fonctionnalité manquante

### F1 : Pas de génération de `expertise_payments` test
Le générateur (`testDataGenerators.ts`) crée des `real_estate_expertise_requests` mais ne génère aucun `expertise_payments` associé. Le compteur dans les stats sera donc toujours 0 même si le bug 1 est corrigé.

## Plan d'implémentation

| Priorité | Action | Fichiers |
|----------|--------|----------|
| **P0** | Fix compteur `expertisePayments` : pre-fetch `expertiseReqIds`, utiliser `.in()` | `useTestDataStats.ts` |
| **P0** | Fix ordre FK dans `cleanup_all_test_data` : déplacer contributions après invoices | Nouvelle migration SQL |
| **P0** | Ajouter suppression `expertise_payments` dans Edge Function cron | `cleanup-test-data/index.ts` |
| **P0** | Ajouter suppression `expertise_payments` dans `rollbackTestData` | `testDataGenerators.ts` |
| **P1** | Ajouter `applyTestFilter` dans `ParcelMapPreview.tsx` (parcelles voisines) | `ParcelMapPreview.tsx` |
| **P1** | Ajouter `applyTestFilter` dans `LandTitleRequestDialog.tsx` (recherche parcelles) | `LandTitleRequestDialog.tsx` |
| **P1** | Générer des `expertise_payments` test dans le générateur | `testDataGenerators.ts`, `useTestDataActions.ts` |
| **P2** | Éliminer les count queries redondantes (index 0/1) dans `useTestDataStats` | `useTestDataStats.ts` |

