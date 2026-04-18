
## Plan : réactiver le drag de la carte pendant le tracé d'une construction

### Cause probable identifiée

Dans `ParcelMapPreview.tsx`, l'effet de redraw (ligne ~1284) recrée tous les marqueurs de bornes à chaque changement de `buildingVertices`. Ces marqueurs sont créés avec `draggable: !isGroupDragMode && !isDrawingMode && !isMarkerMoveMode && mapConfig.enableDragging !== false` (ligne 835) — donc en mode `isDrawingBuilding`, les marqueurs **restent draggable**. Quand l'utilisateur essaie de drag la carte et que son curseur est près d'un marqueur de borne (qui est large + iconAnchor [14,28] + plage de hit), c'est le marqueur qui capture le mousedown, empêchant le map.dragging.

De plus, il manque un useEffect qui réapplique `map.dragging.enable()` après chaque re-render de l'effet principal — Leaflet peut avoir réinitialisé certains handlers.

### Modifications dans `src/components/cadastral/ParcelMapPreview.tsx`

1. **Désactiver `draggable` sur les marqueurs de bornes pendant `isDrawingBuilding`** (ligne 835) :
   ```ts
   draggable: !isGroupDragMode && !isDrawingMode && !isDrawingBuilding && !isMarkerMoveMode && mapConfig.enableDragging !== false,
   ```

2. **Ajouter un `useEffect` dédié** qui force l'activation du drag de la carte dès que `isDrawingBuilding` passe à true et qui se ré-applique après chaque redraw (dépendances : `isDrawingBuilding, isMapReady, buildingVertices`) :
   ```ts
   useEffect(() => {
     const map = mapInstanceRef.current;
     if (!map || !isDrawingBuilding) return;
     map.dragging.enable();
     map.scrollWheelZoom.enable();
     map.touchZoom.enable();
     // Désactiver explicitement le drag de chaque marqueur de borne
     markersRef.current.forEach(m => { try { m.dragging?.disable(); } catch {} });
   }, [isDrawingBuilding, isMapReady, buildingVertices, validCoords]);
   ```

3. **Vérifier que les vertex markers de construction (lignes ~1080-1140)** n'interceptent pas non plus un mousedown global pendant le tracé — si oui, leur `interactive` peut être réduit ou un `L.DomEvent.on(..., 'mousedown', stopPropagation)` retiré.

### Validation E2E

1. Cliquer « Tracer une construction ».
2. Drag souris depuis l'extérieur du polygone parcelle → la carte se déplace ✅.
3. Drag depuis sur/près d'un marqueur de borne → la carte se déplace aussi (les bornes ne sont plus draggable en mode building) ✅.
4. Clic à l'intérieur du polygone → ajoute un sommet de construction ✅.
5. Valider/Annuler le tracé → drag normal des bornes restauré ✅.

### Fichier
- `src/components/cadastral/ParcelMapPreview.tsx`
