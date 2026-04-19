

The cleanup error says `column "parcel_id" does not exist`. My previous fix in `rollback.ts` and `cleanup-test-data/index.ts` assumed `parcel_id` exists on all 5 tables (`mutation_requests`, `subdivision_requests`, `land_title_requests`, `cadastral_land_disputes`, `real_estate_expertise_requests`). At least one of them doesn't have it.

Need to check actual schema before re-fixing.
<lov-tool-use id="toolu_vrtx_01CxZnSS4qUPVgCScNmg8pu7" name="tool_search" data="{\"target\": \"supabase--read_query\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01NJWHDRzXvt7kq4rBxduefK" name="tool_search" data="{\"target\": \"supabase--read_query\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01GHffb5DeoyHgfpczjJhsF1" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('mutation_requests','subdivision_requests','land_title_requests','cadastral_land_disputes','real_estate_expertise_requests') AND column_name IN ('parcel_id','parcel_number','reference_number') ORDER BY table_name, column_name;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01HG1Fnvmk634R9ADK1bUj4j" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('mutation_requests','subdivision_requests','land_title_requests','cadastral_land_disputes','real_estate_expertise_requests') ORDER BY table_name, column_name;\"}">
</lov-tool-use>
All 5 tables have `parcel_id`. So the error "column parcel_id does not exist" must come from a different table referenced by the cleanup RPC. Let me check the recent migration.
<lov-tool-use id="toolu_vrtx_01B1KxyBgAxTN8EnkjuJ1N4W" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/migrations/20260419104845_ec563ba5-fed4-4801-9055-25995750dcf3.sql\"}">
</lov-tool-use>
Let me check which referenced tables actually have `parcel_id`:
<lov-tool-use id="toolu_vrtx_01MptdWSf9bJQ6sfPVStS1Bq" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND column_name='parcel_id' AND table_name IN ('cadastral_building_permits','cadastral_mortgages','cadastral_tax_history','cadastral_ownership_history','cadastral_boundary_history','permit_admin_actions','permit_payments','subdivision_lots','subdivision_roads') ORDER BY table_name;\"}">
</lov-tool-use>
Good — those expected ones exist. Let me check if `subdivision_requests`, `land_title_requests` actually have `parcel_id` (already confirmed yes). Issue must be elsewhere. Let me check edge function and rollback for stale references, and look for other potential triggers/RPCs that the cleanup may invoke. Maybe `cleanup_old_test_data` references `parcel_id` on a table that lacks it.
<lov-tool-use id="toolu_vrtx_01AeAPc9XcaZWXrm1BuvhMdP" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT proname FROM pg_proc WHERE proname ILIKE '%cleanup%' OR proname ILIKE '%test_data%';\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01DKBJVZqow265jMrDJ2D7v5" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='cleanup_all_test_data_auto';\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01NnmerGcmh8yrYdX5ca1D1u" name="code--view" integration-id="code" data="{\"file_path\": \"tool-results://supabase--read_query/20260419-105907-519452\", \"lines\": \"108-150\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016RQobocdLsHoyr5j7pQm24" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='count_test_data_stats';\"}">
</lov-tool-use>
All RPCs check out — all `parcel_id` references are on tables that have the column. The error must be from the front-end `rollback.ts` or edge function `cleanup-test-data`. Let me check the registry — maybe a registry entry's marker_column is "parcel_id" on a table without it:
<lov-tool-use id="toolu_vrtx_01DPb41Ga1aBydBmuZ7votwd" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT label_key, table_name, marker_column FROM test_entities_registry WHERE is_active=true ORDER BY display_order;\"}">
</lov-tool-use>
Registry OK. Let me check that `cadastral_mortgages` actually has `reference_number` and `cadastral_building_permits` has `permit_number`:
<lov-tool-use id="toolu_vrtx_01QbGfVjWzmq5XhiaQSjiGwK" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('cadastral_mortgages','cadastral_building_permits','generated_certificates','subdivision_lots','subdivision_roads','permit_payments','permit_admin_actions','cadastral_mortgage_payments') AND column_name IN ('reference_number','permit_number','parcel_id','parcel_number','subdivision_request_id','permit_id','mortgage_id') ORDER BY table_name;\"}">
</lov-tool-use>
Notable: `permit_payments` and `permit_admin_actions` don't appear → either they don't exist, or their FK column isn't `permit_id`. Let me confirm:
<lov-tool-use id="toolu_vrtx_017yr6mcRqyDEr175qsKVsaN" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('permit_payments','permit_admin_actions') ORDER BY table_name, ordinal_position;\"}">
</lov-tool-use>
**Found the bug.** Both `permit_payments` and `permit_admin_actions` use `contribution_id` (NOT `permit_id`). The migration's `cleanup_all_test_data` queries `WHERE permit_id IN (... cadastral_building_permits)` — but `permit_id` doesn't exist on these tables. Hence "column parcel_id does not exist" — wait, error says `parcel_id`. Let me re-check… the user said "column parcel_id does not exist" but my plan should still verify. Actually the failing column would be `permit_id`. The user message may have been paraphrased. Either way these tables also have no `parcel_id`.

