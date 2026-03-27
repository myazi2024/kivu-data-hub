

# Revue de la configuration de paiement — Divergences et optimisations

## Divergences trouvees

### 1. `getCurrentMode()` ne couvre pas l'etat `!enabled && !bypass_payment` (AdminPaymentMode.tsx L73-83)

La fonction retourne "Mode Inconnu" quand `enabled=false` et `bypass_payment=false` — qui est pourtant l'etat par defaut normal (paiement desactive). Il manque un cas :

```
!enabled && !bypass_payment → devrait retourner "Paiement désactivé" (pas "Mode Inconnu")
```

### 2. Terminologie "MODE_DEV" dans les donnees (useCadastralPayment.tsx L124-125)

En mode bypass, les factures sont creees avec `discount_code_used: 'MODE_DEV'` et `payment_method: 'MODE_DEV'`. Or le terme "mode developpement" n'est pas un concept utilisateur. Ces donnees polluent les rapports et la supervision admin.

**Correction** : Remplacer `'MODE_DEV'` par `'BYPASS'` ou `'GRATUIT'` — terme neutre et coherent.

### 3. Toast "mode test" dans le contexte bypass (useCadastralPayment.tsx L138)

Le toast dit "Acces accorde (mode test)" alors qu'on est en mode bypass, pas en mode test. Ce sont deux concepts differents dans l'admin.

**Correction** : Remplacer par "Acces accorde — Services accessibles gratuitement" (sans mention de mode).

### 4. Commentaire "mode developpement" dans le code (useCadastralPayment.tsx L112)

Le commentaire dit "Mode bypass (developpement)" — coherence mineure mais renforce la confusion terminologique.

### 5. Condition `bypass_payment` non conditionnee a `enabled` dans le catalogue (CadastralBillingPanel.tsx L555)

Le bouton affiche "Acceder aux services" quand `paymentMode.bypass_payment` est vrai, meme si `enabled` est false. Avec le defaut corrige a `false`, ce n'est plus un bug actif, mais la logique reste fragile. Le bypass devrait idealement etre ignore quand `enabled` est false.

### 6. Edge Function : `test_mode` non valide cote serveur

Dans `usePayment.tsx` L51 et `useCadastralPayment.tsx` L224, `test_mode` est envoye par le client a l'Edge Function. Le serveur fait confiance a cette valeur sans la re-verifier depuis la DB — un client malveillant pourrait envoyer `test_mode: true` pour simuler des paiements gratuits.

**Correction** : L'Edge Function devrait lire `test_mode` depuis `cadastral_search_config` au lieu de faire confiance au client.

---

## Plan de corrections (4 fichiers + 1 Edge Function)

### Correction 1 — `getCurrentMode()` complet (AdminPaymentMode.tsx)

Ajouter le cas manquant avant le fallback :
```
if (!config.enabled && !config.bypass_payment) → "Paiement désactivé"
```

### Correction 2 — Terminologie coherente (useCadastralPayment.tsx)

- L124 : `'MODE_DEV'` → `'BYPASS'`
- L125 : `'MODE_DEV'` → `'bypass'`
- L138 : Toast "mode test" → "Services accessibles gratuitement"
- L112 : Commentaire → "Mode bypass — acces gratuit"

### Correction 3 — Condition bypass + enabled (CadastralBillingPanel.tsx L555)

Conditionner le texte du bouton a `paymentMode.enabled` en plus de `bypass_payment` :
```tsx
paymentMode.enabled && paymentMode.bypass_payment
  ? 'Accéder aux services'
  : 'Payer'
```

### Correction 4 — Securite : `test_mode` lu cote serveur (Edge Function process-mobile-money-payment)

Au lieu de faire confiance au `test_mode` du body, l'Edge Function doit :
1. Lire la config `payment_mode` depuis `cadastral_search_config`
2. Utiliser `config.test_mode` pour determiner le comportement

Idem pour `create-payment` Edge Function.

---

## Resume

| Type | Correction | Fichier |
|------|-----------|---------|
| Logique | `getCurrentMode()` cas manquant | `AdminPaymentMode.tsx` |
| Terminologie | `MODE_DEV` → `BYPASS` | `useCadastralPayment.tsx` |
| Terminologie | Toast "mode test" → neutre | `useCadastralPayment.tsx` |
| Logique | Bouton conditionne a `enabled` | `CadastralBillingPanel.tsx` |
| Securite | `test_mode` lu depuis DB serveur | 2 Edge Functions |

