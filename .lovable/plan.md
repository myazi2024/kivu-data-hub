
Sous-lot 3 (P2) — finalisation du plan (C) Système.

## Périmètre

### 1. Cron snapshots santé 5 min
- Edge function `health-snapshot` : ping DB/Auth/Storage/Edge → insert dans `system_health_snapshots`.
- pg_cron toutes les 5 min via `net.http_post` (clé anon, function publique).
- Purge auto > 30 j dans la même fonction.

### 2. Alertes proactives → notifications admin
- Edge function `system-alerts-check` (cron toutes les 15 min).
- Règles : `audit_logs > 1M`, dernière latence DB > seuil `system_settings`, edge_fn_status = down depuis > 3 snapshots, mode test actif > 24h.
- Insert dans `notifications` pour chaque admin (`user_roles WHERE role IN ('admin','super_admin')`).
- Anti-spam : table `system_alerts_state` (clé alerte → last_fired_at) → cooldown 6h par règle.

### 3. Workflow congés avec approbation
- Migration : ajouter `approved_by`, `reviewed_at`, `rejection_reason` à `hr_leave_requests` (vérifier existant), trigger `auto_decrement_leave_balance` lors du passage `approved`.
- Hook `useHRLeaves` : mutations `approveLeave(id)`, `rejectLeave(id, reason)`.
- Composant `AdminHRLeavesApproval.tsx` : table congés en attente, boutons approuver/refuser + dialog motif.
- Côté `/hr/me` : badge statut + motif de refus visible.

### 4. Export config système (zip JSON)
- Bouton dans `AdminSystemHub` "Exporter config complète".
- Util `exportSystemConfig.ts` : fetch parallèle de toutes tables `*_config` + `system_settings` + `parcel_actions_config` + `app_appearance_config`.
- Génération zip via `jszip` (déjà installé sinon ajout) + download blob.
- Fichier `system-config-YYYY-MM-DD.zip` contenant 1 JSON par table + `manifest.json` (versions, date, admin).

## Fichiers
**Migrations** : trigger décrément balance congés, table `system_alerts_state`, cron 5 min snapshot + cron 15 min alerts.
**Edge functions** : `supabase/functions/health-snapshot/index.ts`, `supabase/functions/system-alerts-check/index.ts`.
**Créés** : `src/components/admin/hr/AdminHRLeavesApproval.tsx`, `src/utils/exportSystemConfig.ts`, `src/components/admin/system/SystemConfigExportButton.tsx`.
**Édités** : `useHRLeaves.