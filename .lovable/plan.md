## Objectif
Sur le croquis de la parcelle mère (onglet Lots du formulaire de lotissement), rendre les **épaisseurs de trait, les graduations et les étiquettes de cotes dynamiques au zoom** : quand l'utilisateur fait un zoom in, les contours s'affinent et les graduations se densifient (jusqu'au pas de **0,5 m**) sans encombrement, afin de permettre des ajustements fins.

## Fichier
- `src/components/cadastral/subdivision/LotCanvas.tsx` (uniquement le rendu SVG ; pas de logique métier, ni de types, ni de validations).

## Principe
Le SVG utilise un `viewBox` qui rétrécit avec `viewport.zoom`. Conséquence : tout `strokeWidth` / `fontSize` constant **grossit visuellement** au zoom. Pour neutraliser cet effet, on divise toutes les tailles visuelles par `z = viewport.zoom` (avec un plancher à 1 pour ne pas grossir au dézoom).

```ts
const z = Math.max(1, viewport.zoom);
const sw = (base: number) => base / z;     // épaisseur trait
const fs = (base: number) => base / z;     // taille texte
```

## Changements ciblés

### 1) Contour parcelle mère (~ligne 765-779)
- `strokeWidth={sw(2)}`, `strokeDasharray={`${sw(6)} ${sw(3)}`}`.

### 2) Graduations 5 m (~ligne 782-849)
- **Pas dynamique** selon le zoom (plus on zoome, plus c'est fin, jusqu'à 0,5 m) :
  ```
  z < 1.3 → step = 5 m  (ou 10 m si totalLen/5 > 400)
  z < 2   → step = 2 m
  z < 3   → step = 1 m
  z ≥ 3   → step = 0.5 m
  ```
- Majeurs adaptés au pas (25 m / 10 m / 5 m / 2 m respectivement), label affiché uniquement si `Lm ≥ majorEvery`.
- `strokeWidth={sw(0.6)}`, longueurs des ticks : `len = sw(isMajor ? 6 : 3)`, offset label : `sw(len + 5)`, `fontSize={fs(7)}`.
- Garde anti-encombrement : si le nombre total de ticks pour le pas calculé dépasse 600, retombe sur le pas immédiatement supérieur.

### 3) Cotes de côtés parcelle mère (~ligne 853-895)
- `rect` cote : `width={sw(44)}`, `height={sw(orientationLabel ? 22 : 14)}`, `rx={sw(3)}`, offsets (`-22`, `-8`, `+10`) tous passés par `sw(...)`, `strokeWidth={sw(0.5)}`.
- Textes : `fontSize={fs(9)}` (label longueur), `fontSize={fs(7)}` (orientation).
- Décalage `offsetX/Y` : remplacer la constante `16` par `sw(16) * z = 16` côté monde, mais comme on travaille en coords écran déjà scalées par le viewBox, on garde la formule actuelle (la position du label se rapproche naturellement de l'arête au zoom, ce qui est l'effet voulu).
- Précision affichée : `formatMeters` reste, mais on bascule en 1 décimale forcée quand `z ≥ 2` pour matcher la précision 0,5 m demandée — petit helper local :
  ```ts
  const labelMeters = z >= 2
    ? `${(Lm).toFixed(1).replace('.', ',')} m`
    : formatMeters(Lm);
  ```

### 4) Cohérence visuelle (optionnel mais aligné)
- Appliquer la même règle `sw(...)` au `strokeWidth` du tracé des **arêtes des lots** et au **contour des voies** (lignes ~902-960) pour que l'ensemble du croquis reste lisible quand on zoome fortement. Les couleurs, remplissages, sélections, snapping et logique d'édition ne changent pas.

## Hors scope
- Aucun changement au store de zoom (`useCanvasViewport`), aux raccourcis clavier, à la logique de snapping / cut / merge.
- Aucun changement aux types, aux frais (`subdivisionFees`), à la validation (`subdivisionValidation`), au PDF, à `StepPlanView`, ni au mini-map.
- Aucun toggle UI nouveau : on reste piloté par `showDimensions` existant pour ticks et cotes.
