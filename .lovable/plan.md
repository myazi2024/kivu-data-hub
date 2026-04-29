# Génération mode test : exécution en arrière-plan

## Problème

Aujourd'hui, toute la génération (14 étapes, ~1 650 parcelles + dépendances) tourne **dans le navigateur de l'admin** (`useTestDataActions.generateTestData`). Si l'admin :
- ferme l'onglet,
- navigue vers une autre page,
- met l'ordinateur en veille,

…tous les `await` Supabase en vol sont coupés et la génération s'arrête à mi-chemin (souvent en plein milieu des parcelles ou des factures), laissant des données incohérentes.

Le seul moyen fiable de la rendre **résiliente à la fermeture du client** est de déplacer l'orchestration côté **edge function**, qui continue jusqu'au bout indépendamment du navigateur.

## Architecture cible

```text
[Admin UI]                              [Edge Function]                  [DB]
     │                                          │                          │
  POST /generate-test-data ───────────────────▶ │                          │
                                                ├─ INSERT test_generation_jobs (queued)
                                                ├─ EdgeRuntime.waitUntil(runJob(id))
     ◀──── 202 { job_id }                       │
                                                │
                                                ├─ étape 1: parcelles ──▶ INSERT batch
                                                │                          │
                                                ├─ UPDATE job (step 2/14) │
                                                │                          │
  GET /test-generation-job-status ─────▶        │                          │
     ◀──── { status, current_step, ... }        │                          │
                                                │
                                                └─ UPDATE job (status=done)
```

## Plan d'implémentation

### 1. Table `test_generation_jobs` (nouvelle migration)

| Colonne            | Type          | Note                                       |
|--------------------|---------------|--------------------------------------------|
| id                 | uuid PK       | `gen_random_uuid()`                        |
| user_id            | uuid          | demandeur (admin)                          |
| status             | text          | `queued / running / done / error / cancelled` |
| current_step_key   | text          | clé de l'étape en cours                    |
| current_step_index | int           | 0..13                                      |
| total_steps        | int           | 14                                         |
| steps_state        | jsonb         | `[{key, label, status, error?}]`           |
| counts             | jsonb         | `{parcels, contributions, invoices, ...}`  |
| error              | text          | dernière erreur bloquante                  |
| failed_substeps    | text[]        | sous-étapes non bloquantes en échec        |
| started_at         | timestamptz   |                                            |
| finished_at        | timestamptz   |                                            |
| created_at         | timestamptz   | default `now()`                            |

- RLS : `SELECT/INSERT` réservé aux `admin` + `super_admin` via `has_role()` (cf. baseline sécurité).
- Realtime activé pour permettre au front d'écouter les `UPDATE` au lieu de poller (mais le polling reste un fallback).

### 2. Edge function `generate-test-data` (nouvelle)

