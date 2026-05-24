## Objectif
Garder l'affichage des graduations dynamiques fluide sur le croquis de la parcelle mère, même quand le périmètre est grand (parcelles >> 1 ha) ou que l'utilisateur zoome fort. Aucune modification de logique métier ni de types.

## Fichier
- `src/components/cadastral/subdivision/LotCanvas.tsx` (rendu SVG du bloc « Parent parcel side graduations »).

## Constat
À chaque rerender (déplacement souris, sélection, zoom, pan, édition d'un lot), le bloc graduations :
- recalcule `polygonCentroid`, `totalLen`, `toScreen(centroid)` ;
- recrée toutes les `<line>` et `<text>` ticks (sur un grand périmètre × pas fin de 0,5 m, on peut atteindre plusieurs milliers d'éléments avant le garde anti-encombrement).
- Le garde actuel (`totalLen/step > 600`) ne plafonne pas par côté ni en fonction de la densité écran réelle (ticks invisibles parce que <1 px d'écart).

## Changements ciblés (rendu uniquement)

### 1) Mémoïsation du bloc graduations
Extraire le calcul actuel `() => { ... }` dans un `useMemo` dépendant uniquement de :
`[parentVertices, metricFrame, viewport.viewport.zoom, viewport.viewport.panX, viewport.viewport.panY, showDimensions]`.

Cela évite de regénérer ticks/labels à chaque mouvement souris pendant l'édition d'un lot.

### 2) Plafond dur sur le nombre de ticks
Avant la boucle, calculer un `maxTicks` global (ex. 800) ; si `totalLen / step < maxTicks` on garde, sinon coarsen jusqu'à respecter le plafond. Reproduit la sémantique actuelle mais garantit une borne supérieure stable indépendamment du zoom.

### 3) Filtre densité-écran (seuil pixel)
Pour chaque côté, calculer la longueur en px du segment screen (`pxLen` déjà calculé) et le `pxPerTick = pxLen * step / Lm`.
- Si `pxPerTick < 3 px` → sauter ce côté (tick illisible, économise les nodes).
- Si `pxPerTick < 6 px` → ne dessiner que les majors.

Cela règle le cas grandes parcelles dézoomées : zéro tick pour rien.

### 4) Culling viewport
Avant d'émettre les ticks d'un côté, tester si le segment screen intersecte la viewBox visible (`-panX, -panY, canvasW/zoom, canvasH/zoom`). Si totalement hors champ → return null pour ce côté. Implémentation simple : AABB du segment vs AABB du viewBox.

### 5) Cohérence label
Remplacer la double allocation `<line>` + `<text>` par une seule `<g>` par tick uniquement quand un label est présent ; pour les ticks non-majors, garder uniquement `<line>` (déjà le cas). Pas de changement visuel.

### 6) Petites micro-optims
- Sortir les constantes `nx`, `ny`, `off`, `kLabel` hors de la boucle quand possible (ce qui change est seulement `k`, `t`, `px`, `py`, `major`).
- Réutiliser `String(Math.round(k))` via map locale `kLabels[k]` non nécessaire — laisser tel quel, déjà O(n).
- `key` : conserver pattern `t-${i}-${k}` ; ajouter préfixe `step-${step}` pour invalider proprement quand le pas change.

## Hors scope
- Pas de changement à `useCanvasViewport`, aux ticks des lots/voies, à `metricFrame`, ni à la précision affichée des cotes (déjà gérée par mémoire précédente).
- Aucune nouvelle dépendance, aucun toggle UI, aucune migration.
- Aucun changement aux types, à la validation, aux frais, au PDF, ni au mini-map.

## Critère de succès
- Sur parcelle 5+ ha avec zoom 1×: ≤ ~400 ticks dans le DOM, FPS stable lors du drag d'un sommet de lot.
- À zoom 3× sur une grande parcelle : graduations 0,5 m visibles uniquement sur les côtés présents dans le viewport.
- Aucun changement visible à pas/zoom modéré sur petites parcelles.
