
## Plan : permettre le drag/recentrage de la carte pendant le tracé d'une construction

### Comportement souhaité
Pendant `isDrawingBuilding === true` :
- À l'**intérieur** du croquis de parcelle → clics ajoutent les sommets de la construction (comportement actuel conservé).
- À l'**extérieur** du croquis → drag de la carte autorisé pour recentrer/déplacer la vue (actuellement probablement bloqué ou capté par le handler de tracé).

### Exploration nécessaire à l'implémentation
1. Lire `src/components/cadastral/ParcelMapPreview.tsx` pour repérer :
   - Le handler `map.on('click', ...)` ou équivalent qui ajoute les sommets de construction.
   - Si `map.dragging` est désactivé pendant `isDrawingBuilding` (probable cause du blocage).
   - La géométrie du polygone parcelle déjà disponible (latLngs des bornes).
2. Identifier le test « point dans polygone » (déjà utilisé pour valider que le tracé reste dans la parcelle ?).

### Modifications
Dans `ParcelMapPreview.tsx`, à l'entrée du mode tracé construction :
1. **Ne PAS désactiver** `map.dragging` (le laisser actif).
2. Dans le handler de clic du tracé :
   - Calculer si le point cliqué (`e.latlng`) est **à l'intérieur** du polygone parcelle (ray-casting ou réutilisation de l'utilitaire existant).
   - Si oui → ajouter le sommet de construction (comportement actuel).
   - Si non → ne rien faire (laisser Leaflet gérer le drag/pan naturellement).
3. S'assurer que `scrollWheelZoom` et `doubleClickZoom` restent cohérents (zoom autorisé pour faciliter le recentrage).
4. Optionnel : changer le curseur en `grab` à l'extérieur du polygone vs `crosshair` à l'intérieur via un `mousemove` listener léger.

### Fichier
- `src/components/cadastral/ParcelMapPreview.tsx`

### Validation E2E
1. Cliquer « Tracer une construction ».
2. Drag depuis une zone hors du polygone parcelle → la carte se déplace.
3. Cliquer à l'intérieur du polygone → un sommet de la construction est ajouté.
4. Drag depuis l'intérieur du polygone → ne déclenche pas un déplacement de carte (comportement de tracé prioritaire) — à confirmer avec l'utilisateur si on veut autoriser aussi le drag interne via un seuil de mouvement.
5. Valider/Annuler le tracé → tout revient à l'état normal.
