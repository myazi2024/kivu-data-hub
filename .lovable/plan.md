

## L7 (suite) — Migrer subdivision / permits / billing vers `useAdminAnalytics`

Finaliser la couverture du tracking admin en instrumentant les trois derniers gros modules d'actions critiques avec le helper centralisé `useAdminAnalytics`, ainsi que quelques modules fiscaux/paiements oubliés. Aucun changement de comportement utilisateur — uniquement analytics + invalidation queryKey unifiée.

### Modules à instrumenter

**1. Subdivision (Lotissement)**
- `src/components/admin/AdminSubdivisionRequests.tsx`
  - `handleStartReview` → `action: 'start_review'`
  - `submitAction` (approve / reject / return) → après `toast`, avant `setShowActionDialog(false)`
  - `handleReassignOne` / `handleBulkReassign` → `action: 'reassign'` / `'bulk_reassign'`
  - `handleBulkConfirm` → `action: 'bulk_<action>'` avec `meta: { success, failed, count }`
  - Tous avec `module: 'subdivision'`, `ref: { request_id, reference_number }`

**2. Permits (Autorisations de bâtir)**
- `src/components/admin/permits/PermitRequestDialog.tsx`
  - Action principale (approve / reject / return) → après `toast.success` final (ligne ~221)
  - `module: 'permits'`, `ref: { contribution_id, parcel_number }`, `meta: { certificate_generated: boolean }`

**3. Billing**
- `src/components/admin/billing/PurgeTestDataButton.tsx` → `action: 'purge_test_data'`, `meta: { archived_invoices, archived_transactions }`
- `src/components/admin/billing/MortgageDisputeFeesTab.tsx` → `action: 'update_fees_config'`, `ref: { config_key }`
- `src/components/admin/AdminInvoiceReminders.tsx` → `action: 'send_reminder'` / `'bulk_send_reminders'`, `meta: { ok, failed }`
- `src/components/admin/AdminPaymentReconciliation.tsx` → `action: 'reconcile_transaction'`, `ref: { transaction_id }`
- `src/components/admin/AdminFiscalPeriods.tsx` → `action: 'close_period'` / `'reopen_period'`, `ref: { year, month }`

**4. Bonus — déclarations fiscales (module manquant)**
- `src/components/admin/AdminTaxDeclarations.tsx` → approve / reject / return
- Ajouter `'tax'` à l'union `AdminModule` dans `src/lib/adminAnalytics.ts`
- Mapping invalidation : `[['admin-pending-counts'], ['tax-declarations'], ['user-resource', 'cadastral_contributions']]`

### Modifications du helper

`src/lib/adminAnalytics.ts` :
- Étendre `AdminModule` avec `'tax'`
- Ajouter une entrée correspondante à `INVALIDATION_MAP`
- Le reste du helper reste inchangé (déjà couvre `subdivision`, `permits`, `billing`)

### Détails techniques

- **Pattern d'appel** : toujours `await trackAdminAction({...})` après le `toast.success` / `toast({ title })` et **avant** `setOpen(false)` / `fetchX()`, comme documenté dans `mem://admin/admin-analytics-tracking-fr`.
- **Pas de PII** : payloads limités à `id`, `reference_number`, `parcel_number`, compteurs et flags booléens.
- **Bulk actions** : un seul `trackAdminAction` par action groupée avec `meta: { count, success, failed }` plutôt qu'une émission par item, pour éviter le bruit analytics.
- **Reassign** : tracé même s'il ne change pas de status — utile pour analyser la charge des assignés.
- **Aucune migration SQL**, aucun edge function modifié.

### Mémoire

Mettre à jour `.lovable/memory/admin/admin-analytics-tracking-fr.md` :
- Compléter la liste des modules instrumentés avec `subdivision`, `permits`, `billing`, `tax`
- Documenter les nouvelles actions (`start_review`, `reassign`, `bulk_reassign`, `purge_test_data`, `update_fees_config`, `send_reminder`, `bulk_send_reminders`, `reconcile_transaction`, `close_period`, `reopen_period`)

### Hors périmètre

- Pas de refonte UI ni de changement de workflow.
- Pas d'instrumentation des configs purement passives (sauvegardes de frais isolées hors `MortgageDisputeFeesTab`).
- Dette 2FA admin et modularisation `land-data-analytics` restent à planifier dans des lots séparés.

### Validation post-implémentation

- Vérifier en navigant sur subdivision/permits/billing que les compteurs sidebar (`admin-pending-counts`) se rafraîchissent automatiquement après chaque action.
- Confirmer dans la console réseau qu'un `admin_action` est émis par action critique avec le bon `module`.

