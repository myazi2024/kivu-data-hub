

# Simplifier l'onglet Parcelle : supprimer le bloc Demandeur, garder Qualité + Motif obligatoires

## Changements

### 1. `StepParentParcel.tsx` — Supprimer le bloc Demandeur
- Supprimer le bloc `<Card>` "Demandeur" (lignes 87-130) qui affiche nom, email, téléphone et le badge "Connecté"
- Conserver uniquement le `<Select>` "Qualité du demandeur" en le déplaçant dans une carte autonome entre la parcelle mère et le motif
- Ajouter un indicateur obligatoire (`*`) sur "Qualité du demandeur" et "Motif du lotissement"
- Supprimer l'import `User` et la variable `displayName` devenus inutiles

### 2. `useSubdivisionForm.ts` — Validation obligatoire
- Modifier `isStepValid('parcel')` (ligne 305) pour exiger aussi que `requester.type` soit renseigné et que `purpose` ne soit pas vide :
  ```
  return !!(parentParcel && requester.type && purpose);
  ```

### Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `StepParentParcel.tsx` | Supprimer bloc Demandeur, garder Select qualité dans sa propre carte, marquer champs obligatoires |
| `useSubdivisionForm.ts` | Ajouter `requester.type && purpose` à la validation de l'étape `parcel` |

