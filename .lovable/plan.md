
## Plan : masquer aussi la palette d'orientation et les mesures pendant le tracé

Étendre le masquage déjà en place dans `ParcelMapPreview.tsx` pour inclure :
1. **La palette de déplacement/orientation du croquis** (boutons rotation, translation, scale du polygone parcelle).
2. **Les labels de mesures** affichés sur chaque côté de la parcelle (longueurs en mètres).

### Étapes
1. Localiser dans `ParcelMapPreview.tsx` :
   - le bloc de la palette d'orientation/déplacement (probablement un `<div>` absolute avec boutons rotate/move),
   - le rendu des tooltips/labels de mesures sur les segments du polygone (Leaflet `L.tooltip` permanent ou marqueurs custom).
2. Conditionner leur affichage par `!isDrawingBuilding` :
   - Masquer le `<div>` de la palette via le même guard JSX.
   - Pour les labels Leaflet : retirer/cacher les tooltips quand `isDrawingBuilding` passe à `true`, les remettre quand il repasse à `false` (via un `useEffect` qui dépend de `isDrawingBuilding` + ajout/suppression des tooltips, ou via une classe CSS `display:none` sur le pane des tooltips).
3. Vérifier que tout réapparaît correctement après Validate/Cancel.

### Fix annexe (silencieux)
- Erreur runtime "Map container is already initialized" : ajouter un `mapInstanceRef.current?.remove()` dans le cleanup de l'effet d'init si non présent, et garder la garde existante.

### Fichier
- `src/components/cadastral/ParcelMapPreview.tsx`

### Validation
- Cliquer "Tracer une construction" → palette d'orientation cachée + mesures des côtés cachées + boutons déjà cachés restent cachés.
- Valider/Annuler le tracé → palette + mesures réapparaissent.
- Recharger l'onglet Localisation deux fois → plus d'erreur "Map container is already initialized".
