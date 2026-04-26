## Problème

Quand l'utilisateur sélectionne une zone (un lot tracé) et la convertit en **Voie** via le bouton "Voie" du panneau latéral, la largeur résultante est forcée à `roadPresetWidth` (préréglage global de la barre d'outils, par défaut 6 m). On demande ensuite à l'utilisateur de "Réglez ci-dessous sa largeur" — alors que cette largeur est mécaniquement définie par la géométrie qu'il vient de tracer (aire ÷ longueur ≈ largeur du couloir).

## Comportement cible

Lors d'une conversion **lot → voie** :

1. Calculer la centerline du polygone (déjà fait via `polygonToCenterline` dans `convertZoneType.ts`).
2. Calculer la **longueur réelle** de cette centerline en mètres (via `MetricFrame`).
3. Calculer l'**aire réelle** du polygone en mètres² (déjà fait via `polygonAreaSqmAccurate`).
4. En déduire **largeur ≈ aire / longueur**, arrondie à 0,5 m près, bornée à [2 m, 30 m] (mêmes bornes que le slider).
5. Affecter cette largeur à la voie créée — au lieu de la valeur du préréglage.

Le préréglage `roadPresetWidth` reste utilisé uniquement pour les voies tracées **directement à la main** (mode "Tracer voie"), où la géométrie est une polyligne sans épaisseur déclarée.

## UI

Dans le panneau d'édition de voie (`StepLotDesigner.tsx` lignes 1175-1218) :

- Remplacer le texte **"Réglez ci-dessous sa largeur et son revêtement…"** par : "Largeur déduite automatiquement de la géométrie tracée. Vous pouvez l'ajuster manuellement si besoin."
- Ajouter un petit bouton **"Recalculer depuis la géométrie"** à côté du label "Largeur" qui relance le calcul à partir du polygone source (utile si l'utilisateur a édité les sommets).
- Afficher un badge discret "auto" tant que la largeur n'a pas été modifiée à la main.

## Détails techniques

**Fichier `src/components/cadastral/subdivision/utils/convertZoneType.ts`** :

- Ajouter une fonction `inferRoadWidthFromPolygon(vertices, frame)` :
  ```ts
  // largeur ≈ aire / longueur centerline, snap 0.5 m, clamp [2, 30]
  const areaM2 = polygonAreaSqmAccurate(vertices, frame);
  const center = polygonToCenterline(vertices);
  const lenM = edgeLengthM(center[0], center[1], frame);
  const w = lenM > 0 ? areaM2 / lenM : 6;
  return Math.min(30, Math.max(2, Math.round(w * 2) / 2));
  ```
- Dans `convertZoneType(..., 'road', ctx)` : si `source.lot` (donc on convertit un polygone) **et** `ctx.metricFrame` est fourni, utiliser `inferRoadWidthFromPolygon(polygon, ctx.metricFrame)` au lieu de `widthM` du contexte. Sinon garder le fallback actuel (`ctx.defaultRoadWidthM ?? 6`).

**Fichier `StepLotDesigner.tsx`** :

- `handleConvertSelectedZone` n'a rien à changer (la nouvelle largeur sort de `convertZoneType`).
- Adapter le texte d'aide (ligne ~1182).
- Ajouter le bouton "Recalculer" qui appelle `inferRoadWidthFromPolygon` sur le polygone reconstruit depuis la centerline + largeur courante (ou mémoriser le polygone source). Plus simple : exposer la fonction et la rappeler sur le polygone régénéré via `centerlineToPolygon(road.path, currentWidthNorm)` — mais ce serait circulaire. Solution propre : **stocker le polygone source** dans le champ `road.sourcePolygon?: Point2D[]` lors de la conversion, pour permettre un recalcul fiable. (Optionnel, peut être différé si l'on ne veut pas toucher au type.)

**Fallback minimal sans changer le type `SubdivisionRoad`** : ne pas ajouter le bouton "Recalculer" — la largeur est calculée une fois à la conversion, modifiable ensuite via slider. C'est ce que je recommande pour cette première passe.

## Hors périmètre

- Voies dessinées à la main (mode "Tracer voie") : conservent `roadPresetWidth` — l'utilisateur n'a pas tracé de polygone donc rien à inférer.
- Espaces communs : pas de notion de largeur, aucun changement.
- Édition ultérieure des sommets de la voie : la largeur reste libre (slider), pas de recalcul auto.

## Résumé des changements

| Fichier | Changement |
|---|---|
| `utils/convertZoneType.ts` | Nouvelle fonction `inferRoadWidthFromPolygon` + utilisation dans le branchement `toType === 'road'` quand un `metricFrame` est dispo |
| `steps/StepLotDesigner.tsx` | Mise à jour du texte d'aide du panneau voie pour refléter le calcul auto |
