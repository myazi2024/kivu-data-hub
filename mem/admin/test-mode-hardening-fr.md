---
name: Test mode hardening
description: Architecture mode test admin — RPC stats/cleanup, registry dynamique, edge function FK-safe, audit, banners
type: feature
---

## Invariants Mode Test admin

### Serveur (Supabase)
- **Registry** `public.test_entities_registry` = source de vérité des entités TEST suivies. Migration `20260422093055` désactive 6 entités historiques (fraudAttempts, ownership/tax/boundary History, expertise/mortgage Payments). Ne PAS hardcoder de listes côté front — utiliser `loadTestEntities()` (cache 5 min, fallback `TEST_ENTITIES`).
- **Stats** : RPC `count_test_data_stats()` (SECURITY DEFINER, admin-only, raise P0001 sinon). Une seule requête côté front au lieu de N.
- **Purge manuelle** : edge function `cleanup-test-data-batch` → boucle 23 étapes × `_cleanup_test_data_chunk_internal(p_step, p_limit=500)`. Validation JWT + rôle admin/super_admin obligatoire. Renvoie 200 `{ok:false, failed_step}` sur échec partiel (NE PAS jeter une 5xx). Renvoie aussi `truncated_steps[]` quand `MAX_ITERATIONS_PER_STEP=200` est atteint avec un dernier batch plein → indique qu'il reste probablement des données à purger.
- **Source unique des étapes** : `supabase/functions/_shared/cleanupSteps.ts` (serveur) + `src/components/admin/test-mode/cleanupSteps.ts` (front, miroir manuel). NE PAS dupliquer la liste ailleurs ; la modifier aux deux endroits simultanément.
- **Purge auto** : cron `cleanup-test-data-daily-rpc` à 03:00 UTC appelle `public.cleanup_all_test_data_auto()` directement (pas de http_post). Le cron `cleanup-test-data-daily` historique (avec anon key embarqué) a été supprimé.
- **Anti-prod** : trigger `prevent_test_in_prod` + audit unifié `MANUAL_TEST_DATA_CLEANUP_BATCHED` (avec `truncated_steps`), `TEST_MODE_ENABLED/DISABLED`, `TEST_DATA_GENERATED` dans `audit_logs`.

