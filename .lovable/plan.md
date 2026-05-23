# Surface de la parcelle-mère cohérente avec ses côtés GPS

## Cause exacte du bug "triangle 788/387/802 → 2887 m²"

L'étape précédente a bien aligné `parentAreaGeomSqm` dans `StepLotDesigner.tsx`. **Mais** la surface visible dans le panneau "Lot" (champ « Surface » du lot sélectionné, ligne 1122) provient en réalité du « lot parent-boundary » créé dans `useSubdivisionForm.ts` :

```ts
// src/components/cadastral/subdivision/hooks/useSubdivisionForm.ts, ligne 441
areaSqm: Math.round(parentParcel.areaSqm),  // ← valeur DB, indépendante des côtés GPS
```

Cette `area_sqm` provient de la base (souvent saisie ou héritée d'un calcul antérieur incohérent). Pour un triangle dont les côtés GPS mesurent 788 / 387 / 802 m, la formule de Héron donne ~149 000 m², alors que la DB renvoie 2 887 m² — d'où l'incohérence visible.

Les étiquettes de côtés, elles, utilisent déjà `edgeLengthM(metricFrame)` (GPS) — donc cohérentes entre elles.

## Correctif (UI / présentation, aucune modif DB)

### `src/components/cadastral/subdivision/hooks/useSubdivisionForm.ts` — `createInitialLot`

Remplacer la ligne 441 :

```ts
areaSqm: Math.round(parentParcel.areaSqm),
```

par un calcul géométrique sur la même `metricFrame` que les côtés affichés, avec fallback DB :

```ts
const geomAreaSqm =
  metricFrame.hasGps && parentVertices.length >= 3
    ? Math.max(1, Math.round(polygonAreaSqmAccurate(parentVertices, metricFrame)))
    : Math.round(parentParcel.areaSqm);
// ...
areaSqm: geomAreaSqm,
```

Import à compléter : `polygonAreaSqmAccurate` depuis `../utils/metrics` (déjà importé partiellement via `MetricFrame`/`polygonPerimeterM`).

### Résultat

- Le panneau « Surface » du lot parent (sélectionné) affiche la surface réellement calculée à partir des côtés GPS (Héron pour un triangle).
- Triangle 788 / 387 / 802 → ~149 000 m² au lieu de 2 887 m².
- Cohérence parfaite : `Surface affichée == f(côtés affichés)` et `coveragePercent` reste consistant (déjà basé sur `parentAreaGeomSqm`).
- Si la parcelle n'a pas de coordonnées GPS, comportement actuel conservé (fallback DB).

## Hors-scope

- Aucune modification de `parentParcel.areaSqm` en base : la valeur DB reste utilisée pour la facturation serveur (`_shared/subdivisionFees.ts`), la persistance et l'affichage hors designer.
- Pas de changement des étiquettes de côtés (déjà GPS).
- Pas de migration ni de recalcul rétroactif des parcelles existantes.

## Vérification

1. Ouvrir une parcelle triangulaire avec GPS dont les côtés mesurent 788 / 387 / 802 m → la surface du « lot parent » doit afficher ~14,9 ha (149 000 m²).
2. La somme des surfaces des lots reste ≤ surface mère affichée (pas de faux dépassement).
3. Une parcelle sans GPS continue d'afficher la surface DB.
