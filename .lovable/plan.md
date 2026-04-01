

# Fix : Dialogues des services cachés derrière l'overlay

## Problème identifié

Le `DialogOverlay` (fond noir semi-transparent) est à `z-[1600]`. Les dialogues des services dans le menu Actions utilisent `z-[1200]` sur leur `DialogContent`, ce qui place le contenu du formulaire **derrière** l'overlay. Résultat : l'utilisateur voit un écran sombre sans pouvoir interagir avec le formulaire.

## Cause

L'overlay et le contenu par défaut du composant `DialogContent` sont tous les deux à `z-[1600]`. Or, 6 dialogues de services écrasent cette valeur avec `z-[1200]`, les faisant passer sous l'overlay.

## Correction

Retirer `z-[1200]` de la className de `DialogContent` dans les 6 fichiers suivants pour qu'ils héritent du `z-[1600]` par défaut :

| Fichier | Ligne concernée |
|---|---|
| `MortgageManagementDialog.tsx` | `z-[1200]` → supprimé |
| `LandDisputeManagementDialog.tsx` | `z-[1200]` → supprimé |
| `BuildingPermitRequestDialog.tsx` | `z-[1200]` → supprimé |
| `RealEstateExpertiseRequestDialog.tsx` | `z-[1200]` sur DialogContent + 8 SelectContent → supprimé |
| `MutationRequestDialog.tsx` | `z-[1200]` → supprimé |
| `TaxManagementDialog.tsx` | `z-[1200]` → supprimé |

Aucun changement structurel — suppression d'une classe CSS redondante uniquement.

