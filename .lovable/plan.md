## Problème

Depuis l'ajout du batch multi-lots (`handleCutLotsAlongLine`), tracer une ligne sur la **parcelle-mère seule** (avant tout sous-lot) ne produit aucun effet : la ligne semble ignorée et aucune division n'apparaît.

Cause exacte (`StepLotDesigner.tsx`, ligne 533) :

```ts
if (lot.isParentBoundary || lot.vertices.length < 3) {
  nextLots.push(lot);
  continue;   // ← la parcelle-mère est systématiquement sautée
}
```

Avant le batch, le fallback appelait `handleCutLot` sur le lot contenant le milieu — et `handleCutLot` (l. 466) n'a aucune garde `isParentBoundary`, donc la mère était coupée sans souci. Le batch a accidentellement perdu ce comportement.

La modification de la longueur de voie (`RoadsListPanel`) n'est **pas** en cause — elle ne touche ni `handleCutLotsAlongLine`, ni le rendu du canvas, ni la liste `lots`.

## Changement

### `StepLotDesigner.tsx` — `handleCutLotsAlongLine` (l. 528-594)

Retirer la garde `lot.isParentBoundary` : la parcelle-mère doit pouvoir être coupée comme n'importe quel lot. Les deux enfants produits sont déjà marqués `isParentBoundary: false` (l. 575, 584), donc la mère disparaît au profit de deux vrais lots — exactement le comportement de `handleCutLot` historique.

```ts
if (lot.vertices.length < 3) {       // on garde uniquement la garde géométrique
  nextLots.push(lot);
  continue;
}
```

Aucune autre modification : algo d'intersection, numérotation `nextLotNumber`, analytics `lot_cut`, fallback `onCutLot`, rendu de la ligne en cours, mode `drawRoad`, et l'éditeur de longueur de voie restent strictement inchangés.

## Vérifications post-fix (non-régression)

- Diviser la parcelle-mère seule en deux lots via "tracer une ligne" → 2 lots créés, mère remplacée.
- Tracer une ligne traversant plusieurs sous-lots adjacents → toujours coupés en batch.
- Tracer une voie (`drawRoad`) → comportement inchangé (passe par `handleFinishRoadDraw`).
- Ajuster largeur ET longueur d'une voie dans le panneau → la liste `lots` n'est pas affectée.
