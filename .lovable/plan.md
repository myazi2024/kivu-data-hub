## Audit du Mode Test admin

Périmètre audité : page `AdminTestMode`, hooks (`useTestMode`, `useTestDataActions`, `useTestDataStats`), générateurs (`/test-mode/generators/*`, 14 modules), edge function `cleanup-test-data-batch`, cron `cleanup-test-data-daily-rpc`, garde-fous DB (registry, RPC stats, trigger anti-prod), bandeaux UI (`TestEnvironmentBanner`, `TestEmptyStateBanner`, `TestModeBanner` financier), filtres analytics (`useTestEnvironment.applyTestFilter`, toggle `excludeTest` du dashboard).

### Ce qui est solide

- **Architecture serveur correcte** : RPC `count_test_data_stats` (évite les 20 requêtes frontend), `_cleanup_test_data_chunk_internal` (purge FK-safe par lots de 500 × 23 étapes), `cleanup_all_test_data_auto` planifiée 03:00 UTC, registry `test_entities_registry` versionné en DB.
- **Sécurité d'accès** : edge function `cleanup-test-data-batch` valide le JWT + rôle `admin`/`super_admin`. RPC stats renvoie P0001 sur non-admin (géré côté UI).
- **UX de désactivation** : `AdminTestMode` intercepte la désactivation, propose 3 chemins (annuler / désactiver seul / désactiver + purger) ; alerte secondaire si aucune donnée test.
- **Anti-doublon génération** : guard `count('TEST-%')` avant `generateTestData`.
- **Audit trail** : `TEST_MODE_ENABLED/DISABLED`, `TEST_DATA_GENERATED`, `MANUAL_TEST_DATA_CLEANUP_BATCHED` loggués dans `audit_logs`.
- **Isolation environnement** : routes `/test/*` filtrent via `applyTestFilter`, dashboard admin a un toggle `Exclure tests`, bandeau financier alerte si >50 % de factures TEST.
- **Cron alert** : `system-alerts-check` lève `test_mode_long` si actif > 24 h.

### Écarts & risques identifiés

#### P0 — incohérences fonctionnelles

1. **Étiquette « 20 entités » obsolète** dans `TestDataStatsCard` : la registry réelle compte 14 entités actives (6 désactivées en migration `20260422093055`). La phrase « 20 entités » dans le dialogue de purge induit en erreur.
2. **Désynchro Guide ↔ générateurs** : le `TestModeGuide` annonce `~3 510 parcelles, ~1 170 factures, ~700 paiements…` — chiffres figés dans le texte alors que `BASE_PARCELS=10 × 351 multipliers = 3 510` est dérivable. Si un admin ajuste `BASE_PARCELS` ou les multipliers, le guide ment. À calculer dynamiquement (ou exposer via constante exportée).
3. **`rollback.ts` mort-code** : importé nulle part (vérification `rg`). Le rollback réel passe désormais par l'edge function. Le fichier double la logique avec une version frontend non-FK-safe (risque si quelqu'un l'invoque par erreur). À supprimer ou marquer `@deprecated`.

#### P1 — robustesse & visibilité

