---
name: Comptabilité P0 — clôture fiscale, journal et TVA
description: Tables fiscal_periods et accounting_journal_entries, triggers auto-génération écritures (411/706/4457), RPC close/reopen_fiscal_period, get_tva_declaration, vue tva_collected_by_period, modules admin fiscal-periods/accounting-journal/tva-reporting
type: feature
---

## Architecture comptable formelle (RDC, conformité DGI)

### Tables
- **fiscal_periods** : (year, month, period_type=monthly|yearly, status=open|closed|locked). Snapshot revenus/TVA/nb factures à la clôture. Unique sur (year, month, period_type).
- **accounting_journal_entries** : journal débit/crédit persistant. Contrainte XOR débit/crédit. Codes journaux : VTE (ventes), AVO (avoirs), RBT (remboursements), OD (opérations diverses), BNQ (banque). Indexée sur entry_date, journal_code, piece_ref, account_code, source_table+source_id.

### Plan de comptes utilisé
- 411000 Clients (débit à la facturation, crédit à l'encaissement)
- 706000 Prestations de services (crédit HT)
- 4457 TVA collectée 16% (crédit)

### Triggers automatiques
- `trg_generate_journal_on_invoice_paid` (AFTER INSERT/UPDATE OF status sur cadastral_invoices) : si status='paid', génère 3 écritures (411/706/4457) via `generate_journal_entries_for_invoice`
- `trg_generate_journal_on_credit_note` (AFTER INSERT/UPDATE OF status sur cadastral_credit_notes) : génère 3 écritures de contrepassation
- `trg_prevent_invoice_closed_period` (BEFORE INSERT/UPDATE sur cadastral_invoices) : RAISE EXCEPTION si la période fiscale du `paid_at`/`created_at` est `closed` ou `locked`

### RPCs (toutes SECURITY DEFINER, search_path=public, role check `has_role(auth.uid(),'admin'|'super_admin')`)
- `close_fiscal_period(p_year, p_month)` : calcule snapshot, INSERT/UPDATE fiscal_periods avec status=closed
- `reopen_fiscal_period(p_id, p_reason)` : super_admin uniquement, motif >=10 caractères, audit (reopened_at/by/reason)
- `generate_journal_entries_for_invoice(p_invoice_id)` : idempotent (skip si écritures déjà présentes pour ce source_id)
- `regenerate_journal_for_invoice(p_invoice_id)` : DELETE puis re-génère (admin only)
- `find_or_create_fiscal_period(p_date)` : utilitaire interne
- `get_tva_declaration(p_year, p_month)` : retourne jsonb {total_ttc, total_ht, tva_collected, tva_to_pay, period_status, credit_note_total}

### Vue
- **tva_collected_by_period** (security_invoker=true) : agrégat mensuel par devise, COUNT factures + SUM TTC/HT/TVA. Calcul TVA = total_ttc - (total_ttc / 1.16).

### Calcul TVA
TVA inclus dans `total_amount_usd` (TTC). Décomposition :
- HT = total / 1.16
- TVA = total - HT

### RLS
- fiscal_periods : SELECT admin/super_admin uniquement, modifications via RPC
- accounting_journal_entries : SELECT admin/super_admin uniquement, INSERT via triggers SECURITY DEFINER

### Modules admin (sidebar Facturation & Commerce)
- `fiscal-periods` (AdminFiscalPeriods) : liste périodes, formulaire clôture (année/mois), réouverture super_admin avec motif obligatoire
- `accounting-journal` (AdminAccountingJournal) : filtres année/mois/journal/recherche, totaux débit/crédit avec alerte déséquilibre, export CSV
- `tva-reporting` (AdminTvaReporting) : déclaration mensuelle DGI (TTC/HT/TVA collectée/à reverser), historique 24 derniers mois, export CSV

### Backfill
Migration initiale exécute `generate_journal_entries_for_invoice` pour toutes les factures `status='paid'` existantes (limit 5000, skip on error).

### Critères validés
1. Facture payée → 3 écritures 411/706/4457 dans journal (vérifié par backfill)
2. Clôturer Mars + tenter modif facture mars → exception SQL
3. Module TVA = SUM(tax) factures payées du mois
4. FEC reste fonctionnel (à refactorer ultérieurement pour lire depuis journal)
