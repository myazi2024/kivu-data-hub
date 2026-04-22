

## Plan — Débloquer la validation de l'étape « Parcelle »

### Diagnostic

`isStepValid('parcel')` exige `firstName`, `lastName` et `phone` du demandeur, mais `StepParentParcel.tsx` **n'affiche aucun champ de saisie** pour ces données. Elles ne sont remplies que si l'utilisateur authentifié a `user_metadata.full_name` + un téléphone — sinon le bouton « Suivant » reste désactivé sans aucune indication visible. C'est ton cas.

### Correctifs

**1. Ajouter les champs manquants dans `StepParentParcel.tsx`** (carte « Identité du demandeur »)
- Prénom * (input)
- Nom * (input)
- Deuxième prénom (input optionnel)
- Téléphone * (input tel, format RDC)
- Email (input optionnel, pré-rempli auto)
- Pré-remplir depuis `requester` (déjà alimenté par `authUser` quand dispo)
- Validation visuelle (border rouge si champ requis vide après blur)

**2. Indicateur visuel d'erreur sur le bouton « Suivant »** dans `SubdivisionRequestDialog.tsx`
- Quand `!isStepValid(currentStep)`, afficher un petit texte muted sous le bouton listant les champs manquants (ex: « Renseignez : nom, téléphone »)
- Évite le futur effet « bouton grisé sans raison »

**3. Cohérence avec autres services**
- Réutiliser le même pattern de carte « Identité du demandeur » que `MutationRequestDialog` / `LandTitleRequestDialog` (label, placeholder, ordre des champs)

### Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/cadastral/subdivision/steps/StepParentParcel.tsx` | Ajouter carte « Identité du demandeur » avec 5 champs |
| `src/components/cadastral/SubdivisionRequestDialog.tsx` | Hint sous bouton Suivant si étape invalide |

### Vérification

1. Ouvrir le formulaire lotissement sur une parcelle
2. Onglet « Parcelle » : voir les champs Prénom/Nom/Téléphone (pré-remplis si possible)
3. Sélectionner motif + qualité → bouton « Suivant » s'active
4. Vider un champ requis → hint « Renseignez : … » apparaît, bouton désactivé

### Hors scope (pour plus tard)

- Extraction `LotCanvas` par mode (P2 dette technique)
- Extraction helpers géométriques vers `utils/geometry.ts`

