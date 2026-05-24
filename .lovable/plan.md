## Problème

En mode "tracer une ligne" (drawLine), la coupe ne cible qu'**un seul** lot : celui qui contient le milieu du segment. Si on trace une ligne qui traverse plusieurs lots adjacents, un seul est coupé (souvent aucun si le milieu tombe sur une voie ou hors lot).

Deux points en cause :
- `LotCanvas.tsx` `finishLineDraw` (l. 593-608) sélectionne `targetLot = lots.find(lot => pointInPolygon(mid, lot.vertices))` puis appelle `onCutLot(targetLot.id, …)` une seule fois.
- `StepLotDesigner.tsx` `handleCutLot` (l. 466-525) opère sur un seul lot et fait `setLots(lots.map…)` — l'appeler en boucle ne fonctionnerait pas (closure `lots` figée).

## Objectif

Une ligne tracée d'un bord à l'autre coupe **simultanément tous les lots qu'elle traverse** (≥2 intersections avec leur périmètre), en une seule transaction.

## Changements

### 1. `StepLotDesigner.tsx` — nouveau handler batch

Ajouter `handleCutLotsAlongLine(cutStart, cutEnd)` qui :
- parcourt tous les lots non-`isParentBoundary`
- pour chaque lot, calcule les intersections de la ligne avec ses arêtes (même algo que `handleCutLot`)
- ne garde que les lots avec ≥ 2 intersections ; construit les deux polygones enfants
- accumule un nouveau tableau `nextLots` (remplace chaque lot coupé par 2 enfants, conserve les autres tels quels), avec `genId('lot')` et numérotation incrémentale unique (`nextLotNumber`)
- un seul `setLots(nextLots)` à la fin + analytics `lot_cut` avec `meta.count`
- si aucun lot n'est coupé → no-op (et idéalement un toast info, optionnel)
- garde `handleCutLot` existant inchangé (peut être réutilisé par d'autres flows si besoin) ou le remplace par un wrapper qui appelle le batch

### 2. `LotCanvas.tsx` — appeler le batch

- Ajouter une prop `onCutLotsAlongLine?: (cutStart: Point2D, cutEnd: Point2D) => void`.
- Dans `finishLineDraw`, en mode `drawLine` :
  - si `onCutLotsAlongLine` est fourni → l'appeler avec `path[0]` et `path[path.length-1]` (et supprimer la recherche `pointInPolygon(mid…)`).
  - fallback sur l'ancien `onCutLot` si la nouvelle prop n'est pas branchée (rétro-compat).
- Brancher `onCutLotsAlongLine={handleCutLotsAlongLine}` dans `StepLotDesigner` (l. ~1079).

### 3. Aucune modif sur

- la géométrie/algo de coupe par lot (réutilisé tel quel)
- le mode `drawRoad` (déjà multi-lots côté `handleFinishRoadDraw`)
- les validations / frais / styles / snap / zoom

## Points techniques

- Intersection : continuer d'utiliser `lineSegmentIntersection` (segment-segment), comme `handleCutLot`. Une ligne qui ne touche que tangentiellement un lot (< 2 intersections) est ignorée pour ce lot, ce qui est le comportement attendu.
- Numérotation : `nextLotNumber(existing)` (utilitaire existant dans `polygonOps.ts`) appliqué de manière incrémentale au fur et à mesure que la liste grossit, pour éviter les collisions.
- Conserver les propriétés non-géométriques du lot d'origine (zone type, etc.) sur les deux enfants via spread `...lot`.
- Pas de changement de schéma, pas de migration.
