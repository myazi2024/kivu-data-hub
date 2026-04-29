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
- **Génération** : `useTestDataActions` (14 étapes, sub-failures non bloquantes pour les étapes 6-13). Guard anti-doublon via count `TEST-%` sur `cadastral_parcels`.
- **Helpers chiffrés** : `getExpectedTestDataCounts()` dans `_shared.ts` dérive les volumes attendus de `TOTAL_PARCELS` (= Σ `BASE_PARCELS × multiplier` des 26 provinces). Le `TestModeGuide` consomme cette source — NE PAS écrire de chiffres en dur.
- **Compteur entités** : `TestDataStatsCard` et `TestModeGuide` lisent `entities.length` depuis la registry.
- **Bandeau test** : `TestEnvironmentBanner` (top-right, badge warning + dot pulse, z-50) doit rester visible sur `/test/*`. Pas de `text-[10px] opacity-60`.
- **Bandeau financier** : `TestModeBanner` (admin/billing) lit `test_mode_billing_alert_pct` (défaut 0.5) et `test_mode_billing_min_volume` (défaut 20) depuis `system_settings`. Pas de seuil hardcodé.
- **Visibilité opérationnelle** : `TestCleanupHistoryCard` lit RPC `get_test_cleanup_history(limit)` (audit purges/générations TEST). `TestCronStatusCard` lit RPC `get_cron_run_history('cleanup-test-data-daily-rpc', limit)`. Les deux RPC sont SECURITY DEFINER, admin-only (P0001), `GRANT TO authenticated` uniquement.
- **Streaming purge** : `CleanupProgress` montre les 23 étapes serveur (loader pendant l'exécution, ✓/✗ + nb supprimés à la fin). Alimenté par le `per_step` retourné par l'edge function `cleanup-test-data-batch`.

### Pièges historiques
- `generators/rollback.ts` a été supprimé (dead code, doublait la purge serveur sans FK-safety).
- `useTestMode` lit `cadastral_search_config` (config_key=`test_mode`) — ne pas dupliquer ailleurs.
- L'export CSV pré-purge (`TestDataExportButton`) est limité à 5 000 lignes/table — vigilance si on augmente `BASE_PARCELS`.
