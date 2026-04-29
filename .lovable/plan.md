## Audit Mode Test — bugs résiduels identifiés

Après les passes A/B/C, l'audit révèle **6 bugs réels** restants. Aucun n'est cosmétique.

### 🔴 P0 — Bugs fonctionnels

**1. `CleanupProgress` invisible lors d'une purge manuelle**
`AdminTestMode.tsx` ne set `cleanupRunning` / `cleanupResult` que dans `handleDisableWithCleanup` (désactivation+purge). Les boutons « Nettoyer tout » et « Régénérer » appellent `cleanupTestData()` / `regenerateTestData()` du hook qui n'expose **aucun `perStep` ni état de progression**. Conséquence : utilisateur voit juste un spinner sur le bouton, sans aucun retour sur les 23 étapes — alors que toute l'infra existe.

→ Faire remonter `cleanupPerStep`, `cleanupFailedStep`, `cleanupRunning` depuis `useTestDataActions` (déduplication avec l'état local d'`AdminTestMode`), et brancher `<CleanupProgress>` sur ces valeurs pour les 3 chemins (désactivation, nettoyage manuel, régénération).

**2. Drift registry ↔ liste `STEPS` du edge function `cleanup-test-data-batch`**
La constante `STEPS` (23 entrées) est dupliquée :
- `supabase/functions/cleanup-test-data-batch/index.ts`
- `src/components/admin/test-mode/CleanupProgress.tsx` (`CLEANUP_STEPS`)

Or la registry serveur `test_entities_registry` a désactivé 6 entités (fraudAttempts, ownership/tax/boundary History, expertise/mortgage Payments) — mais `STEPS` les contient encore. Résultat : l'UI affiche 23 étapes dont plusieurs avec compteur 0, et la simulation dry-run montre des étapes « fantômes ». La RPC `_cleanup_test_data_chunk_internal` traite probablement le step en no-op, mais la liste affichée est trompeuse.

→ Charger la liste d'étapes depuis la registry / RPC plutôt que de la hardcoder, ou au minimum la sync via un fichier partagé `_shared/cleanupSteps.ts` côté edge + côté front.

**3. `MAX_ITERATIONS_PER_STEP=200` peut tronquer silencieusement**
Si une étape dépasse 100 000 lignes (200 × 500), la boucle sort sans erreur, le `summary[step]` reflète seulement ce qui a été supprimé, et l'audit log indique « ok ». Pas de marqueur `truncated`.

→ Ajouter un flag `truncated_steps: string[]` quand `i === MAX_ITERATIONS_PER_STEP - 1 && deleted === BATCH`, l'inclure dans la réponse JSON et l'audit, surfacer un toast warning frontend.

### 🟠 P1 — Bugs typage / DX

**4. `TestDryRunButton` et `TestCronStatusCard` cassent le typage**
- `TestDryRunButton.tsx:33` : double cast `supabase as unknown as {...}` → la RPC `count_test_data_to_cleanup` est dans `types.ts` (visible dans la mémoire). Le cast est obsolète.
- `TestCronStatusCard.tsx:27` : `(supabase as any).rpc('get_cron_run_history', …)` — pareil, RPC déclarée par migration P1.
- `TestCleanupHistoryCard.tsx` : à vérifier mais probablement le même pattern.

→ Retirer les casts, utiliser le client typé.

**5. `TestDataExportButton` — détection `truncated` foireuse**
Lignes 52-57 : `if (batch.length < PAGE_SIZE) break` exécute le break **avant** d'incrémenter `from`. Donc le bloc `if (from >= HARD_CAP …)` n'est atteint que si on remplit 50 pages pleines puis on rentre dans une 51e itération impossible (la condition de boucle `from < HARD_CAP` interdit). Le flag `truncated` ne sera **jamais** mis à `true` correctement, et `truncatedEntities` reste vide même quand on dépasse.

→ Réécrire la détection : marquer `truncated = true` dès qu'on a atteint exactement `HARD_CAP` lignes accumulées et que le dernier batch était plein.

### 🟡 P2 — Robustesse

**6. `regenerateTestData` ne reset pas `generationSteps`**
Quand on enchaîne purge → génération via `regenerateTestData`, le `setRegenerating(true)` est positionné mais `setGeneratingData` reste `false` au début. `<GenerationProgress visible={generatingData}>` sera bien visible à partir de la phase générer, OK. Mais les 23 cases de `<CleanupProgress>` ne sont jamais affichées car même bug que (1).

