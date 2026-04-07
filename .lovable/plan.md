

# Refonte : Tracer les constructions comme le croquis parcelle

## Concept

Remplacer le système actuel (choix d'une forme prédéfinie → clic pour placer au centre avec taille fixe 5m) par un système de **tracé par bornes** identique à celui de la parcelle. L'utilisateur place des points (sommets) sur la carte pour dessiner le contour de la construction. Les distances entre sommets sont calculées automatiquement, donnant les mesures réelles de la construction.

## Nouvelle interface utilisateur

1. Cliquer sur le bouton **Building2** → active un mode "Tracé construction" (similaire au mode dessin parcelle)
2. Chaque clic sur la carte ajoute un sommet de la construction (minimum 3 pour former un polygone)
3. Le polygone se ferme automatiquement et affiche les dimensions de chaque côté (comme `parcelSides`)
4. Un bouton **Valider** confirme la construction, un bouton **Annuler** supprime le tracé en cours
5. Possibilité d'ajouter plusieurs constructions (chacune est un polygone indépendant)
6. Bouton pour supprimer une construction spécifique

## Nouveau modèle de données

```typescript
// Remplace l'ancien BuildingShape
interface BuildingShape {
  id: string;
  vertices: { lat: number; lng: number }[];  // sommets GPS
  sides: { name: string; length: string }[];  // dimensions calculées
  areaSqm: number;                            // surface calculée
  perimeterM: number;                         // périmètre calculé
}
```

Rétro-compatible : l'ancien format (center + type + size) sera ignoré au chargement si `vertices` est absent.

## Modifications techniques

**Fichier** : `src/components/cadastral/ParcelMapPreview.tsx`

1. **Remplacer `BuildingShape` interface** — nouveau modèle avec `vertices[]` au lieu de `center + type + size`
2. **Supprimer** `SHAPE_OPTIONS`, `drawBuildingShape`, `selectedShapeType`, `showShapePicker` et tout le Popover de choix de forme
3. **Ajouter un état `buildingVertices`** — tableau temporaire des sommets en cours de tracé (comme `coordinates` pour la parcelle)
4. **Nouveau mode `isDrawingBuilding`** — quand actif, les clics ajoutent des sommets au `buildingVertices` (avec vérification `isPointInPolygon` pour rester dans la parcelle)
5. **Rendu du tracé en cours** — afficher les sommets placés + lignes entre eux + dimensions de chaque segment en temps réel
6. **Bouton "Valider construction"** — ferme le polygone, calcule surface/périmètre/côtés via Haversine, crée un `BuildingShape` et l'ajoute à `buildingShapes[]`
7. **Bouton "Annuler"** — vide `buildingVertices` et quitte le mode
8. **Rendu des constructions validées** — dessiner chaque `BuildingShape` comme un `L.polygon` rouge avec popup montrant surface et périmètre
9. **Suppression individuelle** — clic sur une construction validée → popup avec bouton "Supprimer"

**Fichier** : `src/components/cadastral/ParcelSketchSVG.tsx`

10. **Adapter le rendu SVG** — dessiner les constructions comme des polygones à partir de `vertices[]` au lieu de formes prédéfinies centrées

**Impact** : ~200 lignes modifiées/ajoutées dans 2 fichiers. Le modèle de données reste compatible avec le stockage existant (localStorage + Supabase JSONB).