4. **Pas de feedback de purge en cours côté `handleDisableWithCleanup`** : on déclenche la purge sans `GenerationProgress`-équivalent. Sur 23 étapes × jusqu'à 100 k lignes, l'utilisateur voit juste un toast `info` puis attend. Ajouter une barre de progression streaming (ou au minimum afficher le `summary.per_step` en fin d'opération).
5. **Aucune visibilité sur l'historique de purge** : `audit_logs` contient `MANUAL_TEST_DATA_CLEANUP_BATCHED` mais aucune carte « Dernier nettoyage : X enregistrements, il y a 2 j » dans `AdminTestMode`. Utile pour répondre à « ai-je purgé avant la mise en prod ? ».
6. **Cron `cleanup-test-data-daily-rpc` opaque** : pas de panneau « Prochain run / Dernier run / Résultat ». Ajouter une carte lisant `cron.job_run_details` filtrée par `jobname='cleanup-test-data-daily-rpc'`.
7. **Bandeau financier seuil arbitraire** : `TestModeBanner` se déclenche à ≥ 50 % et ≥ 20 factures, hardcodé. À sortir dans `system_settings` (`test_mode_billing_alert_pct`, `test_mode_billing_min_volume`).
8. **`TestEnvironmentBanner` discret au point d'être invisible** sur fond clair (10 px, opacity 60). Sur une démo en plein écran, un admin peut ne pas réaliser qu'il est sur `/test/*`. Renforcer (badge top-right, bg amber subtil).

#### P2 — qualité & dette

9. **`useTestDataActions.ts` = 416 LOC monolithique** avec 14 étapes inline. Les libellés des étapes vivent dans le hook (`GENERATION_STEPS`) au lieu de la registry. Extraire un mapping `stepId → { label, generator }` + un orchestrateur générique réduirait à ~120 LOC.
10. **`uniqueSuffix` reste long** (timestamp+5 chars) → références TEST très verbeuses (`TEST-MUT-...-MFXY12K3-AB12C`). Acceptable mais nuit à la lecture des logs.
11. **Pas de dry-run** : impossible de simuler une purge avant de la lancer (uniquement export CSV pré-purge). Une RPC `count_test_data_to_cleanup()` qui renverrait `per_step` sans supprimer aiderait avant la mise en prod.
12. **`TestDataExportButton` limite à 5 000 lignes/table** — silencieusement tronqué sur les parcelles (3 510 OK aujourd'hui, mais si on monte les multipliers on perd des données dans l'export d'audit). Pagination ou warning explicite.
13. **`useTestMode` réplique partiellement** la lecture de `cadastral_search_config` que `verifyTestModeEnabled` refait — mutualiser via une seule source.
14. **Pas de test d'intégration E2E** vérifiant qu'un parcours « activer → générer → naviguer → désactiver+purger » termine à 0 enregistrement TEST.

### Plan d'action recommandé

Je propose d'attaquer en 2 passes (votre validation requise avant chaque):

**Passe A — corrections rapides (P0 + bandeau P1.8)**
- Supprimer `rollback.ts` et son barrel export.
- Calculer dynamiquement les chiffres du guide depuis `TOTAL_PARCELS` + un helper `getActiveTestEntities().length`.
- Remplacer « 20 entités » par `${entities.length} entités` dans le dialogue de purge.
- Renforcer `TestEnvironmentBanner` (taille + couleur amber).

**Passe B — visibilité opérationnelle (P1.4 → P1.7)**
- Carte « Historique des purges » (lecture `audit_logs` action LIKE `%TEST_DATA_CLEANUP%`, top 5).
- Carte « Cron auto-cleanup » (lecture `cron.job_run_details` via une RPC SECURITY DEFINER).
- Streaming des étapes durant la purge (réutiliser `GenerationProgress` paramétré avec les 23 étapes serveur, mises à jour via le `summary` final ou polling).
- Externaliser les seuils du `TestModeBanner` financier dans `system_settings`.

Les P2 (refactor `useTestDataActions`, dry-run, pagination export, E2E) sont à garder en réserve — pas de valeur immédiate, risque de régression sur module sensible.

### Détails techniques

- **Fichiers principaux concernés** :
  - `src/components/admin/AdminTestMode.tsx` (orchestrateur)
  - `src/components/admin/test-mode/{TestDataStatsCard,TestModeGuide,TestModeConfigCard,GenerationProgress,TestDataExportButton}.tsx`
  - `src/components/admin/test-mode/{useTestDataActions,useTestDataStats}.ts`
  - `src/components/admin/test-mode/generators/{_shared,rollback,index}.ts`
  - `src/components/{TestEnvironmentBanner,TestEmptyStateBanner}.tsx`, `src/components/admin/billing/TestModeBanner.tsx`
  - `supabase/functions/cleanup-test-data-batch/index.ts`
- **Migrations à créer (Passe B)** :
  - RPC `get_test_cleanup_history(limit int)` (SECURITY DEFINER, lit `audit_logs` filtrés).
  - RPC `get_cron_run_history(jobname text, limit int)` (SECURITY DEFINER, lit `cron.job_run_details`).
  - Settings `system_settings`: `test_mode_billing_alert_pct` (default 0.5), `test_mode_billing_min_volume` (default 20).

### Quel mode souhaitez-vous lancer ?

1. **Passe A seule** (rapide, ~15 min, zéro risque) — recommandé en priorité.
2. **Passe A + Passe B** (visibilité opérationnelle complète, nouvelles RPC).
3. **Tout, y compris P2** (refactor + dry-run + E2E) — plus ambitieux.