### Frontend
- **Orchestrateur** : `src/components/admin/AdminTestMode.tsx`. Désactivation interceptée → `AlertDialog` 3 chemins (annuler / désactiver seul / désactiver+purger). La branche désactiver+purger délègue au `cleanupTestData` du hook (pas d'invocation directe `supabase.functions.invoke` dupliquée).
- **Génération en arrière-plan** : depuis avr. 2026, `useTestDataActions.generateTestData` n'exécute plus rien dans le navigateur. Elle invoque l'edge function `generate-test-data` qui crée une ligne `test_generation_jobs` (status `queued`), lance `EdgeRuntime.waitUntil(runJob)` puis répond immédiatement `202 { job_id }`. La génération continue côté serveur même si l'admin ferme l'onglet. Le hook `useTestGenerationJob` (Realtime + polling 4 s + `localStorage['test-mode:active-job']`) restaure la barre de progression au reload. Bouton « Annuler » → `UPDATE status='cancelled'` ; `runJob` vérifie ce flag entre chaque étape. Un seul job actif à la fois (index unique partiel `uniq_active_test_generation_job`). Étapes blocking : `verify`, `parcels`, `contributions`, `invoices`, `payments`. Toast d'achèvement déclenché une seule fois via `lastToastedJobId`.
- **Générateurs partagés** : code copié dans `supabase/functions/_shared/test-mode-generators/` (miroir de `src/components/admin/test-mode/generators/`). NE PAS éditer un seul des deux côtés ; appliquer les correctifs aux DEUX. Le client `supabase` y est remplacé par `admin` (service-role) via `testModeAdminClient.ts`. Les fichiers client (`generationStepsRegistry.ts`, `testDataGenerators.ts`, dossier `generators/`) restent en place comme archive mais ne sont plus appelés.
- **Progression purge** : `useTestDataActions` expose `cleanupPerStep`, `cleanupFailedStep`, `cleanupTruncatedSteps`. `<CleanupProgress>` est branché sur ces valeurs — visible sur les 3 chemins (manuel, régénération, désactivation+purge). NE PAS dupliquer un état local `cleanupRunning/cleanupResult` dans `AdminTestMode`.
- **Dry-run** : RPC `count_test_data_to_cleanup()` (SECURITY DEFINER, admin-only, miroir des filtres de `_cleanup_test_data_chunk_internal`). Bouton « Simuler la purge » dans `TestDataStatsCard` → dialogue `TestDryRunButton` triant les 23 étapes par volume décroissant. Aucune écriture. Utiliser `supabase.rpc(...)` typé — pas de cast `as any`.
- **Helpers chiffrés** : `getExpectedTestDataCounts()` dans `_shared.ts` dérive les volumes attendus de `TOTAL_PARCELS`. Le `TestModeGuide` consomme cette source — NE PAS écrire de chiffres en dur.
- **Compteur entités** : `TestDataStatsCard` et `TestModeGuide` lisent `entities.length` depuis la registry.
- **Bandeau test** : `TestEnvironmentBanner` (top-right, badge warning + dot pulse, z-50) doit rester visible sur `/test/*`. Pas de `text-[10px] opacity-60`.
- **Bandeau financier** : `TestModeBanner` lit `test_mode_billing_alert_pct` (défaut 0.5) et `test_mode_billing_min_volume` (défaut 20) depuis `system_settings`.
- **Visibilité opérationnelle** : `TestCleanupHistoryCard` (RPC `get_test_cleanup_history`, typée), `TestCronStatusCard` (RPC `get_cron_run_history`, typée), `CleanupProgress` (alimenté par `per_step` + `truncated_steps` de l'edge function — affiche un bandeau warning si plafond atteint).
- **Export CSV** : `TestDataExportButton` paginé via `.range()` par paquets de 1 000 lignes, plafond hard `HARD_CAP=50_000` par entité. Détection de troncature : `truncated=true` quand `allRows.length >= HARD_CAP` après un batch plein (le bug pré-passe-D mettait `from >= HARD_CAP` après break, marqueur jamais déclenché). Header CSV marqué `(TRONQUÉ à 50000)` et toast warning listant les entités tronquées.

### Performance suppression (avr. 2026 — passe F)
- **Index FK obligatoires** sur tous les enfants de `cadastral_parcels` : `cadastral_mortgages`, `cadastral_boundary_history`, `cadastral_land_disputes`, `mutation_requests`, `real_estate_expertise_requests`, `subdivision_requests` (`parcel_id`). Sans ces index, `DELETE FROM cadastral_parcels` force PostgreSQL à seq-scan ces enfants pour les vérifications FK (CASCADE et NO ACTION) → statement_timeout systématique au-delà de quelques centaines de lignes.
- **`_cleanup_test_data_chunk_internal` doit setter `statement_timeout=60s`** via `set_config(..., true)` (LOCAL transaction) en début de fonction. Le défaut PostgREST (~8 s) est trop court pour les très gros lots.
- **BATCH passé à 1000** côté `cleanup-test-data-batch` une fois les index en place. `Promise.race` avec timeout client 90 s par RPC pour ne pas pendre indéfiniment.

### Heartbeat & jobs orphelins (avr. 2026 — passe F)
- **Heartbeat périodique 20 s** : `runJob` ouvre un `setInterval` qui met à jour `heartbeat_at = now()` indépendamment des steps. Clear obligatoire dans `finally`.
- **RPC `_purge_stale_test_generation_jobs()`** : marque en `error` les jobs `running`/`queued` dont `heartbeat_at < now() - interval '3 minutes'`. Appelée AVANT chaque vérification de verrou par `generate-test-data` ET `cleanup-test-data-batch` (best-effort, non-bloquant).
- **Bouton « Forcer le déverrouillage »** côté UI : `useTestGenerationJob.forceUnlock()` invoque la RPC et reset le state. Bouton affiché dans `<GenerationProgress>` quand `isStale=true` (heartbeat client > 3 min).
- **Audit log** : `table_name='test_generation_jobs'` (et non `cadastral_contributions` comme avant).

### Bypass d'audit pendant la purge (avr. 2026 — passe G — CRITIQUE)
- **Cause racine du timeout `parcels`** : trigger `audit_cadastral_parcels` AFTER DELETE FOR EACH ROW appelle `audit_cadastral_changes()` → `to_jsonb(OLD)` (parcelle entière, géométrie incluse) + INSERT dans `audit_logs` (917 MB). 1000 inserts JSONB lourds en transaction = timeout systématique, même avec FK indexées et enfants vides.
- **Solution** : flag session-scoped `app.test_cleanup_in_progress = '1'` posé par `_cleanup_test_data_chunk_internal` via `set_config(..., true)` (LOCAL). Les fonctions `audit_cadastral_changes` et `audit_history_changes` testent ce flag en début et early-return (sans audit) UNIQUEMENT si la ligne concerne un `parcel_number LIKE 'TEST-%'` (pour `audit_cadastral_changes`) ou systématiquement pour `audit_history_changes` (les history rows sont cascadées et n'ont pas de parcel_number propre fiable).
- **Statement timeout** porté à **120 s** dans `_cleanup_test_data_chunk_internal` (large marge maintenant que l'audit est court-circuité).
- **NE JAMAIS** retirer `set_config('app.test_cleanup_in_progress', '1', true)` de la RPC : sans lui, la suppression repasse en timeout sur le step `parcels`.
- **NE JAMAIS** appliquer le bypass à des opérations utilisateur (le `set_config` LOCAL ne fuit pas hors transaction — préserver ce confinement).
- Toute future table à audit + future purge massive doit utiliser le même pattern session-flag.

### Pièges historiques
- `generators/rollback.ts` supprimé (dead code, doublait la purge serveur sans FK-safety).
- `useTestMode` lit `cadastral_search_config` (config_key=`test_mode`) — ne pas dupliquer ailleurs.
- Pas de tests E2E vitest pour le mode test (pas de framework dans le projet) — les invariants tiennent via la registry serveur + la RPC dry-run.
- Avant la passe D, `<CleanupProgress>` n'était visible QUE sur le chemin désactiver+purger ; les boutons « Nettoyer tout » et « Régénérer » n'avaient qu'un spinner. Corrigé en remontant l'état dans le hook.
- Audit log post-purge : `table_name='multiple'` (la purge concerne 23 tables — `cadastral_parcels` était trompeur).
