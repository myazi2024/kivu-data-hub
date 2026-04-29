---
name: Test mode hardening
description: Architecture mode test admin — RPC stats/cleanup, registry dynamique, edge function FK-safe, audit, banners
type: feature
---

## Invariants Mode Test admin

### Serveur (Supabase)
- **Registry** `public.test_entities_registry` = source de vérité des entités TEST suivies. Migration `20260422093055` désactive 6 entités historiques (fraudAttempts, ownership/tax/boundary History, expertise/mortgage Payments). Ne PAS hardcoder de listes côté front — utiliser `loadTestEntities()` (cache 5 min, fallback `TEST_ENTITIES`).
- **Stats** : RPC `count_test_data_stats()` (SECURITY DEFINER, admin-only, raise P0001 sinon). Une seule requête côté front au lieu de N.
- **Purge manuelle** : edge function `cleanup-test-data-batch` → boucle 23 étapes × `_cleanup_test_data_chunk_internal(p_step, p_limit=500)`. Validation JWT + rôle admin/super_admin obligatoire. Renvoie 200 `{ok:false, failed_step}` sur échec partiel (NE PAS jeter une 5xx).
- **Purge auto** : cron `cleanup-test-data-daily-rpc` à 03:00 UTC appelle `public.cleanup_all_test_data_auto()` directement (pas de http_post). Le cron `cleanup-test-data-daily` historique (avec anon key embarqué) a été supprimé.
- **Anti-prod** : trigger `prevent_test_in_prod` + audit unifié `MANUAL_TEST_DATA_CLEANUP_BATCHED`, `TEST_MODE_ENABLED/DISABLED`, `TEST_DATA_GENERATED` dans `audit_logs`.

### Frontend
- **Orchestrateur** : `src/components/admin/AdminTestMode.tsx`. Désactivation interceptée → `AlertDialog` 3 chemins (annuler / désactiver seul / désactiver+purger).
- **Génération** : `useTestDataActions` (≈250 LOC) délègue la séquence à `generationStepsRegistry.buildGenerationSteps()`. Chaque step déclare `{ key, label, blocking, run(ctx) }` ; le hook itère, met à jour `GenerationProgress`, collecte `ctx.failedSteps` et marque l'étape `error` si une sous-tâche a échoué. Étapes blocking : `verify`, `parcels`, `contributions`, `invoices`, `payments`. Guard anti-doublon via count `TEST-%` sur `cadastral_parcels` avant de lancer.
- **Dry-run** : RPC `count_test_data_to_cleanup()` (SECURITY DEFINER, admin-only, miroir des filtres de `_cleanup_test_data_chunk_internal`). Bouton « Simuler la purge » dans `TestDataStatsCard` → dialogue `TestDryRunButton` triant les 23 étapes par volume décroissant. Aucune écriture.
- **Helpers chiffrés** : `getExpectedTestDataCounts()` dans `_shared.ts` dérive les volumes attendus de `TOTAL_PARCELS`. Le `TestModeGuide` consomme cette source — NE PAS écrire de chiffres en dur.
- **Compteur entités** : `TestDataStatsCard` et `TestModeGuide` lisent `entities.length` depuis la registry.
- **Bandeau test** : `TestEnvironmentBanner` (top-right, badge warning + dot pulse, z-50) doit rester visible sur `/test/*`. Pas de `text-[10px] opacity-60`.
- **Bandeau financier** : `TestModeBanner` lit `test_mode_billing_alert_pct` (défaut 0.5) et `test_mode_billing_min_volume` (défaut 20) depuis `system_settings`.
- **Visibilité opérationnelle** : `TestCleanupHistoryCard` (RPC `get_test_cleanup_history`), `TestCronStatusCard` (RPC `get_cron_run_history`), `CleanupProgress` (alimenté par `per_step` de l'edge function).
- **Export CSV** : `TestDataExportButton` paginé via `.range()` par paquets de 1 000 lignes, plafond hard `HARD_CAP=50_000` par entité. Si plafond atteint, header CSV marqué `(TRONQUÉ à 50000)` et toast warning listant les entités tronquées. Plus de `.limit(5000)` silencieux.

### Pièges historiques
- `generators/rollback.ts` supprimé (dead code, doublait la purge serveur sans FK-safety).
- `useTestMode` lit `cadastral_search_config` (config_key=`test_mode`) — ne pas dupliquer ailleurs.
- Pas de tests E2E vitest pour le mode test (pas de framework dans le projet) — les invariants tiennent via la registry serveur + la RPC dry-run.
