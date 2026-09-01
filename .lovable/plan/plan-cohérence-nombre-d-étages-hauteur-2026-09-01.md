# Plan — Cohérence « Nombre d'étages » ↔ « Hauteur »

## Règle métier

Dans l'onglet **Localisation → Construction**, la hauteur minimale d'une construction dépend du nombre d'étages saisi :

| Nombre d'étages | Hauteur minimale |
|-----------------|------------------|
| 0 (RDC seul)    | 3 m              |
| 1               | 3 m              |
| 2               | 6 m              |
| 3               | 9 m              |
| n               | max(3, n × 3) m  |

La formule retenue : `minHeight = max(3, floorNumber × 3)`.

- S'applique à la **construction principale** (`formData.buildingHeight` + `formData.floorNumber`) et aux **constructions additionnelles** (`data.heightM` + `data.floorNumber`).
- **Appartement** exclu : son champ « Numéro de l'étage » désigne l'étage où se situe l'appartement, pas le nombre de niveaux du bâtiment ; sa hauteur reste au minimum légal de 3 m.

## Approche technique

### 1. Helper partagé — `src/utils/buildingShapes.ts`

Ajouter une fonction exportée :

```ts
/** Hauteur minimale (m) cohérente avec le nombre d'étages. Min. légale 3 m. */
export function minHeightForFloors(floorCount: number | undefined | null): number {
  const n = Math.max(0, Math.floor(Number(floorCount) || 0));
  return Math.max(3, n * 3);
}
```

### 2. `BuildingHeightField.tsx`

- Ajouter une prop `floorCount?: number` (défaut → 3 m).
- Calculer `const minHeight = minHeightForFloors(floorCount)`.
- Remplacer `min={3}` par `min={minHeight}`, `tooLow = value < 3` par `value < minHeight`.
- Aide (Popover) et message d'erreur deviennent dynamiques : `Hauteur minimale : {minHeight} m` (ex. « 6 m pour 2 étages »).

### 3. `ConstructionSection.tsx` (construction principale)

- Calculer `const floorCount = formData.floorNumber ? parseInt(formData.floorNumber, 10) : undefined` (uniquement quand `showFloors` est vrai, i.e. non-Appartement).
- Passer `floorCount={floorCount}` au `BuildingHeightField` de la construction principale.
- Le cas Appartement (`apartmentHeight`) ne reçoit pas `floorCount` → reste 3 m.

### 4. `AdditionalConstructionBlock.tsx` (constructions additionnelles)

- Même logique : `const floorCount = data.floorNumber ? parseInt(data.floorNumber, 10) : undefined` passé au `BuildingHeightField`.

### 5. Validation — `src/hooks/ccc/useFormValidation.ts`

Actuellement le bloc « BUILDING SHAPES » valide uniquement `heightM < 3`. Remplacer par une validation dynamique par construction :

- Pour la **construction principale** (linkedIndex 0) : `minHeight = minHeightForFloors(formData.floorNumber)`.
- Pour chaque **construction additionnelle** i (linkedIndex i+1) : `minHeight = minHeightForFloors(additionalConstructions[i].floorNumber)`.
- Pour chaque `buildingShape`, déterminer le `minHeight` via son `linkedIndex` (0 → principale, sinon index dans additionalConstructions).
- `tooShort` : `heightM != null && heightM > 0 && heightM < minHeight`.
- `pendingTooShort` (hauteurs saisies en bloc Construction sans tracé) : idem avec `formData.buildingHeight` vs `minHeightForFloors(formData.floorNumber)` et chaque `c.heightM` vs `minHeightForFloors(c.floorNumber)`.
- Message d'erreur dynamique : `Hauteur de construction insuffisante (minimum {minHeight} m pour {n} étage(s))`.

### 6. Tests — `src/hooks/ccc/__tests__/useFormValidation.test.ts`

Ajouter des cas :
- 2 étages + hauteur 4 m → bloquant (`buildingHeightMin`).
- 2 étages + hauteur 6 m → OK.
- 3 étages + hauteur 8 m → bloquant ; 9 m → OK.
- Construction additionnelle avec `floorNumber=2` + `heightM=5` → bloquant.

## Fichiers touchés

- `src/utils/buildingShapes.ts` (helper)
- `src/components/cadastral/BuildingHeightField.tsx`
- `src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx`
- `src/components/cadastral/AdditionalConstructionBlock.tsx`
- `src/hooks/ccc/useFormValidation.ts`
- `src/hooks/ccc/__tests__/useFormValidation.test.ts`

## Note

Le cas « 0 étage » (RDC seul) conserve le minimum légal de 3 m. Si vous souhaitez un comportement différent pour 0 (ex. aucune contrainte), précisez-le avant validation.
