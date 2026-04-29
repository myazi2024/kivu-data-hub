
## Contexte

L'utilisateur signale que la **suppression** des données de test échoue avec `Étape "parcels" : canceling statement due to statement timeout (0 déjà supprimés)` alors que les 725 parcelles TEST n'ont **plus aucun enfant** (mortgages/permits/history/contributions = 0). L'audit révèle plusieurs bugs additionnels dans tout le pipeline mode test.

## Bugs identifiés

### 🔴 P0 — Suppression bloquée (cause directe)
**Index manquants sur les FK pointant vers `cadastral_parcels`.**  Confirmé en base :
| Table enfant            | parcel_id indexé ? |
|-------------------------|--------------------|
| cadastral_mortgages     | ❌ NON             |
| cadastral_boundary_history | ❌ NON          |
| cadastral_land_disputes | ❌ NON             |
| mutation_requests       | ❌ NON             |
| real_estate_expertise_requests | ❌ NON      |
| subdivision_requests    | ❌ NON             |

Lors d'un `DELETE FROM cadastral_parcels`, PostgreSQL doit vérifier les FK (CASCADE pour mortgages/ownership/tax/permits, NO ACTION pour les autres) → **seq-scan complet × 500 lignes** → statement timeout, même quand toutes ces tables sont vides (le seq-scan reste obligatoire pour prouver le vide). C'est la cause exacte du blocage actuel.

### 🟠 P1 — Verrou stale `test_generation_jobs`
Si une edge function `generate-test-data` crashe (OOM, timeout 150s pour `waitUntil`, déploiement), `status` reste `running` → toute nouvelle génération est rejetée par le check `existing.length > 0` (ligne 430). Aucun mécanisme de purge auto, aucun heartbeat staleness check.

### 🟠 P1 — Heartbeat non rafraîchi pendant un step long
`heartbeat_at` n'est mis à jour qu'**entre** les steps. Un step `parcels` qui dure 90s n'envoie aucun signal de vie → impossible de distinguer "step lourd" de "fonction morte".

### 🟡 P2 — Annulation tardive
`isJobCancelled` n'est appelée qu'entre les steps. Cliquer "Annuler" pendant un step long n'a aucun effet jusqu'à la fin du step.

### 🟡 P2 — RPC nettoyage : pas de FOR UPDATE SKIP LOCKED
Si deux nettoyages tournent (improbable mais possible), DELETE × DELETE → deadlock. Mineur.

### 🟡 P2 — `statement_timeout` non augmenté
La RPC `_cleanup_test_data_chunk_internal` hérite du timeout par défaut (~8s PostgREST/Supabase). Pour les très gros volumes, même avec index, on peut frôler la limite. Bonne pratique : `SET LOCAL statement_timeout = '60s'` dans la fonction.

### 🟢 P3 — Audit log incohérent
Dans `generate-test-data/index.ts:370`, `table_name: 'cadastral_contributions'` est codé en dur — devrait être `'test_generation_jobs'` ou `'multiple'`.

## Plan de correction

### Étape 1 — Migration : index FK + timeout RPC + purge stale
Migration unique :
1. **Créer 6 index** `CONCURRENTLY`-friendly (on est en migration → CREATE INDEX IF NOT EXISTS) :
   - `idx_mortgages_parcel_id` sur `cadastral_mortgages(parcel_id)`
   - `idx_boundary_history_parcel_id` sur `cadastral_boundary_history(parcel_id)`
   - `idx_land_disputes_parcel_id` sur `cadastral_land_disputes(parcel_id)`
   - `idx_mutation_requests_parcel_id_fk` sur `mutation_requests(parcel_id)`
   - `idx_expertise_requests_parcel_id_fk` sur `real_estate_expertise_requests(parcel_id)`
   - `idx_subdivision_requests_parcel_id_fk` sur `subdivision_requests(parcel_id)`
