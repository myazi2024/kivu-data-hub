
## Plan : réactiver le drag de la carte hors-parcelle pendant le tracé

### Cause racine
Dans `ParcelMapPreview.tsx`, les marqueurs des bornes de parcelle sont recréés à chaque tick avec `draggable: true` même quand `isDrawingBuilding === true`. Comme leur icône fait ~28px et couvre les zones autour des bornes, leur handler de mousedown intercepte le drag de la carte avant que Leaflet ne le délègue au pan global.

### Modifications dans `src/components/cadastral/ParcelMapPreview.tsx`

1. **L. 835** — désactiver le drag des bornes pendant `isDrawingBuilding` :
   ```ts
   draggable: !isGroupDragMode && !isDrawingMode && !isDrawingBuilding && !isMarkerMoveMode && mapConfig.enableDragging !== false,
   ```

2. **Nouveau `useEffect`** dédié au mode tracé construction : après chaque redraw (dépendances `isDrawingBuilding, isMapReady, buildingVertices, validCoords`), forcer `map.dragging.enable()`, `scrollWheelZoom`, `doubleClickZoom`, `touchZoom`, et désactiver explicitement `marker.dragging?.disable()` sur tous les marqueurs de bornes en sécurité.

3. **L. 1062-1170** — circleMarkers de sommets de constructions validées : ajouter `interactive: false` (ou désactiver les listeners mousedown) quand `isDrawingBuilding === true`, pour qu'ils n'interceptent pas un mousedown destiné au pan.

4. **Fix annexe runtime** : le warning « Map container is already initialized » vient du double-init en mode HMR/StrictMode. Ajouter en début de l'effet d'init (l. 356 environ) :
   ```ts
   if (mapRef.current && (mapRef.current as any)._leaflet_id) {
     try { mapInstanceRef.current?.remove(); } catch {}
     delete (mapRef.current as any)._leaflet_id;
   }
   ```

### Validation E2E
1. « Tracer une construction » → drag depuis l'extérieur du polygone → la carte se déplace.
2. Drag depuis sur/près d'un marqueur de borne (extérieur du polygone) → la carte se déplace aussi.
3. Clic à l'intérieur du polygone → ajoute un sommet.
4. Valider/Annuler → drag normal des bornes restauré.
5. Recharger l'onglet Localisation 2× → plus d'erreur "already initialized".

### Fichier
- `src/components/cadastral/ParcelMapPreview.tsx`
