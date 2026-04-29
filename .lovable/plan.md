## Cause exacte du timeout sur `parcels`

Tous les index FK sur `cadastral_parcels` sont en place et tous les enfants test sont déjà à 0 lignes. Pourtant `DELETE` sur 1000 parcelles dépasse 60 s. La cause réelle :

- **Trigger `audit_cadastral_parcels` AFTER DELETE FOR EACH ROW** appelle `audit_cadastral_changes()` qui fait `to_jsonb(OLD)` (sérialise toute la parcelle, géométrie incluse) puis `INSERT INTO audit_logs`.
- La table `audit_logs` pèse **917 MB** (`pg_total_relation_size`). Chaque INSERT est lent (autovacuum/écritures WAL importantes) et 1000 inserts en transaction = plusieurs dizaines de secondes.
- Idem (mais vide aujourd'hui) sur `cadastral_building_permits` et `cadastral_invoices` (mêmes triggers d'audit).

L'attaque par index FK étape précédente était nécessaire mais insuffisante : même avec FK gratuites, le trigger d'audit serializes 1000 JSON lourds dans une table monstrueuse.

## Plan de correction

### Étape 1 — Migration : bypass d'audit pendant la purge test + housekeeping

1. **Helper `app.test_cleanup_in_progress`** : variable de session positionnée par `_cleanup_test_data_chunk_internal` (`SET LOCAL app.test_cleanup_in_progress = '1'`).
2. **Modifier `audit_cadastral_changes()`** : early-return si la variable de session vaut `'1'` ET que la ligne concerne un préfixe `TEST-` (selon `OLD.parcel_number`/`NEW.parcel_number` quand applicable). Conséquence : aucun audit log généré pendant la purge automatisée des données test → `DELETE` sur parcels redevient ~instantané.
3. **Modifier `audit_history_changes()`** de la même façon (fires sur `cadastral_boundary_history` cascade).
4. **`_cleanup_test_data_chunk_internal`** : ajouter `PERFORM set_config('app.test_cleanup_in_progress', '1', true);` en tout début, et augmenter explicitement `statement_timeout` à `120s` (les payloads JSONB cessent d'être un risque mais on garde une marge).
5. **Purge des audit logs TEST historiques** (one-shot dans la même migration) : `DELETE FROM audit_logs WHERE table_name='cadastral_parcels' AND (old_values->>'parcel_number' LIKE 'TEST-%' OR new_values->>'parcel_number' LIKE 'TEST-%');` puis idem pour `cadastral_building_permits` et `cadastral_invoices`. Réduit les 917 MB.
6. **Index partiel utile** : `CREATE INDEX IF NOT EXISTS idx_audit_logs_test_purge ON audit_logs(table_name) WHERE (old_values->>'parcel_number') LIKE 'TEST-%';` pour accélérer une future purge récurrente.

### Étape 2 — Audit additionnel mode test (corrections groupées)

Trouvés au passage pendant l'enquête :

- **`isTestModeActive` / `useTestMode`** : appelle `cadastral_search_config` mais ne filtre pas sur le rôle. RLS doit être vérifiée — sinon retournée silencieusement vide pour un user non-admin → faux négatif (déjà OK en lecture publique a priori, à vérifier rapidement).
- **`AdminTestMode` désactivation+purge** : si la purge échoue partiellement (`ok:false`) le mode test est tout de même désactivé sans rollback. À corriger : ne désactiver le mode test que si `result.ok === true`.
- **`cleanup-test-data-batch`** : le step `parcels` était la goulotte. Une fois trigger contourné, on peut sereinement laisser BATCH=1000 et `MAX_ITERATIONS_PER_STEP=200`. Pas de changement.
- **Audit log final** : `table_name: 'cadastral_parcels'` (ligne 124 de la fonction edge) est trompeur quand la purge concerne 23 tables. Remplacer par `'multiple'` (cohérence avec `mem://admin/test-mode-hardening-fr.md`).
- **Génération `EdgeRuntime.waitUntil`** : ajouter un `try/catch` global autour de `runJob` qui marque le job en `error` si une exception non gérée remonte (sinon le job reste `running` jusqu'à ce que le purge stale jobs (3 min) le rattrape). Améliore le feedback utilisateur.
- **Hook `useTestGenerationJob.forceUnlock`** : exposer aussi un bouton « Réessayer » qui purge stale puis relance la génération (UX).

### Étape 3 — Mémoire

Mettre à jour `mem://admin/test-mode-hardening-fr.md` :
- Section « Pièges historiques » : ajouter le bypass audit obligatoire pour la purge test ; ne JAMAIS retirer le `set_config('app.test_cleanup_in_progress', '1', true)` de la RPC.
- Pattern : audit triggers AFTER DELETE FOR EACH ROW + `to_jsonb(OLD)` sont incompatibles avec des purges massives ; toute table à audit doit prévoir un bypass session-scoped pour les opérations de mass-delete contrôlées.

## Architecture cible

```text
[cleanup-test-data-batch]
   └─→ for each step (BATCH=1000, max 200 iters):
         └─→ rpc _cleanup_test_data_chunk_internal
               ├─ SET LOCAL app.test_cleanup_in_progress = '1'
               ├─ SET LOCAL statement_timeout = '120s'
               └─ DELETE → triggers audit early-return → 0 ligne audit_logs
```

## Fichiers impactés

- `supabase/migrations/<new>_fix_audit_during_test_cleanup.sql` (nouveau)
  - patch `audit_cadastral_changes`
  - patch `audit_history_changes`
  - patch `_cleanup_test_data_chunk_internal`
  - one-shot DELETE des audit_logs TEST historiques
  - index partiel
- `supabase/functions/cleanup-test-data-batch/index.ts` : `table_name='multiple'`
- `supabase/functions/generate-test-data/index.ts` : try/catch global → marquer job `error`
- `src/components/admin/AdminTestMode.tsx` : ne désactiver le mode test que si purge `ok:true`
- `src/components/admin/test-mode/GenerationProgress.tsx` : bouton « Réessayer » à côté de « Forcer le déverrouillage »
- `src/hooks/useTestGenerationJob.ts` : `retry()`
- `mem/admin/test-mode-hardening-fr.md`

## Risques

- Le bypass audit est session-scoped (`SET LOCAL`) → ne fuit jamais en dehors de la transaction de purge. Pas d'impact sur les opérations utilisateurs normales.
- La purge des audit_logs historiques `TEST-%` est strictement bornée par filtre JSONB → safe.
- Le filtre du bypass dans le trigger doit lire `OLD.parcel_number` côté DELETE et `NEW.parcel_number` côté INSERT/UPDATE pour ne pas se tromper de variable.

## Validation post-déploiement

1. Relancer la suppression sur les 3510 parcelles TEST restantes → doit terminer en quelques secondes par batch.
2. Vérifier que les audits utilisateur normaux fonctionnent toujours (créer/supprimer une parcelle non-TEST, contrôler que `audit_logs` reçoit la ligne).
3. Vérifier la taille `audit_logs` après one-shot purge — devrait fortement baisser.
