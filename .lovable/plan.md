

# Liaison Constructions (Infos) ↔ Croquis Parcelle (Localisation)

## Contexte

Actuellement, les constructions déclarées dans l'onglet Infos (construction principale + `additionalConstructions`) et les constructions tracées dans le croquis parcelle (`buildingShapes`) sont complètement indépendantes. Il faut :

1. Désactiver le bouton Building2 si `propertyCategory === 'Terrain nu'` avec infobulle explicative
2. Imposer une correspondance 1:1 entre constructions déclarées et constructions tracées
3. Bloquer la progression si le nombre de tracés ne correspond pas

## Modifications

### Fichier 1 : `src/components/cadastral/ParcelMapPreview.tsx`

**Nouvelles props** : `isTerrainNu?: boolean`, `requiredBuildingCount?: number` (nombre total de constructions à tracer = 1 + additionalConstructions.length si pas terrain nu, sinon 0)

**Bouton Building2** :
- Si `isTerrainNu` → bouton désactivé (`disabled`) + wrappé dans un `Tooltip` (shadcn) affichant : *"La catégorie de bien sélectionnée est « Terrain nu ». L'ajout de constructions n'est pas disponible pour cette catégorie. Pour modifier ce choix, rendez-vous dans l'onglet Infos, bloc Construction."*
- Si `buildingShapes.length >= requiredBuildingCount` → bouton désactivé + tooltip : *"Toutes les constructions déclarées ont été tracées (N/N)."*

**Badge indicateur** : Afficher sous la carte un compteur `{buildingShapes.length}/{requiredBuildingCount} constructions tracées` quand `requiredBuildingCount > 0`.

**Lors de `validateBuilding`** : Ajouter un champ `linkedIndex` (0-based) au `BuildingShape` validé, correspondant à l'index de la construction liée (0 = principale, 1+ = additionnelles). L'auto-assigner séquentiellement.

### Fichier 2 : `src/components/cadastral/ccc-tabs/LocationTab.tsx`

**Nouvelles props** : `constructionMode`, `additionalConstructions`, `propertyCategory` (déjà disponible via `formData.propertyCategory`)

Calculer `isTerrainNu = formData.propertyCategory === 'Terrain nu' || formData.constructionType === 'Terrain nu'` et `requiredBuildingCount = isTerrainNu ? 0 : (constructionMode === 'multiple' ? 1 + additionalConstructions.length : 1)`. Attention : si `propertyCategory` est "Terrain nu", `requiredBuildingCount = 0`.

Passer `isTerrainNu` et `requiredBuildingCount` à `ParcelMapPreview`.

### Fichier 3 : `src/hooks/useCCCFormState.ts`

**`getMissingFields`** : Ajouter une validation dans la section LOCATION :
- Si `!isTerrainNu && !isAppartement` : vérifier que `buildingShapes.length >= expectedCount` (1 + additionalConstructions.length si mode multiple, sinon 1). Si insuffisant, ajouter un champ manquant : *"Tracés de construction dans le croquis (N/M)"* tab `location`.

**Export** : `constructionMode` et `additionalConstructions` sont déjà exportés.

### Fichier 4 : `src/components/cadastral/ccc-tabs/LocationTab.tsx` (props)

Ajouter `constructionMode` et `additionalConstructions` à l'interface `LocationTabProps` et les recevoir depuis le parent.

### Fichier 5 : Parent du LocationTab (passage des props)

Identifier où `LocationTab` est rendu et passer `constructionMode` et `additionalConstructions` déjà disponibles depuis `useCCCFormState`.

## Interface BuildingShape mise à jour

```typescript
interface BuildingShape {
  id: string;
  vertices: { lat: number; lng: number }[];
  sides: { name: string; length: string }[];
  areaSqm: number;
  perimeterM: number;
  linkedIndex?: number; // 0 = construction principale, 1+ = additionnelles
}
```

## Impact

~60 lignes modifiées/ajoutées dans 4 fichiers. Aucun changement de schéma DB (le champ `linkedIndex` est stocké dans le JSONB existant `building_shapes`).

