# Edge Functions

6 Edge Functions Deno déployées automatiquement via Supabase. Toutes ont `verify_jwt = false` dans `config.toml` (l'authentification est gérée manuellement dans le code).

---

## 1. `create-payment`

**Rôle** : Créer une session Stripe Checkout pour les paiements par carte bancaire.

**Authentification** : Header `Authorization: Bearer <JWT>` vérifié via `supabase.auth.getUser()`.

**Body** :
```json
{
  "payment_type": "publications | cadastral_service | expertise_fee | certificate_access | mutation_request | permit_request | mortgage_cancellation | land_title_request",
  "items": ["id1", "id2"],       // pour publications
  "invoice_id": "uuid",          // pour les services
  "amount_usd": 25.00            // pour les services
}
```

**Flux** :
1. Authentifie l'utilisateur
2. Récupère les détails (publication/facture/demande) depuis la DB
3. Vérifie le rate-limit (10 req/h)
4. Vérifie que Stripe est activé dans `payment_methods_config`
5. Crée ou réutilise un customer Stripe
6. Crée une `checkout.session` avec les `line_items`
7. Enregistre la transaction (`orders` ou `payment_transactions`)
8. Retourne `{ url: "https://checkout.stripe.com/..." }`

**Secrets requis** : `STRIPE_SECRET_KEY`

---

## 2. `stripe-webhook`

**Rôle** : Recevoir les événements Stripe et mettre à jour les statuts de paiement.

**Authentification** : Signature Stripe (`stripe-signature` header + `STRIPE_WEBHOOK_SECRET`).

**Événements gérés** :

| Événement | Action |
|-----------|--------|
| `checkout.session.completed` | Marque la transaction comme `completed`, met à jour la facture/demande, accorde l'accès au service, envoie une notification |
| `checkout.session.expired` | Marque comme `failed` |
| `payment_intent.payment_failed` | Marque comme `failed` |

**Types de paiement gérés** : `publications`, `cadastral_service`, `expertise_fee`, `certificate_access`, `mutation_request`, `land_title_request`, `permit_request`, `mortgage_cancellation`.

**Secrets requis** : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

---

## 3. `process-mobile-money-payment`

**Rôle** : Traiter les paiements Mobile Money (Airtel Money, Orange Money, M-Pesa).

**Body** :
```json
{
  "payment_provider": "airtel_money | orange_money | mpesa",
  "phone_number": "+243...",
  "amount_usd": 15.00,
  "payment_type": "publication | cadastral_service | expertise_fee | ...",
  "invoice_id": "uuid",
  "currency_code": "CDF"
}
```

**Flux** :
1. Authentifie l'utilisateur
2. Récupère le taux de change serveur pour la devise demandée
3. Lit le mode test depuis `cadastral_search_config` (jamais depuis le client)
4. Vérifie le rate-limit
5. Vérifie que le fournisseur est activé dans `payment_methods_config`
6. Crée une `payment_transaction` avec statut `pending`
7. **Mode test** : simule un paiement complété après 3 secondes
8. **Mode production** : initie le paiement réel (simulation temporaire en attendant les callbacks opérateurs)

**Sécurité** : Ne collecte jamais de code PIN. Le PIN est saisi par l'utilisateur via push USSD de l'opérateur.

---

## 4. `test-payment-provider`

**Rôle** : Tester la connectivité d'un fournisseur de paiement configuré.

**Body** :
```json
{
  "provider_id": "stripe | flutterwave | airtel_money | ...",
  "config_type": "bank_card | mobile_money"
}
```

**Tests effectués** :
- **Stripe** : appel `GET /v1/balance` avec la clé secrète
- **Flutterwave** : appel `GET /v3/banks/CD`
- **Autres** : vérification que des clés API sont configurées et non vides

**Réponse** : `{ success: boolean, message: string }`

---

## 5. `cleanup-test-data`

**Rôle** : Nettoyage automatique des données de test (préfixe `TEST-`).

**Déclenchement** : Manuel ou programmé. Vérifie que le mode test est activé et que `auto_cleanup` est `true` dans la config.

**Paramètres** : Aucun body requis. Lit la rétention depuis `test_data_retention_days` (défaut : 7 jours).

**Ordre de suppression** (FK-safe, enfants → parents) :
1. `fraud_attempts` → `cadastral_contributor_codes` → `cadastral_service_access`
2. `payment_transactions` → `cadastral_invoices` → `cadastral_contributions`
3. Enfants parcelles (`ownership_history`, `tax_history`, `boundary_history`, `mortgages`, `building_permits`)
4. `cadastral_parcels`
5. `expertise_payments` → `real_estate_expertise_requests`
6. Tables indépendantes : `land_disputes`, `land_title_requests`, `boundary_conflicts`, `generated_certificates`, `mutation_requests`, `subdivision_requests`

**Audit** : Appelle `log_audit_action('AUTO_TEST_DATA_CLEANUP', ...)` avec le détail des suppressions et erreurs.

---

## 6. `health-check`

**Rôle** : Vérification de santé du système.

**Authentification** : Aucune (endpoint public).

**Réponse** :
```json
{
  "ok": true,
  "timestamp": "2026-04-01T...",
  "latency_ms": 45,
  "db_latency_ms": 12,
  "db_status": "ok",
  "runtime": "deno"
}
```

**Code HTTP** : `200` si OK, `503` si la DB est inaccessible.
