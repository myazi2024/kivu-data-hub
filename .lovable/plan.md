

## Bug : `canceling statement due to statement timeout` lors du nettoyage TEST

### Cause
La RPC `cleanup_all_test_data()` exécute ~30 DELETE en une seule transaction sur ~14 000 lignes + cascades FK. PostgREST coupe à ~2 min (`statement_timeout`). Le volume actuel (3 510 parcelles, 3 510 contributions, 1 170 factures, 712 transactions, 1 506 historiques fiscaux, 1 229 service_access, etc.) dépasse cette limite.

### Stratégie
Déplacer le nettoyage manuel vers une **edge function batchée** (`cleanup-test-data-batch`) qui :
1. Utilise le `SERVICE_ROLE_KEY` (pas de timeout PostgREST côté client).
2. Vérifie le rôle admin de l'appelant via JWT avant d'agir.
3. Appelle une nouvelle RPC `cleanup_test_data_chunk(p_table text, p_limit int)` qui supprime jusqu'à N lignes d'une table donnée et retourne le nombre supprimé.
4. Boucle table par table, lot de 500, jusqu'à épuisement, en respectant l'ordre FK-safe déjà validé.
5. Loggue le total final dans `audit_logs` (`MANUAL_TEST_DATA_CLEANUP_BATCHED`).

### Plan technique

| # | Cible | Action |
|---|---|---|
| 1 | Migration SQL | Créer `cleanup_test_data_chunk(p_step text, p_limit int) RETURNS int` qui exécute UN seul DELETE limité à `p_limit` lignes pour l'étape demandée (ex: `'permit_payments'`, `'contributions_children'`, `'invoices'`, `'tx'`, `'parcel_children_mutation'`, ..., `'parcels'`). Chaque appel = 1 transaction courte. SECURITY DEFINER, vérifie rôle admin, `SET search_path TO 'public'`. |
| 2 | Edge function `cleanup-test-data-batch` | Nouvelle fonction Deno : valide JWT admin → boucle sur la liste ordonnée d'étapes → pour chaque étape, appelle la RPC en boucle (lot de 500) jusqu'à retour 0 → totalise → loggue dans `audit_logs` → retourne le résumé. |
| 3 | Frontend `useTestDataActions.ts` | Remplacer `supabase.rpc('cleanup_all_test_data')` par `supabase.functions.invoke('cleanup-test-data-batch')` avec progression (toast). Garder fallback RPC si volume faible. |
| 4 | Cron quotidien | `cleanup_all_test_data_auto()` : la conserver mais la convertir aussi en boucle interne `LOOP ... DELETE ... LIMIT 1000 ... EXIT WHEN NOT FOUND` pour éviter le même timeout côté pg_cron (qui n'a pas la limite PostgREST mais reste préférable d'éviter une transaction géante). |
| 5 | Mémoire `mem://admin/test-mode-hardening-fr` | Documenter le pattern batché et le seuil (~14k lignes). |

### Ordre des étapes (FK-safe, identique à la version actuelle, juste découpé)
```
permit_payments → permit_admin_actions → fraud_attempts
→ contributor_codes → service_access → payment_transactions → invoices → contributions
→ mutation_requests → subdivision_requests → land_disputes → expertise_payments → expertise_requests
→ orphan land_title_requests / orphan refs LIKE 'TEST-%'
→ ownership_history → tax_history → boundary_history → mortgages → building_permits
→ parcels
→ generated_certificates → boundary_conflicts
```

### Résultat attendu
- Le bouton « Nettoyer tout » termine sans timeout, même sur 14k+ lignes.
- Affichage de progression côté admin (étape en cours + total supprimé).
- Cron auto également immunisé contre les transactions trop longues.

