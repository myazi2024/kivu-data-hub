

# Correction zoom construction + drag sommets construction

## Probleme 1 : Zoom se reinitialise a chaque cote trace

**Cause** : Ligne 811, `shouldAutoCenter` ne prend pas en compte `isDrawingBuilding`. Quand l'utilisateur ajoute un sommet, `buildingVertices` change, l'effet `updateMap` se relance, et `shouldAutoCenter` est `true` ce qui appelle `fitBounds` (ligne 1013-1014), reinitialisant le zoom.

**Correction** : Ajouter `!isDrawingBuilding` a la condition `shouldAutoCenter` :
```
const shouldAutoCenter = !isDrawingMode && !isDrawingBuilding && !isGroupDragMode && !selectedBorne && !isMarkerMoveMode;
```

## Probleme 2 : Pas de drag des sommets de construction validee

Actuellement, les sommets de construction validee supportent uniquement le double-clic (edition GPS manuelle). Il n'y a aucune logique d'appui prolonge + drag pour les deplacer.

**Implementation** : Sur chaque `vertexMarker` de construction validee (lignes 1048-1062), ajouter :
- Un handler `mousedown`/`touchstart` qui demarre un timer d'appui prolonge (450ms)
- Si le timer expire : activer un mode drag (desactiver le dragging de la carte, changer le curseur)
- Sur `mousemove`/`touchmove` : deplacer le sommet en temps reel (mettre a jour les coordonnees GPS du vertex dans `buildingShapes`)
- Sur `mouseup`/`touchend` : finaliser la position, recalculer surface/perimetre/dimensions, reactiver le dragging de la carte
- Reutiliser le pattern existant du long-press des bornes de parcelle (lignes 845-863) comme reference

### Fichiers modifies
- `src/components/cadastral/ParcelMapPreview.tsx` : 2 modifications (shouldAutoCenter + drag vertex construction)

