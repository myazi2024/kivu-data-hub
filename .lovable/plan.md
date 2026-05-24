# Édition des lignes internes — drag synchronisé + verrouillage parcelle-mère

## Problème actuel
Dans `StepLotDesigner` / `LotCanvas` (mode select) :
1. Quand on glisse une arête **partagée entre 2 lots**, seul le lot survolé bouge → la frontière commune se déforme, l'autre lot ne suit pas.
2. Quand on glisse une arête appartenant au **périmètre de la parcelle-mère**, elle bouge alors qu'elle doit être inviolable.
3. La ligne interne n'est pas explicitement sélectionnable comme une poignée d'ajustement.

## Comportement cible
- **Arête partagée entre 2 lots** (issue d'une coupe ou d'une fusion partielle) : drag direct qui déplace simultanément l'arête dans les deux lots adjacents, surfaces et périmètres recalculés en live pour les deux.
- **Arête du périmètre parcelle-mère** : verrouillée. Hover montre un curseur `not-allowed`, aucun mousedown ne démarre de drag.
- **Arête purement interne d'un seul lot** (cas rare, lot non-adjacent) : comportement actuel conservé (drag du seul lot).

## Implémentation

### 1. Détecter le type d'arête au mousedown
Dans `LotCanvas.tsx` (`handleEdgeMouseDown`, ~ligne 424) :
- Calculer une fois la liste des **arêtes partagées** (déjà fait via `sharedEdges` mémoïsé, ligne ~141) — réutiliser.
- Détecter si l'arête est **sur le périmètre parent** : les 2 sommets coïncident avec des sommets/arêtes du `parentVertices` (utiliser `isPointOnPolygonEdge` de `utils/geometry` avec tolérance ~1e-4).

Trois cas :
| Type | Action mousedown |
|---|---|
| Parent-boundary | `return` (bloqué) + curseur `not-allowed` |
| Shared (2 lots) | `startSharedEdgeDrag(lotId1, edgeIdx1, lotId2, edgeIdx2, normPos)` |
| Solo | `startEdgeDrag(...)` (existant) |

### 2. Nouveau drag "shared edge" dans `useCanvasDrag.ts`
Ajouter un type `'shared-edge'` au `DragState` portant `{ lotId1, edgeIdx1, lotId2, edgeIdx2, startNorm, startVerts1, startVerts2 }`.

Dans `moveDrag` :
- Calculer `dx, dy` depuis `lastNorm`.
- Pour le lot 1 : translater les 2 sommets de l'arête `edgeIdx1` (i et i+1) — code existant.
- Pour le lot 2 : identifier les 2 sommets de `edgeIdx2` qui correspondent géométriquement aux mêmes positions (matching par proximité, car ordre peut être inversé selon orientation de chaque ring) et les translater du même `dx, dy`.
- Recalculer area/perimeter pour les 2 lots, appeler `onUpdateLot` deux fois (ou un nouveau `onUpdateLots(batch)` pour atomicité — préférable pour l'undo unique).

### 3. Verrouillage parcelle-mère (ceinture + bretelles)
- **Bretelle 1** (détection auto au mousedown) : helper `isEdgeOnParentBoundary(p1, p2, parentVertices)` — true si les 2 sommets sont sur le périmètre parent ET sur le même côté parent.
- **Bretelle 2** (marquage) : déjà partiellement présent via `isParentBoundary` au niveau lot. Étendre : dans `useCanvasDrag.startEdgeDrag`/`startSharedEdgeDrag`, refuser si l'arête tombe sur le périmètre parent même quand le lot lui-même n'est pas `isParentBoundary` (cas d'un lot enfant collé au bord).
- Affichage : pour ces arêtes, rendre une `<line>` avec `stroke-dasharray` discrète et curseur `not-allowed` au hover en mode select.

### 4. Atomicité undo
Dans `StepLotDesigner` (handlers `onUpdateLot`), le drag déclenche un push d'historique à `endDrag`. Pour le shared-edge, le snapshot d'historique doit capturer l'état des deux lots ensemble — utiliser le mécanisme `canvasHistoryRef` existant et pousser **un seul** snapshot au `endDrag`.

### 5. Feedback visuel (mode select)
- Hover sur arête partagée : épaissir le trait (stroke-width x2) et passer le curseur en `cursor-ew-resize`/`ns-resize` selon l'orientation dominante.
- Hover sur arête parent-boundary : curseur `not-allowed`, pas d'épaississement.

## Fichiers touchés
- `src/components/cadastral/subdivision/hooks/useCanvasDrag.ts` — ajout du type drag `shared-edge` + matching de sommets jumeaux + batch update.
- `src/components/cadastral/subdivision/LotCanvas.tsx` — routing au mousedown (parent vs shared vs solo), curseurs, feedback hover sur arêtes.
- `src/components/cadastral/subdivision/utils/polygonOps.ts` (ou `geometry.ts`) — petit helper `isEdgeOnParentBoundary`.
- `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` — éventuel handler `onUpdateLotsBatch` pour push d'historique unique sur drag d'arête partagée.

## Hors-scope
- Pas de changement aux opérations split/merge/cut.
- Pas de changement aux frais ni à la validation serveur — les surfaces recalculées passent par les helpers `metrics.ts` déjà en place.
- Pas de touche aux drags vertex / polygon existants (sauf garde supplémentaire si le vertex appartient au périmètre parent).
