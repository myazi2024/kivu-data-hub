## Diagnostic

J'ai inspecté `useCadastralPayment.tsx`, `CadastralPaymentDialog.tsx`, `useTestMode.tsx` et la table `cadastral_search_config`. **Le mode test est actuellement activé dans la base** (`config_key='test_mode'` → `enabled: true`). Cela explique entièrement les deux problèmes :

### Problème 1 — Remise CCC non déduite

Dans `useCadastralPayment.tsx` (branche `if (isTestModeActive)`, lignes ~150-180), la facture est insérée directement avec :

```ts
total_amount_usd: totalAmount,        // somme brute
discount_amount_usd: 0,
// discountData ignoré
```

Le paramètre `discountData` n'est **jamais** utilisé dans cette branche. Résultat : la facture remise au `CadastralPaymentDialog` affiche le sous-total complet, sans la remise CCC.

Hors mode test, la RPC `create_cadastral_invoice_secure_v2` applique correctement la remise via `discount_code_param`.

### Problème 2 — Bannière « Mode Test actif »

`CadastralPaymentDialog.tsx` (ligne 244) affiche la bannière « Mode Test actif » et le bouton « Simuler le paiement (test) » dès que `useTestMode().isTestModeActive === true`. C'est le comportement attendu **quand le mode test est activé**.

## Cause racine commune

Le mode test n'a pas été désactivé après les tests précédents. L'utilisateur effectue une transaction qu'il considère réelle, mais l'application est encore en mode test.

## Plan

### 1. Désactiver le mode test (migration SQL)

Mettre `enabled: false` dans `cadastral_search_config` pour `config_key = 'test_mode'`. Une fois exécuté :
- Le flux passera par la RPC `create_cadastral_invoice_secure_v2` → la remise CCC sera appliquée côté serveur.
- La bannière « Mode Test actif » disparaîtra du dialog de paiement.
- Les vrais fournisseurs de paiement (Stripe / Mobile Money) seront utilisés.

### 2. Correctif défensif : appliquer la remise même en mode test

Dans `src/hooks/useCadastralPayment.tsx`, branche `isTestModeActive`, utiliser `discountData` pour calculer :

```ts
const originalAmount = selectedServices.reduce((s, x) => s + (x.price || 0), 0);
const discountAmt = Math.min(discountData?.amount ?? 0, originalAmount);
const totalAmount = Math.max(0, originalAmount - discountAmt);
```

Et stocker `original_amount_usd = originalAmount`, `discount_amount_usd = discountAmt`, `discount_code_used = discountData?.code ?? null`, `total_amount_usd = totalAmount`. Ainsi le dialog affichera le bon montant même si l'admin réactive le mode test.

Aucun changement à la RPC, au dialog, ni au composant BillingTotals (qui calcule déjà correctement `discountedAmount` pour l'affichage du panneau de facturation — le bug est purement côté facture créée).

## Hors périmètre

- Logique de validation/application de la remise dans la RPC (déjà correcte).
- UI du panneau (l'affichage de la remise dans `BillingTotals` fonctionne déjà).
- Flux Stripe / Mobile Money réels.

## Vérification post-fix

1. Confirmer dans la table `cadastral_search_config` que `test_mode.enabled = false`.
2. Re-tester le flux SU/123456 + CCC-58829 : la facture créée doit avoir `total_amount_usd = sous-total − remise`, la bannière « Mode Test » doit être absente.
