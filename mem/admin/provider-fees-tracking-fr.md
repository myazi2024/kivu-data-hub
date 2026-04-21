---
name: Provider fees tracking
description: Suivi des frais providers ligne à ligne (Stripe + MoMo), colonne nette générée, vue agrégée, RPC backfill admin, KPI marge nette dashboard
type: feature
---

## Tracking des frais providers (Lot 2)

### DB
- `payment_transactions.provider_fee_usd` (numeric, default 0), `provider_fee_currency`, `provider_fee_raw` (jsonb), `net_amount_usd` GENERATED = `amount_usd - provider_fee_usd`
- `payment_methods_config.fee_percent`, `fee_fixed_usd` — préseed Stripe (2.9% + $0.30), MoMo (1.5%)
- Vue `revenue_net_by_period` (security_invoker) : agrégat mensuel par provider — `gross_revenue_usd`, `total_fees_usd`, `net_revenue_usd`, `effective_fee_percent`, `transaction_count`
- RPC `backfill_provider_fees(p_from, p_to)` SECURITY DEFINER admin-only : applique `amount * fee_percent + fee_fixed` aux transactions completed sans frais. Audit log `BACKFILL_PROVIDER_FEES`.

### Edge functions
- `stripe-webhook` : helper `fetchStripeFee(payment_intent_id)` → `stripe.paymentIntents.retrieve` + `latest_charge.balance_transaction` ; alimente `provider_fee_usd/_currency/_raw` sur tous les UPDATE de `payment_transactions` dans `checkout.session.completed`
- `process-mobile-money-payment` : calcule `computedFeeUsd = amount * fee_percent/100 + fee_fixed_usd` depuis `payment_methods_config` ; appliqué aux UPDATE de complétion (test + réel)

### UI
- `AdminFinancialDashboard` : KPI "Marge nette" ($net + frais providers + %), grille étendue à 5 colonnes, requête sur `payment_transactions` (gross/fees/net) sur la période
- À compléter (suivants) : `AdminPaymentMethods` édition `fee_percent`/`fee_fixed_usd` inline avec audit, `AdminPaymentServiceIntegration` lecture `revenue_net_by_period` au lieu de l'estimation 50/50

### Hors périmètre
- Reconciliation auto avec relevés Stripe/MoMo
- Frais Flutterwave/PayPal
- FX fees, refacturation pass-through
