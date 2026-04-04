
# Bloc "Mise en valeur" conditionnel — Proposition de mise à jour

## Problème

Dans l'onglet Valorisation, le deuxième bloc "Mise en valeur" (formulaire éditable) s'affiche toujours, même quand les données pré-remplies du premier bloc sont correctes. C'est redondant.

## Solution

Rendre le deuxième bloc conditionnel : il ne s'affiche que lorsque l'utilisateur clique sur un bouton "Proposer une mise à jour" dans le premier bloc (données enregistrées).

### Modifications dans `src/components/cadastral/LandTitleRequestDialog.tsx`

1. **Ajouter un état** `showValorisationUpdate` (booléen, `false` par défaut) pour contrôler l'affichage du second bloc.

2. **Ajouter un bouton dans le premier bloc** (après la grille des données enregistrées, ligne ~2189) :
   - Icône `RefreshCw` + texte "Ces données sont inexactes ? Proposer une mise à jour"
   - Style discret (variant `outline`, petite taille)
   - Au clic : bascule `showValorisationUpdate` à `true`

3. **Conditionner le second bloc** (ligne 2194-2310) :
   - En mode parcelle liée (`isParcelLinkedMode && parcelValidated && parcelValorisationData`) : afficher uniquement si `showValorisationUpdate === true`
   - Hors mode parcelle liée : afficher toujours (comportement actuel inchangé)
   - Quand affiché conditionnellement, modifier le titre en "Proposer une mise à jour" et retirer le `disabled` des champs (ils ne doivent plus être verrouillés puisque l'utilisateur veut justement corriger)
   - Ajouter un bouton "Annuler" pour refermer le bloc et réinitialiser `showValorisationUpdate`

4. **Supprimer les `disabled`** sur les selects du second bloc quand `showValorisationUpdate` est actif — les champs doivent être librement éditables pour permettre la correction.

### Fichier modifié
- `src/components/cadastral/LandTitleRequestDialog.tsx`
