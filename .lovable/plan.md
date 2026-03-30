

# Revue du mode test — Bugs, fonctionnalités manquantes et optimisations

## Bugs identifiés

### Bug 1 : Filtrage test absent sur la majorité des pages utilisateur
Le filtre `applyTestFilter` n'est appliqué que dans 3 fichiers (CadastralMap, CadastralSearchBar, useAdvancedCadastralSearch). **Toutes les autres pages qui requêtent des tables test-sensibles ne filtrent pas les données TEST-%** :
- `UserContributions.tsx` — affiche les contributions TEST-% en production
- `UserBuildingPermits.tsx` — idem
- `UserLandTitleRequests.tsx` — idem
- `UserExpertiseRequests.tsx` — idem
- `UserLandDisputes.tsx` — idem
- `UserMutationRequests.tsx` — idem
- `UserMortgageRequests.tsx` — idem
- `UserSubdivisionRequests.tsx` — idem
- `AdminInvoices.tsx` — liste toutes les factures y compris TEST-%
- `AdminCCCContributions.tsx` — idem (prévu dans le plan initial mais non implémenté)
- `useCadastralStats.tsx` — statistiques faussées par les données TEST-%
- `useAdvancedAnalytics.tsx` — analytics de revenus incluent les factures TEST-%
- `useEnhancedAnalytics.tsx` — idem
- `ParcelMapPreview.tsx` — parcelles voisines TEST-% visibles
- `LandTitleRequestDialog.tsx` — recherche parcelles inclut TEST-%

### Bug 2 : AdminCadastralMap utilise un filtre hardcodé au lieu de `applyTestFilter`
Lignes 71 et 80 de `AdminCadastralMap.tsx` utilisent `.not('parcel_number', 'ilike', 'TEST-%')` en dur au lieu du helper contextuel. Si un admin navigue vers `/test/admin`, le filtre sera inversé.

### Bug 3 : `useTestDataStats` ne compte pas `expertise_payments`
La table `expertise_payments` a été ajoutée au cleanup RPC mais n'est pas comptée dans les statistiques. Le total affiché est donc potentiellement inférieur au nombre réel de données test.

### Bug 4 : `cleanupOnDisable` est set mais jamais lu
Dans `AdminTestMode.tsx` ligne 130, `setCleanupOnDisable(true)` est appelé mais `cleanupOnDisable` n'est jamais utilisé dans le rendu ou la logique.

## Fonctionnalités manquantes

### F1 : Pas de route test pour le dashboard utilisateur complet
Seuls `/test/cadastral-map`, `/test/map` et `/test/mon-compte` sont miroirs. Les pages d'admin ne sont pas accessibles en mode test (pas de `/test/admin/*`), donc les admins ne peuvent pas tester les flux admin avec uniquement les données TEST-%.

### F2 : Pas d'indicateur du nombre de données test dans le header/sidebar admin
L'admin doit naviguer jusqu'à l'onglet "Mode Test" pour voir s'il reste des données test. Un badge dans la sidebar serait utile.

### F3 : Pas de bouton "Accéder à l'env test" contextuel
Les liens test sont uniquement dans le guide. Un bouton visible dans le bandeau d'état du mode test (la Card en haut) serait plus accessible.

### F4 : Pas de compteur `expertise_payments` dans les stats
Table présente dans le cleanup mais absente de `TestDataStats`, `STAT_ITEMS` et `useTestDataStats`.

## Optimisations

### O1 : Centraliser le filtrage test via un wrapper de requêtes
Au lieu d'ajouter `applyTestFilter` manuellement dans 20+ fichiers, créer un hook `useFilteredQuery` qui wrap automatiquement les requêtes Supabase avec le bon filtre test/production.

### O2 : Consolidation des variables d'état inutiles
Supprimer `cleanupOnDisable` qui n'est jamais lu.

## Plan d'implémentation (prioritaire)

| Priorité | Action | Fichiers |
|----------|--------|----------|
| **P0** | Ajouter `applyTestFilter` dans les 10+ composants utilisateur/admin qui requêtent sans filtre (Bug 1) | `UserContributions.tsx`, `UserBuildingPermits.tsx`, `UserLandTitleRequests.tsx`, `UserExpertiseRequests.tsx`, `UserLandDisputes.tsx`, `UserMutationRequests.tsx`, `UserMortgageRequests.tsx`, `UserSubdivisionRequests.tsx`, `AdminInvoices.tsx`, `useCadastralStats.tsx`, `useAdvancedAnalytics.tsx`, `useEnhancedAnalytics.tsx`, `LandTitleRequestDialog.tsx`, `ParcelMapPreview.tsx` |
| **P0** | Remplacer le filtre hardcodé de `AdminCadastralMap.tsx` par `applyTestFilter` contextuel (Bug 2) | `AdminCadastralMap.tsx` |
| **P1** | Ajouter `expertise_payments` dans stats + types (Bug 3, F4) | `types.ts`, `useTestDataStats.ts`, `TestDataStatsCard.tsx` |
| **P2** | Supprimer `cleanupOnDisable` inutile (Bug 4, O2) | `AdminTestMode.tsx` |
| **P2** | Ajouter un lien "Accéder à l'env test" dans la Card d'état du mode test (F3) | `AdminTestMode.tsx` |

