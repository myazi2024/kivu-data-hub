

# Fix "Mode test" affiché à tort dans le catalogue de services

## Diagnostic

**Cause racine** : La base de données contient `bypass_payment: true` dans la config `payment_mode`, même quand `enabled` est `false`. Le catalogue affiche "Mode test" dès que `bypass_payment` OU `test_mode` est vrai, sans vérifier si le système de paiement est activé.

3 bugs concrets :

| # | Localisation | Bug |
|---|-------------|-----|
| 1 | **Base de données** | `payment_mode.bypass_payment = true` stocké en dur — jamais réinitialisé |
| 2 | `usePaymentConfig.tsx` L59 | `mode.bypass_payment ?? true` — le fallback est `true` au lieu de `false` |
| 3 | `CadastralBillingPanel.tsx` L578 | Condition `paymentMode.bypass_payment \|\| paymentMode.test_mode` ne vérifie pas `paymentMode.enabled` |

Bug bonus dans `AdminPaymentMode.tsx` L25-26 : état initial `bypass_payment: true, test_mode: true` — si le `useEffect` L29 s'exécute avant le chargement, l'admin voit un état faux.

## Plan de corrections

### 1. Corriger la donnée en base (migration SQL)

```sql
UPDATE cadastral_search_config 
SET config_value = jsonb_set(config_value, '{bypass_payment}', 'false')
WHERE config_key = 'payment_mode' AND is_active = true;
```

### 2. Corriger le fallback — `usePaymentConfig.tsx` L59

Changer `mode.bypass_payment ?? true` → `mode.bypass_payment ?? false`

### 3. Corriger la condition d'affichage — `CadastralBillingPanel.tsx` L578

Remplacer :
```tsx
{(paymentMode.bypass_payment || paymentMode.test_mode) && (
```
Par :
```tsx
{paymentMode.enabled && (paymentMode.bypass_payment || paymentMode.test_mode) && (
```

L'indicateur "Mode test" ne s'affiche que si le paiement est activé ET en mode bypass/test.

### 4. Corriger l'état initial admin — `AdminPaymentMode.tsx` L23-27

Changer les défauts à `bypass_payment: false, test_mode: false` pour cohérence.

## Résumé

| Fichier | Modification |
|---------|-------------|
| Migration SQL | `bypass_payment` → `false` en base |
| `usePaymentConfig.tsx` | Fallback `?? false` |
| `CadastralBillingPanel.tsx` | Condition conditionnée à `enabled` |
| `AdminPaymentMode.tsx` | Défauts initiaux cohérents |

