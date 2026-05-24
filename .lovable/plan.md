## Objectif
Ajouter sur le croquis de la parcelle mère (onglet Lots) de petites graduations tous les **5 m** le long de chaque côté, pour servir de règle visuelle lors du découpage, sans alourdir le plan.

## Fichier
- `src/components/cadastral/subdivision/LotCanvas.tsx` (un seul ajout dans le rendu SVG, après le tracé du contour parent ~ligne 780).

## Rendu proposé
Nouveau bloc SVG `<g class="parent-ticks">` placé juste avant le bloc « Parent parcel side measurements » :

- Pour chaque côté `(v, next)` de `parentVertices` :
  - Calculer la longueur réelle `Lm = edgeLengthM(v, next, metricFrame)`.
  - Pas = **5 m**. Pour chaque `k = 5, 10, …` tant que `k < Lm` :
    - `t = k / Lm`, point sur l'arête en coords écran : `p = lerp(toScreen(v), toScreen(next), t)`.
    - Normale unitaire à l'arête (vers l'extérieur via `polygonCentroid(parentVertices)`).
    - Petit trait : `p` → `p + n * tickLen`.
- Longueurs :
  - Tick standard : **3 px**.
  - Tick « majeur » tous les **25 m** : **6 px** + micro-label `"25"`, `"50"`… en `fontSize=7` (police muted, opacité 0.55) — n'apparaît que si `Lm ≥ 25 m` pour éviter le bruit sur les petits côtés.
- Style : `stroke="hsl(var(--primary))"`, `strokeWidth={0.6}`, `opacity={0.45}`, `pointerEvents="none"`, `className="select-none"`.
- Garde-fous anti-encombrement :
  - Skip total si `Lm < 10 m` (côté trop court).
  - Si le nombre total de graduations sur l'ensemble du périmètre dépasse 400, on bascule automatiquement le pas à 10 m (cas parcelles très grandes).
  - Cacher quand `!showDimensions` (réutilise le toggle existant « Dimensions ») pour rester cohérent avec les cotations.

## Hors scope
- Pas de changement aux types, à la logique métier, aux frais, à la validation, au PDF, à `StepPlanView`, ni aux voies/lots.
- Pas de toggle UI dédié : on se cale sur `showDimensions` déjà existant.
