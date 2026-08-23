# Correction : l'onglet « Valeur » est sauté par le bouton Suivant

## Problème confirmé

Dans l'onglet Obligations, le bouton Suivant (dernière sous-étape « Litiges ») appelle une navigation directe vers l'onglet Récapitulatif, alors que l'ordre officiel des onglets est :

```text
Infos > Localisation > Historique > Obligations > Valeur > Envoi
```

L'onglet « Valeur » est donc systématiquement contourné.

## Correctifs

1. **Obligations → Valeur** : le bouton Suivant de l'onglet Obligations (sous-étape Litiges) doit conduire à l'onglet « Valeur » au lieu de « Envoi ». Le libellé du bouton devient « Suivant » au lieu de « Reviser ».
2. **Valeur → Envoi** : navigation déjà correcte (Suivant vers Envoi, Précédent vers Obligations), aucune modification.
3. **Nettoyage lié** : la validation du bouton Suivant de l'onglet Valeur bloque encore sur « modalités de paiement », un champ supprimé récemment du formulaire. Cette condition obsolète est retirée pour ne plus bloquer inutilement le passage à l'étape Envoi.

## Détails techniques

- `src/components/cadastral/ccc-tabs/ObligationsTab.tsx` (~ligne 615) : `handleNextTab('obligations', 'review')` → `handleNextTab('obligations', 'market-value')` ; libellé conditionnel `'Reviser'` → `'Suivant'`.
- `src/components/cadastral/ccc-tabs/MarketValueTab.tsx` (~ligne 1029) : retirer la vérification sur `sale.paymentTerms`, conserver celle sur `sale.availability`.
