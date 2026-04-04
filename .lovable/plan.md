

# Fix: impossible d'avancer quand "Ces données sont exactes" est coché

## Problème

Quand l'utilisateur sélectionne "Ces données sont exactes", le bloc formulaire construction est masqué (ligne 2375). Mais les variables d'état `constructionType`, `constructionNature`, `declaredUsage` restent vides. Or :
- Le bloc "Éligibilité" (nationalité + durée) ne s'affiche que si ces 3 variables sont remplies (ligne 2697)
- Le bouton "Déterminer le titre" est `disabled` si elles sont vides (ligne 2803)
- Le bouton "Suivant" est `disabled={!valorisationValidated}` (ligne 2949)

Résultat : l'utilisateur ne peut jamais valider ni avancer.

## Solution

Quand le radio "Ces données sont exactes" est coché ET que `parcelValorisationData` existe, **auto-remplir les états** `constructionType`, `constructionNature`, `declaredUsage`, `constructionMaterials`, `standing`, `floorNumber`, `constructionYear` et `propertyCategory` depuis `parcelValorisationData`.

### Détail technique

1. **Ajouter un `useEffect`** qui réagit à `showValorisationUpdate` et `parcelValorisationData` :
   - Si `showValorisationUpdate === false` et `parcelValorisationData` existe → setter les 8 variables d'état depuis les données parcelle
   - Cela rend le bloc Éligibilité visible et le bouton "Déterminer le titre" activable

2. **Quand l'utilisateur repasse en mode "Proposer une mise à jour"** → les états sont déjà pré-remplis (comportement existant), donc pas de changement nécessaire

### Fichier modifié
- `src/components/cadastral/LandTitleRequestDialog.tsx` — ajout d'un `useEffect` (~5 lignes)

