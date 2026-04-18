
Sous-lot 2 du plan (C) Système — finalise les items P1 restants après le sous-lot 1 (Hub, audit paginé, snapshots, settings, /hr/me déjà livrés).

## Périmètre sous-lot 2

### 1. AdminAppearance — versioning + presets
- Trigger générique `audit_app_appearance_config` → `system_config_audit` (avant/après JSONB).
- Onglet "Historique" dans `AdminAppearance` listant les snapshots avec bouton "Restaurer cette version".
- 3 presets prêts (`Sombre Apple`, `Bleu corporate`, `Clair minimal`) chargeables en 1 clic.
- Champ "Google Fonts URL custom" + injection dynamique `<link>` dans `index.html` via hook.

### 2. AdminTestMode — idempotence + transaction
- Migration : index unique partiel `cadastral_parcels(parcel_number) WHERE is_test = true`.
- `useTestDataActions` : wrap chaque étape en `try/catch` avec rollback automatique (`cleanup_all_test_data`) si échec après étape 5.
- Clauses `ON CONFLICT (parcel_number) DO NOTHING` dans les inserts test → "Régénérer" devient idempotent.
- Toast récapitulatif : "X créés, Y ignorés (déjà présents)".

### 3. AdminHR — matricule auto + pagination + lien user
- Hook `useHREmployees` : `useState` page/pageSize, `.range()` 20/page, compteur exact.
- Form employé : champ `user_id` optionnel (combobox recherche `profiles` par email).
- Suppression du champ `matricule` dans le form (auto-généré BD via séquence déjà créée sous-lot 1).

### 4. AdminAuditLogs — drill-down
- Map `table_name` → route admin (ex: `cadastral_parcels` → `/admin/parcels?id=X`).
- Bouton "Voir l'enregistrement" sur chaque ligne si mapping connu (sinon désactivé).
- Modal "Détails JSON" : diff visuel before/after (utiliser `react-diff-viewer-continued` déjà absent → diff simple manuel ligne par ligne).

### 5. Seuils latence configurables
- `system_settings` : clés `health_db_threshold_ms`, `health_edge_threshold_ms` (défauts 500/1000).
- `AdminSystemHealth` lit depuis `useSystemSettings`, applique aux badges degraded/down.
- Section "Seuils santé" dans `AdminSystemSettings`.

## Fichiers
**Migrations** : trigger appearance audit, index unique partiel parcels test, seed settings seuils.
**Créés** : `src/components/admin/appearance/AppearanceHistoryTab.tsx`, `src/components/admin/appearance/AppearancePresets.tsx`, `src/components/admin/audit/AuditDrillDownButton.tsx`, `src/hooks/useAppearanceHistory.ts`, `src/hooks/useGoogleFontInjection.ts`.
**Édités** : `AdminAppearance.tsx`, `AdminTestMode.tsx` + `useTestDataActions.ts`, `useHREmployees.ts` + `AdminHREmployees.tsx`, `AdminAuditLogs.tsx`, `AdminSystemHealth.tsx`, `AdminSystemSettings.tsx`.

Reste après sous-lot 2 → sous-lot 3 (P2) : alertes proactives (notifications admin si seuils dépassés), workflow congés avec approbation, export config zip, cron snapshots health 5 min.
