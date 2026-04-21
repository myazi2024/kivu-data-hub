

## Plan d'implémentation — Recommandations comptables P0 → P2

Implémentation séquencée des gaps critiques identifiés dans l'audit. Approche par lot pour limiter les régressions.

### Lot 1 — P0 Conformité comptable

#### 1.1 Périodes fiscales (`fiscal_periods`)
Migration SQL :
- Table `fiscal_periods` : `id`, `year`, `month` (1-12, nullable pour annuel), `period_type` (`monthly`|`yearly`), `status` (`open`|`closed`|`locked`), `closed_at`, `closed_by`, `revenue_total_usd`, `tva_collected_usd`, `invoice_count`, `notes`. Unique sur `(year, month, period_type)`.
- RLS : SELECT pour `admin`/`super_admin`, INSERT/UPDATE via RPC seulement.
- RPC `close_fiscal_period(p_year, p_month)` SECURITY DEFINER : calcule les totaux depuis `cadastral_invoices` payées, snapshot dans la ligne, passe `status=closed`.
- RPC `reopen_fiscal_period(p_id, p_reason)` : seulement `super_admin`, log audit.
- Trigger `prevent_invoice_in_closed_period` sur `cadastral_invoices` : bloque INSERT/UPDATE si `issue_date` tombe dans une période `closed`.

UI : nouveau module sidebar `fiscal-periods` (groupe Documents comptables) avec liste périodes, bouton « Clôturer le mois », snapshot KPIs, badge statut.

#### 1.2 Journal d'écritures comptables (`accounting_journal_entries`)
- Table `accounting_journal_entries` : `id`, `entry_date`, `journal_code` (VTE/BNQ/OD/AVO), `piece_ref` (n° facture/avoir), `account_code`, `account_label`, `debit_usd`, `credit_usd`, `description`, `source_table`, `source_id`, `fiscal_period_id` FK, `created_at`, `created_by`.
- Trigger `generate_journal_entries_on_invoice_paid` : sur passage `cadastral_invoices.status='paid'`, génère 3 écritures (411 Client débit / 706 Ventes crédit HT / 4457 TVA crédit).
- Trigger similaire pour `cadastral_credit_notes` (contrepassation) et `payment_refunds`.
- RPC `regenerate_journal_for_invoice(p_invoice_id)` pour rattrapage.
- RPC `export_fec_period` refactorée pour lire depuis `accounting_journal_entries` au lieu de calculer à la volée.

UI : module `accounting-journal` (groupe Documents comptables) — liste écritures filtrée par période/journal/compte, recherche par pièce, export CSV.

