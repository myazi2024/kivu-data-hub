# Guide de Déploiement

## Déploiement via Lovable (recommandé)

1. **Backend** (automatique) : les Edge Functions et migrations SQL se déploient automatiquement à chaque commit
2. **Frontend** : cliquer sur **Share → Publish → Update** dans l'éditeur Lovable

## Prérequis Supabase

### Secrets Edge Functions

Configurer dans [Supabase Dashboard > Settings > Edge Functions](https://supabase.com/dashboard/project/vqrcggcqgnkanngqhcga/settings/functions) :

| Secret | Usage |
|--------|-------|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (`sk_live_...` ou `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe (`whsec_...`) |

Les variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont auto-injectées.

### Variables frontend

Auto-configurées par Lovable :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Webhook Stripe

Configurer dans le dashboard Stripe :
- **URL** : `https://vqrcggcqgnkanngqhcga.supabase.co/functions/v1/stripe-webhook`
- **Événements** : `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`

### Configuration post-déploiement

1. **Activer les fournisseurs de paiement** : Admin → Moyens de paiement
2. **Configurer les devises** : Admin → Configuration devises
3. **Configurer les services et tarifs** : Admin → Services cadastraux, Frais titres, Frais mutations…
4. **Créer les modèles de certificats** : Admin → Certificats
5. **Créer un admin** : insérer un rôle `admin` dans la table `user_roles`

## Self-hosting

Voir la [documentation Lovable](https://docs.lovable.dev/tips-tricks/self-hosting) pour le self-hosting.

## Ordre de déploiement

```
1. Migrations SQL (tables, RPCs, triggers, RLS)
2. Edge Functions (paiement, webhook, health-check)
3. Secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
4. Frontend (npm run build → deploy)
5. Configuration admin (paiements, services, certificats)
```
