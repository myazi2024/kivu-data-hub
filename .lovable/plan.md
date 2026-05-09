## Audit du Mode Test (espace Admin)

Périmètre audité : `AdminTestMode.tsx`, `useTestMode`, `useTestDataActions`, `useTestGenerationJob`, `useTestDataStats`, edge functions `generate-test-data` + `cleanup-test-data-batch`, registres front/edge (`cleanupSteps`, `testEntities`, `generationStepsRegistry`), composants UI (`TestModeConfigCard`, `TestDataStatsCard`, `GenerationProgress`, `CleanupProgress`, `TestDryRunButton`, `TestDataExportButton`, `TestCleanupHistoryCard`, `TestCronStatusCard`, `TestEnvironmentBanner`, `billing/TestModeBanner`), trigger anti-prod et doc `docs/TEST_MODE.md`.

### Bugs confirmés

1. **Recovery 409 cassé dans `useTestGenerationJob.startJob`** — quand l'edge function renvoie 409 (job déjà actif), `supabase.functions.invoke` met `error` et `data=null`, donc la branche `body.active_job_id` n'est jamais atteinte. L'admin voit un message générique au lieu de récupérer le job actif. Lire `error.context?.body` (Response) pour récupérer le JSON 409 et exposer `active_job_id`.

2. **Stale closure dans `AdminTestMode.saveConfiguration`** — après activation, `if (wasJustEnabled && total === 0) generateTestData()` lit `total` capturé avant `refreshStats()` (snapshot pré-refresh). Peut auto-générer alors que des données existent ou ne pas générer alors qu'il faudrait. Solution : faire retourner le total par `refreshStats()` et utiliser cette valeur, ou déplacer la décision côté hook.

3. **Polling stale dans `useTestGenerationJob`** — `setInterval(() => { if (job && FINISHED.has(job.status)) return; fetchJob(); }, 4000)` capture `job` à la création de l'effet (deps = `[jobId]`), donc le garde ne déclenche jamais et on continue à puller un job déjà terminé jusqu'à démontage. Utiliser une ref ou ajouter `job?.status` aux deps.

4. **Channel Realtime collision dans `useTestMode`** — `supabase.channel('test-mode-changes')` est créé avec un nom statique réutilisé par 5 consommateurs (AdminTestMode, AdminPaymentMode, AdminPaymentMethods, AdminDashboardHeader, useCadastralPayment). Les channels Supabase requièrent un nom unique ; les abonnements suivants peuvent être ignorés silencieusement. Suffixer avec un id stable (ex. `test-mode-changes-${useId()}`) ou centraliser via un contexte unique.

### Dette / risques de dérive

5. **Code mort à supprimer** : `src/components/admin/test-mode/generators/*`, `testDataGenerators.ts`, `generationStepsRegistry.ts` — non importés (génération désormais 100 % serveur). Garder ces fichiers entretient le mythe d'un mirroring client/serveur (cf. point 8).

6. **Doublon `cleanupSteps.ts`** — copie manuelle entre `src/components/admin/test-mode/cleanupSteps.ts` et `supabase/functions/_shared/cleanupSteps.ts`. Pas de test pour vérifier la sync. Réimporter directement depuis `supabase/functions/_shared/cleanupSteps.ts` côté front (chemin relatif TS, juste un `export const`) pour avoir une source unique.

7. **Garde redondant + parfois trompeur dans `generateTestData`** — la requête `.like('parcel_number', 'TEST-%')` re-vérifie ce que le bouton n'expose déjà que quand `total === 0`. À supprimer (dupliqué) ou à remplacer par un appel à `count_test_data_stats` pour cohérence avec le reste de l'admin.

8. **Doc `docs/TEST_MODE.md` désynchronisée** :
   - Affirme que les générateurs serveur sont « la copie miroir de `src/components/admin/test-mode/generators/` » — faux depuis la migration vers `EdgeRuntime.waitUntil`.
   - Annonce « 10 tables » pour le trigger anti-prod alors que la liste de cleanup en couvre 23 entités (mortgage_payments, expertise_payments, building_permits, lots/roads de lotissement, certificats, etc. ne sont pas protégés au INSERT prod).
   Mettre à jour la doc et signaler les 7 entités sans garde anti-prod (sans étendre le trigger, qui sortirait du périmètre frontend de cette tâche).

### Hors-scope (à mentionner sans changer)

- Banner global "test mode actif" absent de l'espace admin (seules les routes `/test/*` affichent un badge). À discuter séparément si souhaité.
- `TestDataExportButton` exporte toutes les colonnes y compris potentiellement PII — suffixe TEST mais valeurs réalistes. À confirmer si on doit redacter.

### Plan d'exécution

1. Fix #1 — récupérer le 409 via `error.context.body` dans `useTestGenerationJob.startJob`.
2. Fix #2 — `useTestDataStats.refresh()` retourne `{ stats, total }` ; `AdminTestMode` lit la valeur retournée.
3. Fix #3 — déplacer `job` dans une ref synchronisée pour le poll.
4. Fix #4 — channel name unique par instance via `useId()`.
5. Fix #5 — supprimer `generators/`, `testDataGenerators.ts`, `generationStepsRegistry.ts`.
6. Fix #6 — front `cleanupSteps.ts` réexporte depuis le shared edge (`../../../supabase/functions/_shared/cleanupSteps`).
7. Fix #7 — retirer le pré-check `.like(...)` dans `generateTestData` (déjà gardé par l'UI + l'edge function).
8. Fix #8 — réécrire la section concernée de `docs/TEST_MODE.md` (mirroring + couverture trigger).

Aucune migration SQL. Aucun changement d'API edge function. Périmètre purement front + doc.