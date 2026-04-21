

## Plan — Lot 2 : Maîtrise marge providers (P1)

### Objectif

Tracer les frais réels Stripe et Mobile Money par transaction pour calculer la marge nette réelle au lieu d'estimations.

### 1. Migration SQL

Ajouter à `payment_transactions` :
- `provider_fee_usd numeric NOT NULL DEFAULT 0` — frais réel du provider en USD
- `provider_fee_currency text` — devise d'origine du frais (USD/CDF/EUR)
- `provider_fee_raw jsonb` — payload brut du provider (audit/debug)
- `net_amount_usd numeric GENERATED ALWAYS AS (amount_usd - COALESCE(provider_fee_usd, 0)) STORED` — colonne calculée

Ajouter à `payment_methods_config` (si manquant) :
- `fee_percent numeric DEFAULT 0` — % du montant
- `fee_fixed_usd numeric DEFAULT 0` — frais fixe USD

RPC `backfill_provider_fees(p_from timestamptz, p_to timestamptz)` SECURITY DEFINER admin-only :
- Pour transactions sans `provider_fee_usd`, applique estimation = `amount_usd * fee_percent + fee_fixed_usd` selon `provider`
- Retourne `{ updated_count, total_fees_estimated_usd }`

Vue `revenue_net_by_period` :
- Agrège mensuel : `gross_revenue_usd`, `total_fees_usd`, `net_revenue_usd`, `transaction_count` par provider
- Source : `payment_transactions` complétées (status='completed')

### 2. Edge functions

#### `stripe-webhook`
Sur événement `charge.succeeded` ou `payment_intent.succeeded` :
- Récupérer `balance_transaction.fee` et `balance_transaction.fee_details` via Stripe API (`stripe.balanceTransactions.retrieve`)
- Convertir le fee en USD si nécessaire (Stripe retourne dans la devise du charge)
- UPDATE `payment_transactions` SET `provider_fee_usd`, `provider_fee_currency='USD'`, `provider_fee_raw=fee_details`

#### `process-mobile-money-payment`
Au moment du marquage `completed` (simulation et réel) :
- Lire `payment_methods_config.fee_percent` et `fee_fixed_usd` pour le `payment_provider`
- Calculer `provider_fee_usd = amount_usd * (fee_percent/100) + fee_fixed_usd`
- Inclure dans l'UPDATE final qui passe la transaction à `completed`

### 3. UI Admin

#### `AdminPaymentServiceIntegration`
- Remplacer estimations 50/50 hardcodées par requête sur `revenue_net_by_period`
- Afficher : Brut total, Frais réels par provider (Stripe vs MoMo), Marge nette, % effectif moyen
- Bouton « Backfill frais historiques » → appelle RPC `backfill_provider_fees` avec sélecteur de période + confirmation

#### `AdminFinancialDashboard`
- Nouveau KPI card « Marge nette » à côté de « Revenu total »
- Sous-libellé : « Frais providers : −$X.XX (Y.Z%) »
- Mini-graphe sparkline marge nette mensuelle (12 derniers mois)

#### `AdminTransactionsList` (ou équivalent)
- Ajouter colonne « Frais provider » et « Net » (toggle visible si admin)

### 4. Configuration tarifaire

Préseed `payment_methods_config.fee_percent` / `fee_fixed_usd` :
- Stripe carte : 2.9% + $0.30
- M-Pesa / Orange Money / Airtel Money : 1.5% (estimation, ajustable)
- Si nul : aucun frais comptabilisé

UI `AdminPaymentMethods` : ajouter inputs « Frais % » et « Frais fixe USD » par méthode (édition inline) avec audit `logBillingAudit`.

### 5. Mémoire & docs

- `mem://admin/provider-fees-tracking-fr.md` : tracking par tx, calcul, backfill, vue net
- Mise à jour `mem://admin/billing-commerce-admin-audit-fr.md` : retirer point F6 (résolu)
- Mise à jour `docs/EDGE_FUNCTIONS.md` : section frais Stripe + MoMo

### Critères de validation

1. Migration : colonne `net_amount_usd` calculée automatiquement
2. Stripe webhook réel : `provider_fee_usd > 0` et `provider_fee_raw` rempli avec breakdown
3. MoMo simulation : `provider_fee_usd = amount * fee_percent + fee_fixed`
4. RPC backfill : transactions historiques renseignées avec estimation
5. Dashboard : KPI « Marge nette » = sum(net_amount_usd)
6. AdminPaymentServiceIntegration : valeurs réelles, plus de 50/50 hardcodé
7. AdminPaymentMethods : édition fee_percent/fee_fixed avec audit
8. Vue `revenue_net_by_period` : retourne agrégat correct par mois/provider

### Hors périmètre

- Reconciliation automatique avec relevés Stripe/MoMo (manuel pour l'instant)
- Frais Flutterwave/PayPal (non utilisés actuellement)
- Frais de change devise (FX fees) traités séparément
- Refacturation client des frais (modèle « pass-through »)