→ Couvert par le fix (1).

---

## Plan d'implémentation

### Étape 1 — Centraliser la liste des étapes de purge
- Créer `supabase/functions/_shared/cleanupSteps.ts` exportant `CLEANUP_STEPS` (source unique).
- Réutiliser dans `cleanup-test-data-batch/index.ts`.
- Côté front : créer `src/components/admin/test-mode/cleanupSteps.ts` aligné, ou mieux : exposer une RPC `get_cleanup_steps()` qui lit la registry serveur (filtre `active=true`) et renvoie l'ordre d'exécution. `CleanupProgress` consomme cette liste.
- Mettre à jour edge function pour skipper les steps désactivés en registry → la liste devient cohérente.

### Étape 2 — Streamer la progression de purge sur tous les chemins
- Refactor `useTestDataActions` :
  - Ajouter état interne `cleanupPerStep`, `cleanupFailedStep`, `cleanupRunning`, `cleanupTruncated`.
  - `invokeCleanup()` set ces états avant/après l'appel.
  - Exposer dans le retour du hook.
- `AdminTestMode.tsx` :
  - Supprimer `cleanupRunning` / `cleanupResult` locaux et utiliser ceux du hook (sauf pour la branche désactivation+purge qui a son propre flow — alignée pareil).
  - `<CleanupProgress visible={cleanupRunning || cleanupResult}>` branché sur l'état hook unifié.

### Étape 3 — Détection de troncature edge function
Modifier `cleanup-test-data-batch/index.ts` :
```ts
const truncated_steps: string[] = [];
// dans la boucle interne :
if (i === MAX_ITERATIONS_PER_STEP - 1 && deleted === BATCH) {
  truncated_steps.push(step);
}
// dans la réponse :
return json({ ok: true, ..., truncated_steps });
```
Front : afficher toast warning si `truncated_steps.length > 0`.

### Étape 4 — Nettoyage typage
- Retirer les casts `as any` / `as unknown as {...}` dans `TestDryRunButton`, `TestCronStatusCard`, `TestCleanupHistoryCard`.

### Étape 5 — Fix détection troncature export CSV
Réécrire la boucle de pagination dans `TestDataExportButton.tsx` :
```ts
while (allRows.length < HARD_CAP) {
  const remaining = HARD_CAP - allRows.length;
  const pageSize = Math.min(PAGE_SIZE, remaining);
  // …range(from, from + pageSize - 1)
  allRows.push(...batch);
  if (batch.length < pageSize) break;          // fin naturelle
  from += pageSize;
  if (allRows.length >= HARD_CAP) {            // plafond atteint
    truncated = true;
    truncatedEntities.push(entity.label);
    break;
  }
}
```

### Étape 6 — Mémoire
Mettre à jour `mem/admin/test-mode-hardening-fr.md` : nouvelle section « Source unique des étapes de purge », flag `truncated_steps` documenté, suppression des casts `as any`.

---

## Détails techniques

| Fichier | Modification |
|---|---|
| `supabase/functions/_shared/cleanupSteps.ts` | **Nouveau** — `export const CLEANUP_STEPS` |
| `supabase/functions/cleanup-test-data-batch/index.ts` | Importer `CLEANUP_STEPS`, ajouter `truncated_steps` |
| Migration SQL | RPC optionnelle `get_cleanup_steps()` lisant `test_entities_registry` |
| `src/components/admin/test-mode/cleanupSteps.ts` | **Nouveau** — miroir front (ou hook RPC) |
| `src/components/admin/test-mode/CleanupProgress.tsx` | Consommer la liste centralisée + afficher truncation |
| `src/components/admin/test-mode/useTestDataActions.ts` | Exposer `cleanupPerStep`, `cleanupFailedStep`, `cleanupRunning` |
| `src/components/admin/AdminTestMode.tsx` | Brancher progress unifié sur tous les chemins |
| `src/components/admin/test-mode/TestDataExportButton.tsx` | Réécrire détection `truncated` |
| `src/components/admin/test-mode/TestDryRunButton.tsx` | Retirer cast `as unknown as {...}` |
| `src/components/admin/test-mode/TestCronStatusCard.tsx` | Retirer `as any` |
| `src/components/admin/test-mode/TestCleanupHistoryCard.tsx` | Retirer `as any` (à vérifier) |
| `mem/admin/test-mode-hardening-fr.md` | Documenter invariants supplémentaires |

Aucun nouveau secret ni dépendance.
