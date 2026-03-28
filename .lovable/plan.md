

# Détection et marquage des points d'intersection entre voies/lignes

## Problème
Quand une ligne de coupe ou une voie croise une voie existante, le point d'intersection n'est ni détecté, ni marqué, ni utilisé comme borne. Les mesures des segments de voies et lots ne sont pas recalculées à partir de ces jonctions.

## Solution

### 1. Détection des intersections route-route
Dans `handleFinishRoadDraw` et `handleCutLot`, après création de la voie/coupe, calculer les intersections entre le nouveau tracé et toutes les voies existantes (segment-segment). Chaque point d'intersection est inséré dans le `path` des deux voies concernées (la nouvelle et l'existante).

### 2. Insertion des points de jonction dans les paths
Pour chaque intersection trouvée :
- Insérer le point dans le `path` de la voie existante entre les deux points du segment traversé
- Insérer le point dans le `path` de la nouvelle voie au bon endroit

Cela segmente automatiquement les voies en tronçons dont les mesures sont recalculées.

### 3. Rendu visuel des points d'intersection
Dans `LotCanvas.tsx`, rendre un marqueur (cercle plein rouge/orange) à chaque point d'intersection détecté. L'intersection est identifiée à la volée en comparant chaque paire de segments de voies.

### 4. Recalcul des mesures
Les mesures de distance affichées sur les voies et lots utilisent déjà les segments entre points consécutifs du `path` / `vertices`. En insérant les points d'intersection, les mesures sont automatiquement découpées en tronçons corrects.

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `StepLotDesigner.tsx` | Ajouter une fonction `insertRoadIntersections(newRoad, existingRoads)` appelée dans `handleFinishRoadDraw` et `handleCutLot`. Cette fonction détecte les intersections segment-segment entre le nouveau tracé et chaque voie existante, insère les points dans les deux paths, et met à jour `roads` |
| `LotCanvas.tsx` | Ajouter un rendu de marqueurs circulaires (cercles SVG rouges, rayon ~5px) aux points d'intersection entre voies. Calculer ces points en comparant chaque paire de segments de voies dans le bloc de rendu |
| `utils/geometry.ts` | Ajouter `findRoadIntersections(road1Path, road2Path): Point2D[]` et `insertPointInPath(path, point, segmentIdx): Point2D[]` comme utilitaires réutilisables |

## Détail technique

```typescript
// utils/geometry.ts
function findRoadIntersections(path1: Point2D[], path2: Point2D[]): 
  { point: Point2D; seg1Idx: number; t1: number; seg2Idx: number; t2: number }[] {
  const results = [];
  for (let i = 0; i < path1.length - 1; i++) {
    for (let j = 0; j < path2.length - 1; j++) {
      const inter = segmentSegmentIntersection(path1[i], path1[i+1], path2[j], path2[j+1]);
      if (inter) results.push({ point: inter.point, seg1Idx: i, t1: ..., seg2Idx: j, t2: inter.t });
    }
  }
  return results;
}

// StepLotDesigner.tsx — dans handleFinishRoadDraw, après setRoads
const updatedRoads = [...roads, newRoad];
const finalRoads = insertAllIntersections(updatedRoads); // insère les points dans tous les paths
setRoads(finalRoads);

// LotCanvas.tsx — rendu des points d'intersection
{roadIntersectionPoints.map((pt, i) => (
  <circle key={`isect-${i}`} cx={pt.x * w} cy={pt.y * h} r={5} 
    fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
))}
```

