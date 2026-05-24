## Objectif

Permettre, dans l'onglet "Lot" du SubdivisionRequestDialog, de saisir et faire glisser les sommets de lots situés sur le périmètre de la parcelle-mère, contraints à rester sur ce périmètre. Tous les lots partageant ce sommet suivent en temps réel ; aucune validation ne bloque le drag (les alertes s'affichent après).

## Comportement attendu

- Au survol d'un sommet d'un lot qui se trouve sur le bord de la parcelle-mère, le curseur passe en mode "glissement contraint" (curseur `grab` + halo visuel sur le sommet).
- Mousedown : on capture le sommet et l'arête du périmètre sur laquelle il repose (segment `[Pk, Pk+1]` du `parentVertices`).
- Mousemove : la position souris est projetée sur le périmètre entier (segment courant en priorité, puis segments voisins si le curseur dépasse `Pk` ou `Pk+1`). Le sommet glisse librement le long du périmètre, peut franchir un sommet de la parcelle-mère et continuer sur l'arête suivante.
- Tous les lots qui partagent ce sommet (même coordonnée, tolérance epsilon ≈ 1e-4 en normalisé) voient ce sommet mis à jour ensemble, en une seule transaction d'update — la jonction reste cohérente, leurs surfaces et périmètres sont recalculés via `computeMetrics`.
- Mouseup : commit final, l'historique undo/redo capture l'état.
- Aucun blocage live (auto-intersection, surface minimale, enclavement). Les alertes existantes (`validateSubdivisionFull`) restent et s'affichent dans le panneau de validation après le drop.

## Détection "sommet sur périmètre"

Un sommet de lot `v` est éligible si `isPointOnPolygonEdge(v, parentVertices, eps)` est vrai. Le segment d'attache est l'arête `[Pk, Pk+1]` la plus proche (distance point-segment minimale).

## Projection sur le périmètre

Nouvelle utilitaire `projectOnPolyline(point, ring, startEdgeIdx)` dans `utils/geometry.ts` :
1. Projeter `point` sur l'arête `startEdgeIdx` → si la projection tombe à l'intérieur du segment (param t ∈ [0,1]), on garde.
2. Sinon, on étend la recherche aux arêtes voisines (avant/après) puis à tout l'anneau, et on retient la projection à distance euclidienne minimale.
3. Retourne `{ point: Point2D, edgeIdx: number, t: number }`.

Cela permet de "tourner" autour d'un coin de la parcelle-mère sans décrocher.

## Propagation aux lots voisins

Nouveau helper dans `useCanvasDrag.ts` : `startBoundaryVertexDrag(lotId, vertexIdx)` :
- Trouve tous les `(lotId, vertexIdx)` dont la coordonnée normalisée correspond à celle du sommet capturé (epsilon).
- Stocke la liste dans `dragState.boundaryTwins: { lotId, vertexIdx }[]`.
- Stocke `dragState.startEdgeIdx` (arête de départ sur le périmètre).

Dans `moveDrag`, branche `'boundary-vertex'` :
- Projeter la souris via `projectOnPolyline`.
- Pour chaque twin, cloner `vertices`, remplacer `vertices[vertexIdx]` par la position projetée, recalculer métriques, et appeler `onUpdateLot`.

## Intégration dans `LotCanvas.tsx`

- Dans le rendu des handles de sommets (cercles draggables existants), détecter via une fonction `isOnParentBoundary(v)` les sommets éligibles et appliquer un style distinct (anneau pointillé `stroke-primary`, curseur `grab`).
- Brancher `onMouseDown` sur ces sommets vers `startBoundaryVertexDrag` au lieu de `startVertexDrag` standard.
- Aucun changement aux autres types de drag (edge/shared-edge/polygon/vertex interne).

## Détails techniques

Fichiers modifiés :
- `src/components/cadastral/subdivision/utils/geometry.ts` — ajouter `projectPointOnSegment` (si absent) et `projectOnPolyline`.
- `src/components/cadastral/subdivision/hooks/useCanvasDrag.ts` — nouveau type `'boundary-vertex'`, `startBoundaryVertexDrag`, branche dans `moveDrag` avec projection + propagation aux twins ; signature étendue pour recevoir `parentVertices`.
- `src/components/cadastral/subdivision/LotCanvas.tsx` — calcul mémoïsé des sommets-sur-bord, style visuel distinct, routage du mousedown, passage de `parentVertices` au hook.

Garanties :
- Aucune écriture serveur, aucun changement de modèle de données.
- `computeMetrics` continue d'utiliser `polygonAreaSqmRelative` (cohérence somme = parent).
- Epsilon de matching aligné avec l'existant (`polygonOps.ts` ≈ 1e-4).
- Pas de validation live : l'utilisateur garde la main, les alertes apparaissent dans le panneau après mouseup comme aujourd'hui.

Hors scope :
- Snap automatique au bord pour les sommets internes (l'utilisateur a choisi "Uniquement sommets de lots sur la limite").
- Validations bloquantes pendant le drag.
- Modification des arêtes internes ou de la géométrie de la parcelle-mère.