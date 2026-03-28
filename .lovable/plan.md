

# Corriger les faux positifs de chevauchement entre lots adjacents

## Problème
Quand deux lots partagent une arête commune (limite mitoyenne), la fonction `doPolygonsOverlap` détecte les sommets partagés comme étant "à l'intérieur" du lot voisin (ray-casting sur un point exactement sur le bord). Cela produit des erreurs de validation faussement positives en rouge.

## Solution
Modifier `doPolygonsOverlap` pour tolérer les arêtes partagées : avant de conclure à un chevauchement, exclure les sommets qui se trouvent **sur une arête** du polygone voisin (distance point-segment < epsilon). Seuls les points strictement à l'intérieur comptent comme chevauchement réel.

## Changements

### `utils/geometry.ts`

1. **Ajouter `pointToSegmentDistance(point, segA, segB)`** — calcule la distance minimale entre un point et un segment.

2. **Ajouter `isPointOnPolygonEdge(point, polygon, epsilon)`** — retourne `true` si le point est sur une arête du polygone (distance < epsilon, ex: `1e-6`).

3. **Modifier `doPolygonsOverlap`** — ne considérer un sommet comme chevauchant que s'il est à l'intérieur du polygone ET pas sur une arête :
```typescript
export function doPolygonsOverlap(poly1: Point2D[], poly2: Point2D[]): boolean {
  for (const p of poly1) {
    if (isPointInPolygon(p, poly2) && !isPointOnPolygonEdge(p, poly2, 1e-6)) return true;
  }
  for (const p of poly2) {
    if (isPointInPolygon(p, poly1) && !isPointOnPolygonEdge(p, poly1, 1e-6)) return true;
  }
  return false;
}
```

### Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `utils/geometry.ts` | Ajouter `pointToSegmentDistance`, `isPointOnPolygonEdge`, modifier `doPolygonsOverlap` pour exclure les points sur les arêtes partagées |