#### 1.3 Reporting TVA dédié
- Vue SQL `tva_collected_by_period` : agrégat mensuel TVA collectée + base HT + nb factures par devise.
- RPC `get_tva_declaration(p_year, p_month)` : retourne payload prêt pour déclaration DGI (TVA collectée, déductible=0 pour l'instant, à reverser).
- UI : module `tva-reporting` (groupe Documents comptables) — tableau mensuel, bouton « Générer déclaration » (PDF), historique déclarations.

### Lot 2 — P1 Maîtrise marge providers

#### 2.1 Frais providers ligne à ligne
Migration :
- `payment_transactions` : ajouter `provider_fee_usd numeric default 0`, `net_amount_usd numeric generated always as (amount_usd - coalesce(provider_fee_usd, 0)) stored`, `provider_fee_currency`, `provider_fee_raw jsonb`.

Edge functions :
- `stripe-webhook` : sur `charge.succeeded`, lire `balance_transaction.fee` via Stripe API, stocker dans `provider_fee_usd`.
- `process-mobile-money-payment` : enregistrer le `provider_fee_usd` calculé selon le tarif opérateur (config `payment_methods_config.fee_percent` + `fee_fixed`).
- Backfill RPC `backfill_provider_fees(p_from, p_to)` : applique estimations historiques pour les transactions existantes (basé sur taux moyen).

UI :
- `AdminPaymentServiceIntegration` : remplacer estimations 50/50 par valeurs réelles agrégées.
- Nouveau KPI dashboard financier : « Marge nette » (revenu brut − frais providers).

### Lot 3 — P2 Recouvrement & UX

#### 3.1 Balance âgée (Aging report)
- Vue SQL `invoices_aging_report` : pour chaque facture impayée, bucket (0-30, 30-60, 60-90, 90+), `days_overdue`, `amount_due_usd`, client, contact.
- Section dans `AdminInvoiceReminders` : tableau buckets + total par bucket + graphe pareto + bouton « Relancer en masse ».

#### 3.2 Workflow paiement commissions revendeurs
- Table `reseller_payment_batches` : `id`, `batch_number`, `period_start`, `period_end`, `reseller_id`, `total_commission_usd`, `status` (`pending`|`approved`|`paid`), `payment_method`, `payment_reference`, `paid_at`, `paid_by`.
- RPC `create_reseller_payment_batch(reseller_id, period_start, period_end)` : agrège `reseller_sales` non payées, crée le lot, marque `commission_paid=true` après confirmation.
- Trigger : sur `status='paid'`, génère écriture comptable (`accounting_journal_entries` : 622 Commissions débit / 401 Fournisseurs crédit, puis 401/512 au paiement).
- UI : module `reseller-payment-batches` (groupe Revendeurs) — création lot, historique, export bordereau.

#### 3.3 Clarification UX modules commissions
- Renommer/regrouper :
  - `reseller-sales` → « Ventes revendeurs » (transactions brutes)
  - `reseller-commissions` → « Performance revendeurs » (analytics)
  - `commissions` → fusionné dans nouveau `reseller-payment-batches` (« Paiement commissions »)
- Mise à jour `sidebarConfig.ts` + suppression de l'ancien `commissions` redondant.

### Lot 4 — Sortie

- Mémoires `mem://admin/` : `fiscal-closure-and-journal-fr`, `tva-reporting-fr`, `provider-fees-tracking-fr`, `reseller-payment-batches-fr`. Index mis à jour.
- Mise à jour `docs/DATABASE_SCHEMA.md` : nouvelles tables et vues.
- Mise à jour `docs/EDGE_FUNCTIONS.md` : changements stripe-webhook + process-mobile-money.
- Audit log via `logBillingAudit` pour toutes opérations sensibles (clôture, réouverture, paiement batch).

### Détail technique

```text
Flux après implémentation
─────────────────────────
Paiement → payment_transactions (+ provider_fee_usd réel)
        → trigger sync → cadastral_invoices.status=paid
        → trigger generate_journal_entries → accounting_journal_entries (411/706/4457)
        → trigger generate_reseller_sale → reseller_sales
                                         → batch création → reseller_payment_batches
                                         → paiement → écritures 622/401/512

Clôture mensuelle
─────────────────
Admin clique « Clôturer Mars 2026 »
  → RPC close_fiscal_period(2026, 3)
  → Calcul snapshot revenus/TVA
  → fiscal_periods.status = closed
  → Trigger bloque toute nouvelle facture avec issue_date dans Mars 2026

Déclaration DGI
───────────────
RPC get_tva_declaration(2026, 3) → PDF
RPC export_fec_period(...) → CSV FEC (depuis accounting_journal_entries)
```

### Critères de validation

1. Une facture payée crée 3 écritures dans `accounting_journal_entries`
2. Clôturer Mars 2026 puis tenter d'insérer une facture avec `issue_date='2026-03-15'` → erreur SQL
3. Module TVA affiche TVA collectée Mars 2026 = somme `tax_amount_usd` factures Mars payées
4. Stripe webhook réel : `provider_fee_usd` rempli avec le fee Stripe
5. Dashboard financier affiche « Marge nette » = brut − frais providers
6. Balance âgée : facture émise il y a 45j non payée apparaît dans bucket 30-60
7. Création batch commission : génère écriture 622/401, marquage `paid` génère 401/512
8. FEC exporté contient toutes les écritures de la période demandée (ligne par ligne)
9. Sidebar : 2 modules commissions au lieu de 3, libellés clairs
10. Audit : toutes opérations clôture/réouverture/paiement batch tracées

### Hors périmètre

- Pas de bilan/compte de résultat complet (P3)
- Pas d'archivage UI des invoices (P4)
- Pas d'historique de taux de change (P4)
- Pas de support multi-établissement (P4)
- Pas de connexion API directe DGI (export manuel)
- Frais Flutterwave/autres providers : seulement Stripe + MoMo dans ce lot

