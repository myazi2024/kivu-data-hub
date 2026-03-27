

# Refonte du bloc "Mode de paiement" — Suppression de la redondance et améliorations

## Diagnostic

### 1. Redondance "Mode Développement" vs "Mode Test"

Le composant `AdminPaymentMode.tsx` expose 3 switches :
- **Mode développement (Bypass)** — bypass les paiements, accès gratuit
- **Paiement activé** — active le paiement réel
- **Mode test** — simule les paiements sans transaction réelle

Le **Mode développement** est une redondance directe avec le **Mode Test global** (`AdminTestMode`). Les deux servent à tester sans impacter les données réelles. De plus, la combinaison de 3 switches crée 8 états possibles dont certains sont contradictoires (ex: `enabled=false` + `bypass=false` + `test_mode=true`).

### 2. Autres divergences identifiées

| Problème | Détail |
|----------|--------|
| `bypass_payment` redondant avec `AdminTestMode.enabled` | Deux mécanismes pour le même objectif |
| `test_mode` dans `payment_mode` redondant avec `AdminTestMode.test_mode` | Doublon de configuration |
| Pas de dirty-check avant sauvegarde | Le bouton "Enregistrer" est toujours actif contrairement à `AdminTestMode` qui implémente `isDirty` |
| Pas d'audit logging structuré | L'audit existe mais ne log pas les anciennes/nouvelles valeurs de `bypass_payment` et `test_mode` |
| `AdminPaymentMonitoring` et `AdminPaymentReconciliation` dupliquent la même requête | Les deux chargent `payment_transactions` avec la même logique |
| Pas de lien vers le Mode Test global | L'admin ne sait pas que le bypass est piloté par le mode test global |
| `getCurrentMode()` retourne "Mode Inconnu" pour certains états | Certaines combinaisons ne sont pas couvertes |

### 3. Fonctionnalités absentes

| Fonctionnalité | Description |
|----------------|-------------|
| Lien avec le Mode Test global | Quand le mode test est actif, le paiement devrait automatiquement refléter cet état |
| Historique des changements de mode | Aucun log visible des changements de configuration passés |
| Confirmation avant activation production | Pas de dialogue de confirmation quand on passe en mode production |
| Support multi-devise dans le résumé | Le résumé des méthodes ne montre pas le support CDF |

## Plan de correction

### 1. Supprimer `bypass_payment` et `test_mode` de `payment_mode`

Simplifier la config à 2 états clairs :
- **Paiement activé** (`enabled: true`) — le paiement est requis
- **Paiement désactivé** (`enabled: false`) — accès gratuit

Le comportement "test" est piloté par le Mode Test global (`AdminTestMode`). Plus besoin de `bypass_payment` ni de `test_mode` dans la config paiement.

### 2. Refondre l'UI de `AdminPaymentMode`

Remplacer les 3 switches par :
- Un seul switch principal **"Paiement requis"**
- Un bandeau informatif qui indique si le Mode Test global est actif (avec lien vers l'onglet Mode Test)
- Un dirty-check comme dans `AdminTestMode` pour n'activer le bouton "Enregistrer" que quand la config a changé
- Un dialogue de confirmation avant d'activer le paiement en production

### 3. Mettre à jour `usePaymentConfig` et les consommateurs

- Supprimer les champs `bypass_payment` et `test_mode` de `PaymentMode`
- `isPaymentRequired()` devient simplement `paymentMode.enabled`
- Le mode test est lu depuis le hook `useTestMode` là où c'est nécessaire (Edge Functions, flux de paiement)
- Adapter `CadastralBillingPanel`, `useCadastralPayment`, et l'Edge Function `process-mobile-money-payment`

### 4. Ajouter l'historique des changements de mode

Afficher les derniers changements de configuration depuis `admin_audit_logs` filtrés sur `PAYMENT_MODE_UPDATED`.

### 5. Afficher le support multi-devise dans le résumé

Ajouter une ligne "Devises supportées : USD, CDF" dans la card récapitulative des méthodes de paiement.

## Fichiers modifiés

| Action | Fichier |
|--------|---------|
| Modifié | `src/components/admin/AdminPaymentMode.tsx` — Refonte UI, suppression bypass/test_mode, dirty-check, historique |
| Modifié | `src/hooks/usePaymentConfig.tsx` — Suppression `bypass_payment` et `test_mode` |
| Modifié | `src/hooks/useCadastralPayment.tsx` — Adapter la logique sans bypass |
| Modifié | `src/components/cadastral/CadastralBillingPanel.tsx` — Adapter le flux sans bypass |
| Modifié | `supabase/functions/process-mobile-money-payment/index.ts` — Lire test_mode depuis la config globale |

