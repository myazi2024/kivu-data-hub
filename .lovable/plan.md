# Pourquoi le lot étroit n’est pas sélectionnable

Pour chaque lot affiché en mode `select`, le canvas dessine au-dessus du polygone des « hit lines » invisibles de **14 px de large** sur chaque arête (`pointerEvents="stroke"`, `LotCanvas.tsx` ~ligne 1649). Quand un lot mesure moins de ~10 m de large, ces deux hit lines opposées **recouvrent intégralement l’intérieur du polygone** à l’écran.

Résultat : le clic tombe d’abord sur l’arête → `handleEdgeMouseDown` démarre un redimensionnement d’arête et appelle `e.stopPropagation()` (ligne 453). Le `onClick` du polygone ne se déclenche jamais, donc `onSelectLot` n’est jamais appelé → impossible de sélectionner le lot, donc impossible d’afficher le sélecteur « Type de zone (lot / voie / espace vert) » qui n’apparaît que pour le lot sélectionné (`StepLotDesigner.tsx`, `handleConvertSelectedZone` retourne si `!selectedLotId`).

Le même mécanisme protège déjà le drag du polygone (`handlePolygonMouseDown`, ligne 472) : il n’agit que si `lotId === selectedLotId`. Les arêtes n’ont pas cette garde.

# Correctif (chirurgical, frontend uniquement)

Aligner les arêtes sur le pattern du polygone : **un premier clic sélectionne le lot, un second clic redimensionne**.

## Fichier modifié

`src/components/cadastral/subdivision/LotCanvas.tsx`

### 1. `handleEdgeMouseDown` (~lignes 445-468)

Ajouter en tête, après les gardes `readOnly / mode / isParentBoundary` :

```ts
if (lotId !== selectedLotId) {
  e.stopPropagation();
  onSelectLot(lotId);
  onSelectRoad?.(null);
  setContextMenuLotId(null);
  return; // ne pas démarrer le edge-drag tant que le lot n'est pas le lot actif
}
```

Mettre à jour les dépendances du `useCallback` (`selectedLotId`, `onSelectLot`, `onSelectRoad`).

### 2. `onContextMenu` du hit-line d’arête (~lignes 1652-1667)

Pour rester cohérent : si `lotId !== selectedLotId`, d’abord sélectionner le lot puis ouvrir le menu contextuel d’arête (le menu reste utile, mais le lot devient actif en même temps). Ce point est optionnel mais évite la même confusion sur clic droit.

### 3. Aucun changement

- Mode `selectEdge` : intentionnellement laissé tel quel (cliquer une arête convertit en voie, c’est le but du mode).
- `handleVertexMouseDown` : les poignées de sommets ne s’affichent que pour le lot déjà sélectionné (ligne 1682 `isSelected && ...`), donc pas de problème.
- Pas de changement de logique métier, de seuils, ni de styles.

## Validation

- Tracer un lot étroit (largeur < 10 m), cliquer dessus → le lot devient sélectionné (contour primaire), le panneau « Type de zone » s’affiche.
- Cliquer une seconde fois sur la même arête → comportement actuel (resize d’arête).
- Cliquer sur un lot large non sélectionné → reste sélectionnable (le clic tombe sur l’intérieur du polygone comme avant).
- `selectEdge` mode et conversion edge → voie : inchangés.