- Vérifie JWT + rôle admin/super_admin (même pattern que `cleanup-test-data-batch`).
- Vérifie que `test_mode.enabled = true`.
- Refuse si un job `queued`/`running` existe déjà pour empêcher les doublons.
- Crée la ligne `test_generation_jobs` (status `queued`).
- Lance `EdgeRuntime.waitUntil(runJob(jobId, userId))` puis répond immédiatement `202 { job_id }`.
- `runJob` :
  - Réplique la logique de `generationStepsRegistry.ts` (parcelles → contributions → factures → … → mutations/lotissements).
  - Réutilise les **mêmes données semées** (provinces, owners, etc.) — extraire les constantes de `_shared.ts` dans `supabase/functions/_shared/testFixtures.ts` pour éviter la duplication.
  - Après chaque étape : `UPDATE test_generation_jobs SET current_step_index = …, steps_state = …`.
  - En cas d'erreur bloquante : `status = 'error'`, conservation de l'erreur.
  - En cas de succès : `status = 'done'`, `finished_at = now()`, log `audit_logs` `TEST_DATA_GENERATED` (déjà fait côté front aujourd'hui).
- Throttling identique au front (`BATCH_DELAY_MS`, `PARCEL_BATCH = 25`, `withRetry` exponentiel).

### 3. Edge function (ou RPC) `get-test-generation-job` (nouvelle, légère)

- Optionnel : on peut aussi simplement utiliser `supabase.from('test_generation_jobs').select(...)` côté client, RLS suffit. **Plus simple, à privilégier.**

### 4. Refactor `useTestDataActions`

- `generateTestData()` ne lance plus la boucle locale. À la place :
  1. `supabase.functions.invoke('generate-test-data')` → récupère `job_id`.
  2. Persiste `job_id` dans `localStorage` (clé `test-mode:active-job`).
  3. S'abonne au job via `supabase.channel('test_gen').on('postgres_changes', { table: 'test_generation_jobs', filter: 'id=eq.' + jobId })`.
  4. Met à jour `generationSteps` / `currentStep` à partir de `steps_state`.
- Au montage du composant `AdminTestMode` :
  - Lire `localStorage['test-mode:active-job']`.
  - Si présent et job encore `queued`/`running`, se réabonner et reprendre l'affichage de la progression.
  - À la fin (`done`/`error`/`cancelled`), nettoyer la clé localStorage.
- `regenerateTestData` : enchaîne `cleanupTestData()` puis `generateTestData()` (le cleanup reste server-side comme aujourd'hui).

### 5. Bouton "Annuler la génération" (nouveau, dans `GenerationProgress`)

- Optionnel mais recommandé : `UPDATE test_generation_jobs SET status = 'cancelled'` ; le `runJob` vérifie ce flag entre chaque étape et s'arrête proprement.

### 6. Nettoyage des jobs anciens

- Étendre `cleanup_all_test_data_auto()` (ou ajouter un cron léger) pour purger les `test_generation_jobs` `done`/`error` plus vieux que 30 jours.

### 7. Documentation & mémoire

- Mettre à jour `docs/TEST_MODE.md` (section génération) avec le nouveau flux asynchrone.
- Mettre à jour `mem/admin/test-mode-hardening-fr.md` :
  - "Génération exécutée server-side via edge function `generate-test-data` + `EdgeRuntime.waitUntil` ; client polle `test_generation_jobs` via Realtime ; reprise transparente après refresh ou fermeture d'onglet."

## Points techniques

- **`EdgeRuntime.waitUntil`** est supporté par Supabase Edge Runtime (Deno) : la réponse part immédiatement, mais la promesse continue jusqu'à ~150s max par invocation. Si la génération risque de dépasser ce budget (1 650 parcelles en `PARCEL_BATCH = 25` → ~66 batches × ~150ms + overhead), il faudra **chunker en réinvocations** : à la fin de chaque étape, si on approche du budget, on `UPDATE status='running'` avec un curseur, puis on auto-réinvoque l'edge function via `fetch` self-call. Architecture prévue, mais à n'activer que si les logs montrent des timeouts réels.
- **Idempotence** : un seul job actif à la fois (contrainte applicative dans l'edge function).
- **Sécurité** : aucun secret côté client ; le `service_role_key` ne sort jamais de l'edge function.
- **RLS sur `test_generation_jobs`** : `has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')` (conforme au baseline mémorisé).

## Fichiers touchés

**Nouveaux**
- `supabase/migrations/<timestamp>_test_generation_jobs.sql`
- `supabase/functions/generate-test-data/index.ts`
- `supabase/functions/_shared/testFixtures.ts` (constantes partagées avec le front)
- `src/hooks/useTestGenerationJob.ts` (subscribe + état)

**Modifiés**
- `src/components/admin/test-mode/useTestDataActions.ts` (delegate à l'edge function)
- `src/components/admin/AdminTestMode.tsx` (reprise du job au mount)
- `src/components/admin/test-mode/GenerationProgress.tsx` (bouton annuler optionnel)
- `docs/TEST_MODE.md`
- `mem/admin/test-mode-hardening-fr.md`

## Effets utilisateur

- L'admin clique "Générer" → toast "Génération lancée en arrière-plan".
- Il peut fermer l'onglet, naviguer ailleurs, ou rester pour suivre la progression en temps réel.
- À son retour sur la page admin mode test, la barre de progression reprend automatiquement là où elle en est, ou affiche le résultat final si le job est terminé.
