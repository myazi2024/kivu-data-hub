

# Corriger le tracé de voie sur une limite mitoyenne

## Problème

Quand on trace une voie sur la ligne séparant deux lots, le code cherche un lot **traversé** par la ligne (2 intersections dans un même lot). Sur une arête partagée, la ligne longe le bord sans traverser aucun lot → aucun lot n'est modifié, la voie se superpose simplement.

## Solution

Dans `handleFinishRoadDraw`, après la recherche d'un lot traversé (cas existant qui fonctionne), ajouter un **fallback** : si aucun lot n'est traversé, détecter si la ligne coïncide avec une arête partagée entre deux lots. Si oui, appliquer la même logique de retrait (shrink) que `handleConvertEdgeToRoad` — pousser les sommets proches de la ligne vers l'extérieur de chaque côté par `halfWidthNorm`.

## Changement unique — `StepLotDesigner.tsx`

Dans `handleFinishRoadDraw`, après le bloc `if (!targetLot || bestIntersections.length < 2)` (ligne 455), au lieu de retourner immédiatement :

1. Calculer la direction et la normale de la ligne tracée
2. Pour chaque lot, vérifier si au moins 2 sommets sont proches de la ligne (distance perpendiculaire < tolérance) → ce lot **borde** la voie
3. Pour chaque lot bordant la voie, pousser ces sommets vers l'extérieur (comme dans `shrinkPoly` / `handleConvertEdgeToRoad`)
4. Recalculer `areaSqm` et `perimeterM`

```text
handleFinishRoadDraw(path):
  1. Créer la voie (existant)
  2. Chercher lot traversé (existant)
  3. SI lot traversé → couper + shrink (existant)
  4. SINON (NOUVEAU) →
     - Pour chaque lot: compter sommets proches de la ligne
     - Si ≥ 2 sommets proches → shrink ce lot
     - Mettre à jour tous les lots modifiés
```

## Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` | Ajouter le fallback "shrink adjacent lots" dans `handleFinishRoadDraw` quand aucun lot n'est traversé |

