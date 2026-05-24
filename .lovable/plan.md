## Objectif

Rendre tous les déplacements interactifs sur la parcelle-mère (drags de sommets, d'arêtes, d'arêtes partagées, de polygones entiers, glissement contraint sur le périmètre, ainsi que le pan de la vue) naturels à n'importe quel niveau de zoom : 1 px souris ≈ 1 px écran perçu, quel que soit le zoom. Le snap (grille + sommets) devient plus fin proportionnellement au zoom.

## Comportement attendu

- **Au zoom 1×** : comportement actuel inchangé.
- **Au zoom 2×** : un déplacement souris de 100 px à l'écran déplace le sommet/lot de la même distance visuelle qu'au zoom 1× (donc dans le repère normalisé, le déplacement réel est ÷2).
- **Pan** : déjà correct car la conversion `clientX→viewBox` utilise déjà `/ viewport.zoom`. À auditer pour confirmer, ajuster si nécessaire.
- **Snap** : `SNAP_TOLERANCE` effectif = `0.015 / zoom`. À zoom 4×, le snap devient quasi imperceptible sauf en collant vraiment au sommet → ajustement millimétrique facile.

## Détails techniques

### Loi d'échelle retenue : `1 / zoom` (inversement proportionnel)

C'est la loi naturelle : la souris se déplace dans l'espace écran, on la convertit dans l'espace normalisé du SVG. Le facteur exact est déjà `(canvasW / rect.width) / zoom`. Aujourd'hui la conversion `clientX → normalized` est faite dans `LotCanvas.tsx` au niveau du `onMouseMove` du SVG ; il faut confirmer qu'elle prend bien en compte `viewport.zoom` et `viewport.panX/Y`. Si non, c'est là que se situe le bug racine et la correction est de diviser par `zoom` à la source.

### Fichiers à modifier

1. **`src/components/cadastral/subdivision/LotCanvas.tsx`**
   - Dans la conversion `clientX/clientY → normalized` (mousemove handler), s'assurer que :
     ```
     normX = ((clientX - rect.left) * canvasW / rect.width / zoom - panX) / canvasW
     normY = ((clientY - rect.top)  * canvasH / rect.height / zoom - panY) / canvasH
     ```
   - Cela rend automatiquement tous les drags (vertex, edge, shared-edge, polygon, boundary-vertex) cohérents avec le zoom puisqu'ils consomment tous `normalized` dans `moveDrag`.

2. **`src/components/cadastral/subdivision/hooks/useCanvasDrag.ts`**
   - Accepter un `zoom` optionnel (ou le SNAP_TOLERANCE effectif) en paramètre du hook.
   - Dans `snapToGrid`, remplacer le `SNAP_TOLERANCE` constant par `SNAP_TOLERANCE / Math.max(1, zoom)` : le snap se resserre quand on zoome, donc plus de précision fine à zoom élevé sans bloquer le déplacement.

3. **`src/components/cadastral/subdivision/hooks/useCanvasViewport.ts`**
   - Le pan utilise déjà `* scaleX / viewport.zoom` → correct, à laisser tel quel. Vérification seulement.

### Hors périmètre
- Pas de modificateur clavier (Shift/Alt) pour précision fine.
- Pas de changement sur les seuils de visibilité de labels ou autre rendu lié au zoom.
- Pas de changement de la loi de zoom elle-même (toujours 0.9/1.1 par tick wheel, bornes 0.5×–4×).

## Validation

- Au zoom 4× : déplacer un sommet de boundary suit la souris pixel-à-pixel à l'écran (pas 4× trop vite).
- Au zoom 4× : pan reste fluide et 1:1.
- Au zoom 4× : snap ne "happe" plus de loin, seulement quand on est très près d'une cible.
- Au zoom 1× : comportement identique à aujourd'hui.