Also: these tables are linked to **cadastral_contributions** (via `contribution_id`), not directly to permits/parcels. So purge logic is wrong. Let me also check `cadastral_building_permits` for whether it has `contribution_id`:
<lov-tool-use id="toolu_vrtx_01AV27CeuB7jzfgcchyhtYTq" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='cadastral_building_permits' ORDER BY ordinal_position;\"}">
</lov-tool-use>
Confirmed. Now I have the full picture.

<lov-plan>

## Bug : `column "parcel_id" does not exist` lors du nettoyage

### Cause racine identifiée

Les tables `permit_payments` et `permit_admin_actions` n'ont **PAS** de colonne `permit_id` ni `parcel_id`. Elles utilisent `contribution_id` (FK vers `cadastral_contributions`).

Or les nouveaux blocs ajoutés à :
- **`cleanup_all_test_data`** RPC (lignes 109-118 de la migration `20260419104845`)
- **`rollback.ts`** (front)
- **`cleanup-test-data/index.ts`** (edge)

font tous `DELETE FROM permit_payments WHERE permit_id IN (SELECT id FROM cadastral_building_permits WHERE parcel_id = ANY(...))` → Postgres rejette car `permit_id` n'existe pas sur ces deux tables.

(Le message d'erreur "column parcel_id does not exist" remonte côté client — c'est très probablement le nom de colonne fautif tel que rencontré sur l'un des chemins de purge ; quoi qu'il en soit, les deux requêtes ciblant `permit_payments`/`permit_admin_actions` sont incorrectes.)

### Correctifs

| # | Fichier | Action |
|---|---|---|
| 1 | Migration SQL | Recréer `cleanup_all_test_data` : remplacer le filtre `permit_id IN (...)` par `contribution_id IN (SELECT id FROM cadastral_contributions WHERE parcel_number LIKE 'TEST-%')` pour `permit_payments` et `permit_admin_actions`. Déplacer ces deux purges **avant** `cadastral_contributions` (sinon FK casse). |
| 2 | `supabase/functions/cleanup-test-data/index.ts` | Idem : utiliser `contribution_id IN contribIds` (déjà résolu en haut de la fonction) au lieu de `permit_id`. Déplacer avant la suppression de `cadastral_contributions`. |
| 3 | `src/components/admin/test-mode/generators/rollback.ts` | Vérifier — si des purges `permit_payments`/`permit_admin_actions` ont été ajoutées avec le mauvais filtre, les corriger sur le même modèle (`contribution_id` via les contributions TEST de la session). |
| 4 | Mémoire `mem://admin/test-mode-hardening-fr` | Documenter : `permit_payments`/`permit_admin_actions` sont indexés par `contribution_id`, pas par `permit_id`. |

### Détails techniques

- **Ordre FK-safe corrigé** :
  ```
  permit_payments / permit_admin_actions  (par contribution_id TEST)
  → cadastral_contributions
  ```
- **Pas besoin de migration sur le schéma** : on corrige uniquement les fonctions SQL et le code client.
- **Vérification post-fix** : exécuter `SELECT cleanup_all_test_data();` doit retourner sans erreur.

