

## Plan — Mesures précises et exhaustives sur chaque tracé (lots, voies, espaces communs)

### Diagnostic

#### Bug #1 — Mesures de la parcelle mère imprécises pour les formes irrégulières
Dans `LotCanvas.tsx` (lignes 766-773), quand un côté n'a pas de `length` saisi dans `parentSides`, le label se calcule via `√areaSqm × distance_normalisée`. Cette formule **n'est exacte que pour un carré parfait**. Dès que la parcelle est rectangulaire, en L, en trapèze… les longueurs affichées divergent fortement de la réalité GPS.

**Cause racine** : `gpsToNormalized` (geometry.ts L83) projette via la bounding box GPS (lat/lng) et ignore que 1° de longitude ≠ 1° de latitude en mètres → la grille normalisée est anisotrope. Reconvertir avec une échelle unique `√A` introduit une déformation.

#### Bug #2 — Mesures des lots/voies/espaces : même biais
- `getDimensionLabel` (LotCanvas L646-651) : utilise `sideLength = √parentAreaSqm` → biais identique pour tout polygone-fils.
- Surfaces des lots-enfants après split/cut : calculées en proportion **de la surface normalisée** (StepLotDesigner L336-340, L439-443), avec `Math.round` puis `area2 = totalArea − area1` → drift sur petits lots, pas de cohérence avec le périmètre.
- **Périmètres pas recalculés** sur split/cut/merge (L344-359, L447-454, L386-393) : `perimeterM` est hérité du lot parent → la sidebar affiche le périmètre de la parcelle entière sur chaque lot-enfant.

#### Bug #3 — Voies et espaces communs : aucune cote affichée
Sur le canvas, les voies n'affichent que nom + largeur, jamais la longueur. Les espaces communs n'affichent ni longueur de côtés, ni surface inscrite. L'utilisateur ne peut pas lire les dimensions par élément.

### Approche — Source de vérité géométrique unique

Introduire un module `metrics.ts` qui transforme tout point normalisé en mètres via une **projection métrique anisotrope** dérivée de la parcelle mère :

```
sxM = (largeur_GPS_en_metres_à_la_latitude_moyenne)
syM = (hauteur_GPS_en_metres)
distanceMeters(a, b) = hypot((b.x − a.x) × sxM, (b.y − a.y) × syM)
polygonAreaMeters(poly) = polygonArea_normalisée(poly) × (sxM × syM)
```

Cela élimine l'hypothèse « parcelle carrée » et garantit que :
- Σ(surfaces lots + voies + espaces) = surface parcelle mère (à l'arrondi près).
- Les longueurs des côtés s'additionnent à un périmètre cohérent.
- Les valeurs affichées correspondent aux distances GPS réelles.

### Livrables

#### 1. Module `utils/metrics.ts` (nouveau)
- `buildMetricFrame(parentGps, parentAreaSqm)` → `{ sxM, syM, areaScale }` (calcule les deux échelles via Haversine sur les bornes GPS ; bascule sur `√A`/`√A` si pas de GPS).
- `edgeLengthM(a, b, frame)` — longueur d'arête en mètres.
- `polygonPerimeterM(poly, frame)` — somme.
- `polygonAreaSqmAccurate(poly, frame)` — surface absolue en m², pas de proportion.
- `formatMeters(m)` — `"12,4 m"` sous 100 m, `"124 m"` au-delà ; cohérent partout.

#### 2. Hook `useSubdivisionForm.ts`
- Exposer `metricFrame` calculé en `useMemo` (depuis `parentParcel.gpsCoordinates` et `areaSqm`).
- `createInitialLot` : utiliser `polygonPerimeterM` du nouveau module.

#### 3. Recalcul systématique sur mutations — `StepLotDesigner.tsx`
- `handleSplitLot`, `handleCutLot`, `handleMergeLots` : recalculer `areaSqm` **et** `perimeterM` des lots-enfants avec `polygonAreaSqmAccurate` + `polygonPerimeterM` (plus de proportion ni d'héritage).
- Idem dans `useCanvasDrag` après chaque drag de sommet/arête : `updateLot` reçoit `vertices + areaSqm + perimeterM` recalculés (la garde `isParentBoundary` reste).

#### 4. Affichage des cotes — `LotCanvas.tsx`

**Parcelle mère** (L755-802) :
- Si `parentSides[i].length` saisi → afficher cette valeur (autorité : déclaration utilisateur).
- Sinon → `edgeLengthM(v, next, frame)` (plus de `sideLength` heuristique).

**Lots** (L1259-1277) :
- `getDimensionLabel` réécrit pour utiliser `frame`.
- Ajouter un libellé central par lot : `Lot N° X · 250 m² · P 64 m` (toggle `showAreas`/`showLotNumbers` existants).

**Voies** :
- Afficher la **longueur** de chaque tronçon le long de l'axe (en plus du nom et de la largeur déjà présents).
- Afficher la **surface emprise** au centre (`longueur × largeur`).

**Espaces communs** :
- Afficher la longueur sur chaque côté (comme les lots), la surface au centroïde, le type/nom au-dessus.

#### 5. Légende & cohérence
- `formatMeters` partagé : panneau latéral, canvas, récap, exports PDF — une seule source.
- Panneau latéral : la fiche d'un lot/voie/espace affiche surface + périmètre + longueur (voie) calculés depuis le **frame**, plus jamais d'héritage.
- Dans la barre d'outils canvas, un bouton « Cotes » contrôle `showDimensions` pour les **trois** types d'éléments (aujourd'hui uniquement les lots).

#### 6. Garantie d'intégrité visuelle
- Tooltip sur la surface de chaque lot : « Calculée depuis la projection GPS de la parcelle mère ».
- Si l'écart `Σ surfaces − surface parcelle` > 1% : badge d'avertissement orange dans la barre d'outils (utilise déjà `validateSubdivision`, qu'on alimente via le frame).

### Vérification

1. Parcelle mère rectangulaire 80×40 (3200 m²) : les côtés affichent 80 m et 40 m (et non 56,5 m comme aujourd'hui).
2. Diviser → deux lots 40×40 : chaque lot affiche 40 m × 40 m, surface 1600 m², périmètre 160 m (auparavant le périmètre restait 240 m).
3. Tracer une voie de 6 m de large entre les deux lots → la voie affiche sa longueur (40 m) et sa surface (240 m²).
4. Ajouter un espace commun → côtés cotés, surface affichée au centre.
5. Σ(surfaces lots + voies + espaces) = 3200 m² ± 1 m² → pas de badge d'écart.
6. Recharger un brouillon : les valeurs persistées sont remplacées par celles recalculées via le frame (cohérence garantie même si un ancien draft a des `perimeterM` incorrects).

### Fichiers modifiés

- `src/components/cadastral/subdivision/utils/metrics.ts` *(nouveau)*
- `src/components/cadastral/subdivision/hooks/useSubdivisionForm.ts` (expose `metricFrame`, `createInitialLot`)
- `src/components/cadastral/subdivision/hooks/useCanvasDrag.ts` (recalcul aire/périmètre après drag)
- `src/components/cadastral/subdivision/LotCanvas.tsx` (cotes parent/lots/voies/espaces, `getDimensionLabel` via frame, libellé central voies/espaces)
- `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` (split/cut/merge → aire + périmètre exacts ; sidebar via `formatMeters`)
- `src/components/cadastral/subdivision/utils/geometry.ts` (déprécier `polygonPerimeter(...√A)` au profit du frame ; conserver les autres helpers)

Aucune migration BD ni edge function impactée.

