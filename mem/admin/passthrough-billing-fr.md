---
name: Refacturation pass-through
description: Workflow refacturation frais providers (Stripe/MoMo) — règles configurables par scope, génération mensuelle auto, double contrôle cohérence
type: feature
---

Module **Finance → Refacturation pass-through** (`tab=passthrough`, `AdminPassthroughBilling`).

## Tables
- `passthrough_rules` (scope_type: reseller|partner|payment_method|global, markup_pct, min_amount_usd, billing_cycle, active) — clé unique (scope_type, scope_id)
- `passthrough_invoices` (statut: draft|validated|sent|paid|disputed|cancelled, total_provider_fees_usd, markup_amount_usd, total_billed_usd, consistency_check_passed, invoice_number `PT-YYYYMM-NNNN`) — clé unique (scope_type, scope_id, period_start, period_end)
- `passthrough_invoice_lines` (1 ligne = 1 payment_transaction)
- `passthrough_invoice_seq_year` (séquence annuelle)

## RPC (SECURITY DEFINER, admin only)
- `generate_passthrough_invoices(start, end)` — itère règles actives, agrège transactions éligibles, idempotent
- `validate_passthrough_invoice(id)` — recalcule, bloque si écart > 0.01 USD, génère invoice_number
- `get_eligible_passthrough_transactions(scope, id, start, end)` — source unique des transactions éligibles (filtre status=completed, fee>0)
- `get_eligible_passthrough_transactions_count(...)` — preview impact règle

## Cohérence (double contrôle)
1. **Trigger ligne** `check_passthrough_line_consistency` : vérifie `billed_usd = fee * (1 + markup/100)` à chaque insert/update — refuse si écart > 0.01 USD
2. **RPC validation** : recalcule depuis payment_transactions au moment de la validation, bloque si écart vs total stocké

## Cron
`auto_generate_passthrough` — 1er du mois à 02:00 UTC, génère brouillons pour le mois précédent (n'écrase jamais grâce à clé unique).

## Vue
`passthrough_billing_summary` (security_invoker=on) — KPI 12 derniers mois (factures, fees, markup, total, incohérences).

## Scope mapping
- `global` : toutes transactions
- `payment_method` : `payment_transactions.payment_method = scope_id`
- `reseller` : via `reseller_sales.invoice_id = payment_transactions.invoice_id`, match `reseller_id`
- `partner` : `metadata->>'partner_id' = scope_id`

## Hors scope v1
- USD only (pas de multi-devise)
- Pas d'envoi email auto (action manuelle "Marquer envoyée")
- Pas de PDF dédié (réutilisera `generateInvoicePdf` plus tard)
