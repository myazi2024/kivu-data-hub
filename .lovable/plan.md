# Refonte du découpage parcelle-mère — Voie vs Limite

## Principe

Un seul outil de tracé : « Tracer une ligne ». À la fin du tracé, une **modal** s'ouvre et demande le rôle de la ligne (Voie ou Limite) puis les paramètres associés. Plus de mode `drawRoad` séparé, plus de découpe batch ambiguë : la **Limite** est la seule façon de découper la parcelle-mère et les lots.

## Comportement fonctionnel

### 1. Tracé d'une ligne
- Toolbar : un seul bouton actif « Tracer une ligne » (les autres modes utiles — sélection, éditer arête — restent).
- L'utilisateur dessine la ligne (drag simple ou multi-segments Shift+clic, comme aujourd'hui).
- À la validation, ouverture d'une `LineRoleDialog`.

### 2. Modal « Rôle de la ligne »
Deux choix : **Voie** ou **Limite**. La modal est en plusieurs étapes (rôle → paramètres) selon le choix.

#### Si Voie
Formulaire avec sections, pré-rempli par la règle de zonage active (`useZoningRules`) :
- **Largeur** (m) — slider + input, borné par `min_road_width_m` (défaut `recommended_road_width_m`).
- **Revêtement** — présent oui/non.
  - Oui → matériau (liste filtrée `road_surface_allowed_materials` + catalogue `subdivision_road_surface_materials`) + épaisseur cm (bornée min/max).
  - Non → on stocke `null` ; la validation de zonage signalera la non-conformité si requis.
- **Canal d'évacuation** — présent oui/non.
  - Oui → largeur, profondeur, matériau, type, pente, côté (réutilise `DrainageCanalSpec`).
  - Non → `null`.
- **Éclairage public** — présent oui/non.
  - Oui → électrique/solaire, hauteur, espacement, lumens, (batterie si solaire), côté.
  - Non → `null`.

À la confirmation : ajout d'un `SubdivisionRoad` (path = ligne tracée, dupliquée visuellement par la largeur via le rendu rectangle déjà existant). Aucune découpe de lots.

#### Si Limite
- **Mur construit** oui/non.
  - Oui → matériau (texte libre + presets) + hauteur (m).
  - Non → simple limite virtuelle.
- À la confirmation : la ligne devient une **Limite** et **découpe** tous les lots traversés (logique actuelle de `handleCutLotsAlongLine` renommée et nettoyée). La parcelle-mère est traitée comme un lot normal (le fix précédent reste valide).

### 3. Croisements & gomme visuelle
- Voies × Voies, Limites × Voies, Limites × Limites : les fragments restent en data, le **rendu SVG** masque les portions à l'intersection (mask SVG ou découpe géométrique uniquement au moment du dessin, sans toucher les arrays).
- **Cas spécial limite-traverse-voie** : à la confirmation de la limite, on **scinde** la ligne en deux segments distincts (avant/après la voie), chacun enregistré comme limite indépendante. Pas de lien logique entre les deux côtés.

### 4. Code mort à supprimer
- Mode `drawRoad` de `CanvasMode` + tous ses branchements (`onFinishRoadDraw`, hints, curseurs, preview).
- Anciens helpers/handlers qui n'avaient pas de UI accessible (passage par `convertZoneType` pour transformer une « zone dessinée » en voie — reste utile s'il est branché, sinon supprimé aussi).
- `handleCutLotsAlongLine` est conservée mais renommée `applyBoundaryCut` (sémantique « limite »), gardée pour la branche Limite. Le fallback `handleCutLot` (single lot) devient inutile et part.
- L'éditeur de longueur dans `RoadsListPanel` est conservé (édition après création reste pertinente), mais les voies créées via la nouvelle modal n'en dépendent plus pour exister.

## Détails techniques

### Nouveaux fichiers
```
src/components/cadastral/subdivision/dialogs/
  LineRoleDialog.tsx          # Modal racine (étape 1 : rôle)
  RoadParamsForm.tsx          # Étape 2 si Voie
  BoundaryParamsForm.tsx      # Étape 2 si Limite
src/components/cadastral/subdivision/utils/
  lineIntersections.ts        # Calcule intersections ligne×voies/limites
  segmentSplit.ts             # Scinde une ligne aux croisements de voies
  visualMask.ts               # Génère SVG <mask> pour gommer fragments
```

### Type changes (`types.ts`)
- `SubdivisionRoad` : champs déjà présents (drainage, lighting, surface) — pas de changement de schéma DB.
- `SubdivisionServitude` étendu OU nouveau type `SubdivisionBoundary` :
```ts
interface SubdivisionBoundary {
  id: string;
  path: Point2D[];          // 2 points (segment scindé si traverse voie)
  isBuilt: boolean;
  wallMaterial?: string;
  wallHeightM?: number;
}
```
Stocké dans `SubdivisionPlanData.boundaries` (nouveau tableau ; ne casse pas le rendu legacy car composant tolérant à absence).

### Flow d'intégration
1. `StepLotDesigner` : remplace les 2 boutons toolbar (drawLine / drawRoad implicite) par un seul.
2. `LotCanvas.onCutLotsAlongLine` devient `onLineDrawn(start, end, multiPath)` → `StepLotDesigner` ouvre `LineRoleDialog`.
3. Confirmation Voie → `setRoads(prev => [...prev, newRoad])` ; analytics `subdivision_road_created`.
4. Confirmation Limite → `applyBoundaryCut(path)` + `setBoundaries(prev => [...prev, ...splitSegments])` ; analytics `subdivision_boundary_created`.

### Rendu canvas (`LotCanvas.tsx`)
- Ajout d'une couche `<g id="boundaries">` au-dessus des lots, sous les voies.
- Ajout d'un `<defs><mask>` regroupant les rectangles d'emprise des voies — appliqué aux limites pour masquer les portions au-dessus des voies.
- Idem mask voies × voies (auto-référence, juste l'intersection rectangulaire).

### Suppression
- `CanvasMode = 'select' | 'drawLine' | 'selectEdge'` (drop `'drawRoad'`).
- Tous les branchements `mode === 'drawRoad'` (≈ 8 occurrences).
- Prop `onFinishRoadDraw` et `handleFinishRoadDraw` dans `StepLotDesigner`.
- Bouton « Convertir zone en voie » s'il n'est plus accessible.

## Vérifications post-implémentation
- Tracer une ligne → modal s'ouvre, Voie crée une voie sans toucher aux lots, Limite découpe.
- Voie + voie qui se croisent → fragments masqués visuellement, data intacte.
- Limite traversant une voie → 2 entrées `boundaries` créées, segment au-dessus de la voie absent du rendu.
- Édition largeur/longueur d'une voie existante (panneau) → comportement actuel inchangé.
- Validation zonage : voie sans revêtement / sans canal / sans éclairage quand requis → warning affiché.
- Plus aucune référence à `drawRoad` dans la codebase (`rg drawRoad` → 0).
