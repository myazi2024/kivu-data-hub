

# Contrôle de la longueur de la voie tracée

## Problème
La fonction `lineSegmentIntersection` (ligne 82) n'impose aucune contrainte sur le paramètre `t` de la ligne de coupe : elle étend la ligne tracée à l'infini. Résultat : même si l'utilisateur s'arrête au milieu du lot, la voie et la coupe s'étendent jusqu'aux deux bords opposés du lot.

## Solution
Modifier `handleFinishRoadDraw` pour que la voie respecte exactement les points tracés par l'utilisateur :

1. **La voie elle-même** garde déjà le `path` exact (c'est correct).
2. **La coupe du lot** doit utiliser les points réels du tracé comme extrémités de la voie, au lieu d'étendre la ligne jusqu'aux bords du lot.

### Logique révisée

Quand le tracé ne traverse pas entièrement le lot (une seule intersection ou zéro) :
- **0 intersection** : le tracé est entièrement à l'intérieur du lot → pas de coupe, juste la voie est créée.
- **1 intersection** : le tracé part d'un bord et s'arrête à l'intérieur → pas de coupe complète, juste la voie.
- **2 intersections** : le tracé traverse le lot de part en part → coupe + shrink comme actuellement.

Concrètement, contraindre `t` dans `lineSegmentIntersection` entre 0 et 1 quand appelé depuis le contexte road :

```typescript
// Nouvelle version : segment-segment intersection (t contraint aussi)
if (t < 0 || t > 1) return null; // Le point doit être SUR le segment tracé
if (u < 0 || u > 1) return null; // Le point doit être SUR l'arête du lot
```

Mais cela casserait `handleCutLot` qui a besoin de la ligne étendue. Solution : **créer une 2e fonction** `segmentSegmentIntersection` qui contraint les deux paramètres, et l'utiliser dans `handleFinishRoadDraw`.

### Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `StepLotDesigner.tsx` | Ajouter `segmentSegmentIntersection` (copie avec `t` contraint 0–1), l'utiliser dans `handleFinishRoadDraw` à la place de `lineSegmentIntersection` |

