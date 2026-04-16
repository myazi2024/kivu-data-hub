

# Fix: `highlightRequiredFields` manquant dans `CurrentOwnersSection`

## Cause

Le champ "Nationalité" (ligne 634) utilise `highlightRequiredFields`, mais ce code est à l'intérieur du sous-composant `CurrentOwnersSection` — pas dans `GeneralTab`. Or `CurrentOwnersSection` ne déclare pas et ne reçoit pas cette prop.

## Correction — `src/components/cadastral/ccc-tabs/GeneralTab.tsx`

**1. Interface `CurrentOwnersSectionProps`** (ligne 379-397) : ajouter `highlightRequiredFields: boolean;`

**2. Destructuring** (lignes 399-405) : ajouter `highlightRequiredFields` dans la liste des props destructurées.

**3. Passage de la prop** : vérifier que `GeneralTab` passe déjà `highlightRequiredFields` à `CurrentOwnersSection`. Si ce n'est pas le cas, l'ajouter dans le JSX d'appel.

### Fichier modifié (1)
- `src/components/cadastral/ccc-tabs/GeneralTab.tsx`

