

# Fix — Données "Hauteur construction" manquantes en mode test

## Problème

Dans `testDataGenerators.ts` (ligne 347), les `building_shapes` générées pour les contributions et parcelles contiennent :
```json
{ "type": "rectangle", "x": 50, "y": 50, "width": 30, "height": 60 }
```

Mais le code analytics (`ParcelsWithTitleBlock.tsx` ligne 105 et `DRCInteractiveMap.tsx` ligne 81) cherche :
- **`heightM`** — hauteur de construction en mètres
- **`areaSqm`** — superficie construite

Ces champs sont absents, donc les graphiques "Hauteur construction" et "Taille construction" affichent 0, et la carte RDC affiche "—" pour la hauteur moyenne.

## Correction

**Fichier : `src/components/admin/test-mode/testDataGenerators.ts`**

Modifier la génération de `building_shapes` (ligne 346-348) pour inclure `heightM` et `areaSqm` :

```typescript
building_shapes: constructionNature
  ? [{
      type: 'rectangle',
      x: 50, y: 50,
      width: randInt(30, 80),
      height: randInt(20, 60),
      heightM: randInt(3, 15),          // Hauteur en mètres (3-15m)
      areaSqm: randInt(40, 300),        // Surface construite en m²
    }] as unknown as Json
  : [] as unknown as Json,
```

Cette modification unique corrige à la fois :
- Le graphique "Hauteur construction" dans Analytics / Parcelles
- Le graphique "Taille construction" dans Analytics / Parcelles
- L'indicateur "Haut. moy. construction" sur la carte RDC

Les données existantes nécessiteront une régénération via le bouton "Régénérer".

