# Flux de Paiement

## Vue d'ensemble

Le système supporte 8 types de paiement via 2 méthodes (carte bancaire Stripe, Mobile Money) et 2 devises (USD, CDF).

## Types de paiement

| Type | Table source | Redirection post-paiement |
|------|-------------|---------------------------|
| `publications` | `orders` | `/publications` |
| `cadastral_service` | `cadastral_invoices` + `payment_transactions` | `/services` |
| `expertise_fee` | `expertise_payments` | `/cadastral-map` |
| `certificate_access` | `expertise_payments` | `/cadastral-map` |
| `mutation_request` | `mutation_requests` + `payment_transactions` | `/mon-compte?tab=mutations` |
| `land_title_request` | `land_title_requests` + `payment_transactions` | `/mon-compte` |
| `permit_request` | `payment_transactions` | `/mon-compte` |
| `mortgage_cancellation` | `payment_transactions` | `/mon-compte` |

## Flux Carte Bancaire (Stripe)

```
Utilisateur → Composant BankCardPayment
  → appel Edge Function `create-payment`
    → vérifie auth, rate-limit, provider activé
    → crée session Stripe Checkout
    → enregistre transaction (status: pending)
  ← retourne URL Checkout

Utilisateur → page Stripe Checkout → paiement

Stripe → webhook `stripe-webhook`
  → vérifie signature
  → met à jour transaction (status: completed)
  → met à jour facture/demande
  → accorde accès service (si applicable)
  → envoie notification utilisateur
```

## Flux Mobile Money

```
Utilisateur → Composant MobileMoneyPayment
  → sélectionne opérateur (airtel_money, orange_money, mpesa)
  → saisit numéro de téléphone
  → appel Edge Function `process-mobile-money-payment`
    → vérifie taux de change serveur
    → lit mode test depuis DB (pas le client)
    → crée transaction (status: pending)
    → Mode test : simule completion après 3s
    → Mode prod : initie paiement opérateur
  ← retourne transaction_id + status

L'utilisateur confirme via push USSD (PIN saisi sur le téléphone, jamais dans l'app)
```

## Gestion des devises

- **Devise de référence** : USD (tous les prix stockés en USD)
- **Devise alternative** : CDF (Franc congolais)
- Taux de change configuré par l'admin dans `currency_config`
- Le composant `CurrencySelector` permet de basculer
- Le taux est **validé côté serveur** dans l'Edge Function (pas de confiance au client)
- Chaque transaction enregistre `currency_code` et `exchange_rate_used`

## Mode Test

- Le mode test est lu depuis `cadastral_search_config.test_mode.enabled` côté serveur
- En mode test, les paiements Mobile Money sont simulés (auto-complétés après 3s)
- Les transactions test portent le préfixe `TEST-` dans leur référence
- Le bouton « Simuler le paiement (test) » bypass le flux réel pour les services cadastraux
- Les transactions gratuites utilisent la méthode `BYPASS`

## Configuration admin

- **AdminPaymentMethods** : active/désactive les fournisseurs, configure les clés API
- **AdminPaymentMode** : active/désactive l'obligation de paiement
- **AdminCurrencyConfig** : gère les devises et taux
- **AdminPaymentMonitoring** : monitoring temps réel
- **AdminPaymentReconciliation** : rapprochement bancaire
