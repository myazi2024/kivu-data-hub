

# Ajout du Franc Congolais (CDF) comme devise de paiement

## Contexte

L'application utilise exclusivement le dollar americain (USD). Les prix sont stockes en `price_usd` / `amount_usd` / `total_amount_usd` dans toutes les tables. L'objectif est de permettre a l'utilisateur de choisir entre USD et CDF lors du paiement, avec un taux de change configurable par l'admin.

## Architecture retenue

Les prix **restent stockes en USD** dans la base de donnees (source de verite). Le CDF est une **conversion a l'affichage et au paiement** basee sur un taux configure par l'admin. Les factures et transactions enregistrent la devise choisie et le taux applique au moment du paiement.

```text
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Admin: taux    │────>│  Config DB   │────>│  Frontend:      │
│  USD/CDF = 2850 │     │  (Supabase)  │     │  affiche les 2  │
└─────────────────┘     └──────────────┘     │  devises        │
                                              └─────────────────┘
```

---

## Plan d'implementation

### 1. Migration SQL — table `currency_config`

Creer une table dediee pour la configuration des devises :

```sql
CREATE TABLE public.currency_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code TEXT NOT NULL UNIQUE,  -- 'USD', 'CDF'
  currency_name TEXT NOT NULL,
  symbol TEXT NOT NULL,                -- '$', 'FC'
  exchange_rate_to_usd NUMERIC(18,4) NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
```

Donnees initiales : USD (taux 1, defaut) et CDF (taux ~2850, actif).

Ajouter aussi `currency_code` et `exchange_rate_used` aux tables `cadastral_invoices` et `payment_transactions` pour historiser la devise choisie et le taux au moment du paiement.

### 2. Admin — page de gestion du taux de change

Nouveau composant `AdminCurrencyConfig.tsx` dans l'espace admin :
- Affiche les devises actives (USD, CDF)
- Champ editable pour le taux CDF/USD (ex: 1 USD = 2850 CDF)
- Bouton sauvegarder avec audit log
- Integrer dans le menu admin existant

### 3. Hook `useCurrencyConfig`

Hook centralise qui :
- Charge les devises actives depuis `currency_config`
- Ecoute les changements en temps reel (Realtime)
- Expose : `currencies`, `convertToLocal(amountUsd, currencyCode)`, `selectedCurrency`, `setSelectedCurrency`, `exchangeRate`

### 4. UI — Selecteur de devise dans le catalogue (CadastralBillingPanel)

- Ajouter un selecteur USD/CDF compact dans la zone recapitulative des prix
- Quand CDF est selectionne, tous les montants affiches (sous-total, TVA, total) sont convertis
- Le selecteur est un petit toggle ou dropdown discret pres du total

### 5. UI — Dialog de paiement (CadastralPaymentDialog)

- Afficher le montant dans la devise choisie
- Passer `currency_code` et `exchange_rate` au hook de paiement

### 6. Hook `useCadastralPayment` — enregistrer la devise

- Ajouter `currency_code` et `exchange_rate_used` dans les inserts de factures
- Le montant USD reste la reference ; le montant local est `amount_usd * exchange_rate`

### 7. Edge Function `process-mobile-money-payment`

- Accepter `currency_code` et `amount_local` dans le body
- Verifier le taux depuis `currency_config` cote serveur (securite)
- Enregistrer la devise dans `payment_transactions`

### 8. Utilitaire `formatCurrency` etendu

Mettre a jour `src/utils/formatters.ts` :
```ts
export const formatCurrency = (amount: number, currency: 'USD' | 'CDF' = 'USD'): string => {
  if (currency === 'CDF') {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CDF', maximumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(amount);
};
```

### 9. Composant `MobileMoneyPayment`

- Recevoir la devise selectionnee et afficher le montant en consequence
- Bouton "Payer 28 500 FC" au lieu de "Payer 10 USD"

### 10. Autres flux de paiement

Appliquer le meme pattern aux autres flux : `PermitPaymentStep`, `MortgageCancellation`, `MutationRequest`, `ExpertiseRequest` — selecteur de devise + conversion.

---

## Resume des fichiers

| Action | Fichier |
|--------|---------|
| Migration SQL | `currency_config` + colonnes sur `cadastral_invoices` et `payment_transactions` |
| Nouveau | `src/components/admin/AdminCurrencyConfig.tsx` |
| Nouveau | `src/hooks/useCurrencyConfig.ts` |
| Modifie | `src/utils/formatters.ts` |
| Modifie | `src/components/cadastral/CadastralBillingPanel.tsx` |
| Modifie | `src/components/cadastral/CadastralPaymentDialog.tsx` |
| Modifie | `src/components/payment/MobileMoneyPayment.tsx` |
| Modifie | `src/hooks/useCadastralPayment.tsx` |
| Modifie | `supabase/functions/process-mobile-money-payment/index.ts` |
| Modifie | `src/constants/billing.ts` (ajouter constantes devises) |
| Modifie | Menu admin (ajouter lien vers config devises) |

