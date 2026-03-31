

# Fix — Paiement test dans le catalogue de services

## Probleme

Quand le mode test est actif et le paiement est active, le flux de paiement echoue car :
1. `isPaymentRequired()` ne tient pas compte du mode test — il exige un vrai paiement
2. Si aucun fournisseur Mobile Money n'est configure dans `payment_methods_config` (ou si les IDs ne correspondent pas), le dialog affiche "Aucun moyen de paiement configure" et bloque l'utilisateur
3. L'Edge Function `process-mobile-money-payment` gere deja le mode test (auto-complete apres 3s), mais le frontend ne laisse pas l'utilisateur atteindre cette etape

## Solution

Ajouter une logique **test mode bypass** dans le flux de paiement cadastral : quand le mode test global est actif, proposer un bouton "Paiement test (simulation)" qui cree la facture et simule le paiement sans exiger de fournisseur reel.

## Plan d'implementation

### 1. `useCadastralPayment.tsx` — Ajouter une methode `processTestPayment`

Nouvelle fonction qui :
- Cree une transaction `payment_transactions` avec `status: 'completed'`, `payment_method: 'TEST'`
- Met a jour la facture en `paid`
- Accorde l'acces aux services via `grantServiceAccess`

### 2. `CadastralPaymentDialog.tsx` — Afficher l'option test

- Importer `useTestMode`
- Quand `isTestModeActive` est vrai, afficher un bandeau jaune "Mode Test" et un bouton "Simuler le paiement" qui appelle `processTestPayment`
- Ce bouton est affiche meme si aucun moyen de paiement n'est configure

### 3. `CadastralBillingPanel.tsx` — Passer la methode test au dialog

- Transmettre `processTestPayment` au `CadastralPaymentDialog`

### 4. Appliquer la meme logique aux autres flux de paiement

- `BuildingPermitRequestDialog.tsx` — ajouter bypass test dans le flux autorisations
- `PermitPaymentStep.tsx` — ajouter bouton simulation test

## Fichiers modifies

| Fichier | Modification |
|---|---|
| `src/hooks/useCadastralPayment.tsx` | Ajouter `processTestPayment` |
| `src/components/cadastral/CadastralPaymentDialog.tsx` | Bandeau test + bouton simulation |
| `src/components/cadastral/CadastralBillingPanel.tsx` | Passer `processTestPayment` au dialog |
| `src/components/cadastral/BuildingPermitRequestDialog.tsx` | Bypass test pour autorisations |
| `src/components/cadastral/building-permit-request/PermitPaymentStep.tsx` | Bouton simulation test |

