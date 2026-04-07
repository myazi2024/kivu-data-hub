
# Audit — Fonctionnalité de tracé de construction dans le croquis parcelle

## Constats

### A. Fonctionnalités absentes

1. **Pas d'édition GPS des sommets de construction par double-clic** — Les bornes de parcelle supportent le double-clic pour éditer les coordonnées GPS (overlay `editingBorneIndex`), mais aucun mécanisme équivalent n'existe pour les sommets d'une construction validée. Impossible de corriger un sommet après validation.

2. **Pas d'édition/modification d'une construction validée** — Une fois validée, la seule option est de supprimer la construction entière (popup Leaflet ou bouton "Supprimer"). Impossible de déplacer un sommet, ajouter/retirer un sommet, ou ajuster la forme.

3. **Pas de liaison visuelle entre construction tracée et construction déclarée (Infos)** — Le `linkedIndex` est assigné séquentiellement (ligne 1549 : `linkedIndex: buildingShapes.length`) mais n'est jamais affiché. L'utilisateur ne sait pas quelle construction tracée correspond à quelle construction déclarée (principale, additionnelle 1, etc.).

4. **Pas de sélection de la construction cible avant tracé** — Quand `requiredBuildingCount > 1`, l'utilisateur trace dans l'ordre sans pouvoir choisir "je trace la construction additionnelle 2". Le mapping est implicite et fragile.

5. **Pas de déplacement d'une construction validée** — Contrairement à la parcelle (nudge + rotation), les constructions ne peuvent pas être déplacées ou pivotées après placement.

6. **Pas d'affichage de la dimension du dernier segment (fermeture)** — Pendant le tracé, les distances s'affichent entre sommets successifs (lignes 1104-1119) mais pas la distance de fermeture (dernier sommet → premier). L'utilisateur ne connaît pas la longueur du dernier côté avant de valider.

### B. Bugs et erreurs de logique

7. **`removeLastBuilding` supprime toujours la dernière** — Le bouton (ligne 2476) supprime `buildingShapes.slice(0, -1)` sans tenir compte du `linkedIndex`. Si l'utilisateur supprime la dernière construction, les `linkedIndex` des restantes deviennent incohérents.

8. **Suppression via CustomEvent fragile** — La suppression par `document.dispatchEvent(new CustomEvent('remove-building'))` (lignes 1038-1040, 1140-1147) est un anti-pattern React : contourne le flux de données, risque de fuite mémoire si le listener n'est pas nettoyé correctement, et ne recalcule pas les `linkedIndex` des constructions restantes.

9. **ReviewTab utilise l'ancien modèle de données** — Ligne 283 dans ReviewTab : `const labels = { circle: 'Cercle', square: 'Carré', rectangle: 'Rectangle', trapeze: 'Trapèze', polygon: 'Polygone' }` — ces labels correspondent à l'ancien système de formes fixes, pas au nouveau modèle par sommets.

10. **`exitMarkerMoveMode` ne restaure pas le mode construction** — Ligne 1594 : si on sort du mode déplacement de borne pendant un tracé de construction, le `dataset.addingBuilding` n'est pas restauré à `'true'`, ce qui casse le tracé en cours.

### C. Redondances

11. **Champs rétro-compatibilité inutiles** — `type?`, `center?`, `size?`, `rotation?` dans `BuildingShape` (lignes 56-60) ne sont jamais utilisés dans le nouveau code. Ils encombrent l'interface.

12. **Double rendu des dimensions** — Les dimensions des côtés validés sont affichées à la fois dans le popup Leaflet (lignes 1033-1043) et comme `divIcon` markers (lignes 1046-1063). Redondance visuelle.

### D. Optimisations

13. **Calcul de surface non affiché en temps réel** — Pendant le tracé, la surface du polygone en cours n'est pas calculée/affichée. L'utilisateur doit valider pour connaître la surface.

14. **Aucune validation de la surface construction vs surface parcelle** — Pas de vérification que la surface totale des constructions ne dépasse pas la surface de la parcelle.

15. **Le compteur de constructions ne montre pas le détail** — Le bloc en bas (lignes 2461-2484) affiche `N/M constructions tracées` mais pas le nom/catégorie de chaque construction liée.

---

## Plan de corrections

### Fichier : `src/components/cadastral/ParcelMapPreview.tsx`

**1. Édition GPS des sommets de construction par double-clic**
- Ajouter un état `editingBuildingVertex: { shapeId: string; vertexIdx: number } | null` et un overlay similaire à `editingBorneIndex` pour modifier lat/lng d'un sommet de construction.
- Sur le rendu des constructions validées, ajouter des `circleMarker` interactifs sur chaque sommet avec un handler `dblclick` ouvrant l'overlay d'édition.
- Après modification, recalculer `sides`, `areaSqm`, `perimeterM`.

**2. Liaison explicite construction tracée ↔ construction déclarée**
- Recevoir une nouvelle prop `constructionLabels: string[]` (ex: `['Construction principale', 'Villa secondaire', ...]`) calculée depuis le parent.
- Avant le tracé, si `requiredBuildingCount > 1`, afficher un sélecteur (badge ou dropdown) pour choisir quelle construction on trace. Stocker le `linkedIndex` choisi.
- Dans le popup et le compteur, afficher le nom de la construction liée (ex: "Construction 1 — Villa").

**3. Affichage de la distance de fermeture pendant le tracé**
- Quand `buildingVertices.length >= 3`, afficher aussi la distance du segment de fermeture (dernier → premier).

**4. Surface en temps réel pendant le tracé**
- Calculer et afficher `calculateBuildingArea(buildingVertices)` dans le badge de tracé quand ≥ 3 sommets.

**5. Corriger `removeLastBuilding` et suppression**
- Remplacer le `CustomEvent` par un callback direct passé au popup via un bouton React.
- Après suppression, recalculer les `linkedIndex` de toutes les constructions restantes.

**6. Corriger `exitMarkerMoveMode`**
- Restaurer `dataset.addingBuilding = 'true'` si `isDrawingBuilding` est actif.

**7. Nettoyer les champs rétro-compatibilité**
- Supprimer `type?`, `center?`, `size?`, `rotation?` de l'interface `BuildingShape`.

**8. Compteur détaillé avec noms des constructions**
- Remplacer le compteur simple par une liste montrant chaque construction liée (catégorie + surface) avec possibilité de supprimer individuellement.

### Fichier : `src/components/cadastral/ccc-tabs/LocationTab.tsx`

**9. Calculer et passer `constructionLabels`**
- Construire un tableau de labels depuis `formData.propertyCategory` (principale) + `additionalConstructions[].propertyCategory`.

### Fichier : `src/components/cadastral/ccc-tabs/ReviewTab.tsx`

**10. Corriger les labels obsolètes**
- Remplacer le mapping `circle/square/rectangle/trapeze/polygon` par l'affichage des vrais `sides` et `areaSqm` du modèle actuel.

### Fichier : `src/components/cadastral/CadastralContributionDialog.tsx`

**11. Passer `constructionLabels`** via LocationTab.

**Impact** : ~150 lignes modifiées/ajoutées dans 4 fichiers.
