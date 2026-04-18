

## Audit — Mode Test (admin)

### Périmètre

| Fichier | LOC | État |
|---|---|---|
| `supabase/functions/cleanup-test-data/index.ts` | ~200 | Critique : auth cron cassée |
| `src/components/admin/test-mode/testDataGenerators.ts` | **1324** | Monolithe à découper |
| `src/hooks/useTestEnvironment.tsx` | 40 | OK |
| `src/hooks/useTestMode.tsx` | 80 | OK |
| `src/components/admin/billing/TestModeBanner.tsx` | 50 | OK mais incomplet |
| `applyTestFilter` | 20 fichiers | Couverture partielle |
| `cleanup_all_test_data` (RPC) | — | Check rôle à valider |

---

### Lot 1 — Bugs critiques

1. **Cron `cleanup-test-data-daily` retourne 403** : appelle l'edge function avec un JWT `anon` alors que la fonction exige un admin. → Soit la fonction accepte un secret partagé `CLEANUP_CRON_SECRET` pour les calls système, soit migrer vers la RPC `cleanup_all_test_data()` directement (préféré, plus simple).
2. **`applyTestFilter` non appliqué** sur écrans admin : `AdminCCCContributions`, `AdminMutationRequests`, `AdminInvoices`, `AdminPayments`, `AdminLandTitleRequests`. Données test fuitent dans la prod.
3. **`TestModeGuide.tsx`** documente qu'aucun cron n'est actif — fausse info, à corriger.
4. **Marqueur test incohérent sur `payments`** : préfixe `TEST-` sur certains, pas sur d'autres. Standardiser sur `transaction_type = 'TEST_SIMULATION'` + tag uniforme.
5. **Pas de trigger BD anti-insert** : rien n'empêche l'insertion de données préfixées `TEST-` quand `test_mode.enabled = false`. Trigger `prevent_test_data_in_prod()` recommandé.

### Lot 2 — Sécurité & observabilité

6. **`cleanup_all_test_data` RPC** : vérifier `has_role(auth.uid(), 'admin')` en début, sinon n'importe quel user authentifié peut purger.
7. **JWT en clair dans le cron SQL** — déplacer vers `vault.secrets`, lecture via `vault.decrypted_secrets`.
8. **Audit log asymétrique** : seul le cleanup manuel logge, pas l'auto. Unifier via `system_config_audit`.
9. **Rate-limit edge function** absent (10 req/min/admin suffisant).
10. **`TestModeBanner` invisible mobile** (50% width sm:) — toujours full width.

### Lot 3 — UX admin

11. **`TestModeConfigCard`** n'affiche pas dernier passage cron / prochaine exécution.
12. **Boutons "Nettoyer parcelles" affichés à 0 entrée** — masquer ou disable + tooltip.
13. **Pas de registry unifié `TEST_ENTITIES`** — chaque écran réinvente la liste des tables test.
14. **`/test/map` et `/test/cadastral-map` accessibles sans auth** — gating admin connecté seulement.
15. **Export CSV des données test** absent avant purge (audit/rollback).

### Lot 4 — Architecture

16. **`testDataGenerators.ts` 1324 LOC** → 10 modules : `parcels.ts`, `contributions.ts`, `invoices.ts`, `payments.ts`, `disputes.ts`, `expertise.ts`, `titles.ts`, `mortgages.ts`, `permits.ts`, `index.ts` (orchestrateur).
17. **`count_test_data_stats` RPC** : liste des tables hardcodée — passer en config dynamique (`test_entities_registry`).
18. **Génération séquentielle parcelles → enfants** : paralléliser après l'étape parcelles (Promise.all).
19. **Aucun test Deno** sur `cleanup-test-data` — ajouter test minimal (auth + retour structure).

---

### Question pour cadrage

Quel périmètre dois-je implémenter ?

- **(A) Lot 1 seul** — fix cron (migration vers RPC `cleanup_all_test_data` directement appelée), `applyTestFilter` sur 5 écrans admin, correction doc `TestModeGuide`, marqueur test standardisé, trigger BD anti-insert prod.
- **(B) Lots 1 + 2** — + check rôle RPC, JWT vers vault, audit log unifié, rate-limit, banner full-width mobile.
- **(C) Lots 1 + 2 + 3** — + dernier/prochain passage cron, masquage boutons inutiles, registry `TEST_ENTITIES`, gating `/test/*` admin, export CSV pré-purge.
- **(D) Plan complet 1+2+3+4** — + split `testDataGenerators.ts` (1324→10 fichiers), `count_test_data_stats` dynamique, parallélisation générateurs, test Deno cleanup.

