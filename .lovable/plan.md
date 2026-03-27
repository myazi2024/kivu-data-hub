

# Fix: "Le système de paiement n'est pas encore configuré"

## Diagnostic

La table `cadastral_search_config` contient la configuration suivante pour `payment_mode` :

```text
enabled: false
bypass_payment: false
test_mode: false
```

La fonction `isPaymentRequired()` retourne `paymentMode.enabled && !paymentMode.bypass_payment`, ce qui donne `false`. Le code dans `CadastralBillingPanel.tsx` (ligne 208-220) entre alors dans le `else` et affiche le message d'erreur.

**En résumé** : le paiement n'est pas activé dans la configuration admin, et le code ne gère pas correctement ce cas — il bloque l'accès au lieu de proposer une alternative.

## Problème de logique

Le flux actuel :

```text
bypass_payment = true  → accès gratuit (mode test) ✅
enabled = true         → paiement réel ✅
enabled = false        → ERREUR "non configuré" ❌
```

La branche `enabled = false` + `bypass = false` signifie que l'admin n'a activé aucun mode. Le code devrait traiter cela comme un accès gratuit temporaire (comme bypass) ou donner un message plus clair.

## Services concernés

Tous les flux de paiement utilisent `isPaymentRequired()` du hook `usePaymentConfig` :
- **Catalogue de services** (`CadastralBillingPanel.tsx`) — bloqué ❌
- **Demande d'autorisation de bâtir** (`BuildingPermitRequestDialog.tsx`) — fonctionne (soumet sans paiement quand `!isPaymentRequired()`) ✅
- **Demande d'expertise** (`RealEstateExpertiseRequestDialog.tsx`) — à vérifier
- **Demande de mutation** — à vérifier

Le catalogue est le seul à afficher une erreur ; les autres services soumettent gratuitement quand le paiement n'est pas requis.

## Solution

### 1. Corriger `CadastralBillingPanel.tsx` — aligner sur le comportement des autres services

Quand `isPaymentRequired()` retourne `false` et que `bypass_payment` est aussi `false`, le catalogue devrait accorder l'accès gratuit (comme les autres services le font), pas bloquer.

Remplacer le bloc `else` (lignes 214-220) par la même logique que le bypass : créer la facture à montant zéro et débloquer les services.

```text
AVANT:
  if (isPaymentRequired()) → paiement
  else → ERREUR

APRÈS:
  if (bypass_payment) → accès gratuit (mode test)
  else if (isPaymentRequired()) → paiement réel
  else → accès gratuit (paiement non activé)
```

### 2. Ajouter un indicateur discret pour l'admin

Quand le paiement n'est pas activé et que des services sont débloqués gratuitement, afficher un badge discret "Paiement désactivé" dans le catalogue (visible uniquement en mode non-production) pour que l'administrateur sache qu'il faut activer le paiement.

### 3. Vérifier les autres services payants

Passer en revue `RealEstateExpertiseRequestDialog.tsx` et le flux de mutation pour s'assurer qu'ils gèrent aussi le cas `enabled=false` correctement (pas de blocage).

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/components/cadastral/CadastralBillingPanel.tsx` | Remplacer le `else` bloquant par un accès gratuit + badge indicateur |

## Alternative rapide

Si l'intention est que le paiement soit actif, il suffit de mettre `enabled: true` dans la config admin. Mais le code doit quand même gérer le cas `enabled=false` sans bloquer l'utilisateur.

