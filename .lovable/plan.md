

# Ajouter le champ "Hauteur" aux constructions tracées

## Modifications

### 1. Interface `BuildingShape` — `ParcelMapPreview.tsx` (ligne 49-56)
Ajouter `heightM?: number` à l'interface `BuildingShape`.

### 2. Liste détaillée des constructions — `ParcelMapPreview.tsx` (lignes 2626-2661)
Sous chaque ligne de construction tracée (label + surface + bouton supprimer), ajouter un champ `Input` de type `number` avec placeholder "Hauteur (m)" et label "Hauteur". Quand l'utilisateur saisit une valeur, mettre à jour le `heightM` du `BuildingShape` correspondant via `onBuildingShapesChange`. Afficher une bordure rouge si le champ est vide pour signaler l'obligation.

### 3. Validation — `useCCCFormState.ts` (lignes 688-692)
Dans `getMissingFields`, après la vérification du nombre de tracés, ajouter une vérification : si des constructions tracées existent mais qu'au moins une n'a pas de `heightM` (ou `heightM <= 0`), ajouter un champ manquant : `"Hauteur de construction manquante"`, tab `location`.

### 4. ReviewTab — afficher la hauteur dans le récapitulatif des constructions tracées (si elle est rendue là).

**Impact** : ~25 lignes dans 2 fichiers.