2. **Modifier `_cleanup_test_data_chunk_internal`** : ajouter `SET LOCAL statement_timeout = '60s'` en début de fonction.
3. **Nouvelle RPC `_purge_stale_test_generation_jobs()`** :
   - Marque `status='error'` + `error='Heartbeat perdu (job orphelin)'` les jobs `running` avec `heartbeat_at < now() - interval '3 minutes'`.
   - SECURITY DEFINER, callable par admin/super_admin.

### Étape 2 — Edge function `cleanup-test-data-batch`
- Avant la boucle, appeler `admin.rpc('_purge_stale_test_generation_jobs')` (silencieux si erreur).
- Augmenter légèrement la batch (BATCH=1000) maintenant que les index sont là.
- Ajouter un timeout côté JS par étape (`Promise.race` 90s) pour faire échouer proprement plutôt que laisser pendre.

### Étape 3 — Edge function `generate-test-data`
- **Auto-purge stale au démarrage** : appeler `_purge_stale_test_generation_jobs` avant le check d'existence (ligne 425).
- **Heartbeat périodique** : dans `runJob`, lancer un `setInterval` toutes les 20s qui met à jour `heartbeat_at` indépendamment du step en cours. Clear dans le `finally`.
- **Annulation pendant step long** : passer un `AbortSignal` dans `JobCtx` ; vérifier `cancelled` après chaque batch dans les générateurs lourds (parcels notamment, qui itère par batch de 25). Migration légère côté `_shared.ts`.
- **Fix audit_log** : `table_name: 'test_generation_jobs'`.

### Étape 4 — Hook `useTestGenerationJob`
- Quand le serveur renvoie 409 avec `active_job_id`, exposer un bouton "Forcer le déverrouillage" qui appelle `_purge_stale_test_generation_jobs` puis relance.
- Détecter côté client un job dont `heartbeat_at < now()-3min` et le marquer visuellement "🔴 Job potentiellement bloqué".

### Étape 5 — Mémoire
Mettre à jour `mem://admin/test-mode-hardening-fr.md` avec :
- Index FK obligatoires sur enfants de cadastral_parcels.
- Pattern auto-purge stale + heartbeat périodique.

## Architecture cible (résumé)

```text
[DELETE parcels chunk de 1000]
   └─→ FK checks RAPIDES (index) ─→ CASCADE/RESTRICT < 1s
   └─→ statement_timeout local 60s

[generate-test-data]
   ├─ purge stale (>3min sans heartbeat)
   ├─ check active job
   ├─ insert job → 202 + job_id
   └─ waitUntil(runJob)
         ├─ setInterval(20s) → heartbeat_at = now()
         ├─ AbortSignal propagé aux générateurs
         └─ for each step: ... cancel-aware
```

## Fichiers impactés

- `supabase/migrations/<new>_test_mode_indexes_and_purge.sql` (nouveau)
- `supabase/functions/cleanup-test-data-batch/index.ts`
- `supabase/functions/generate-test-data/index.ts`
- `supabase/functions/_shared/test-mode-generators/_shared.ts` (AbortSignal)
- `supabase/functions/_shared/test-mode-generators/parcels.ts` (cancel check)
- `src/hooks/useTestGenerationJob.ts` (détection stale + force unlock)
- `src/components/admin/test-mode/GenerationProgress.tsx` (badge stale)
- `mem/admin/test-mode-hardening-fr.md`

## Risques et précautions

- Les `CREATE INDEX IF NOT EXISTS` sans `CONCURRENTLY` posent un AccessExclusiveLock court (~ms sur tables vides ici). OK.
- Le heartbeat périodique multiplie les UPDATE → utiliser une seule colonne `heartbeat_at`, pas tout le steps_state.
- L'AbortSignal est propagé "best effort" — pas de garantie d'arrêt instantané, mais évite de continuer un job annulé pendant 5 minutes.

Validation finale : après correction, relancer la suppression sur les 725 parcelles → doit terminer en quelques secondes.
