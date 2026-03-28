

# Division automatique des voies aux intersections

## Problème
Quand une ligne (coupe ou voie) croise une voie existante, le point d'intersection est détecté mais la voie reste un seul objet. L'utilisateur ne peut pas supprimer un tronçon indépendamment de l'autre.

## Solution
Lors du tracé d'une ligne ou d'une voie qui croise une voie existante, **diviser cette voie en deux voies distinctes** au point d'intersection. Chaque tronçon devient un objet `SubdivisionRoad` indépendant, sélectionnable et supprimable séparément.

## Détail technique

### 1. Nouvelle fonction utilitaire — `geometry.ts`
Ajouter `splitRoadsAtIntersections(roads)` qui remplace `insertAllRoadIntersections` :
- Pour chaque paire de voies, détecter les intersections segment-segment
- Au lieu d'insérer le point dans le path, **diviser la voie traversée** en deux nouvelles voies (path avant intersection + point, et point + path après intersection)
- Conserver les propriétés (largeur, surface, nom + suffixe a/b) sur chaque tronçon
- Retourner le tableau de voies mis à jour (potentiellement plus long que l'original)

```typescript
export function splitRoadsAtIntersections(roads: SubdivisionRoad[]): SubdivisionRoad[] {
  // Pour chaque nouvelle voie ajoutée, vérifier contre toutes les existantes
  // Si intersection trouvée : remplacer la voie existante par deux tronçons
  // Le point d'intersection est le dernier point du tronçon 1 et le premier du tronçon 2
}
```

### 2. Appel dans `StepLotDesigner.tsx`
- Dans `handleFinishRoadDraw` (ligne 428-430) : remplacer `insertAllRoadIntersections` par `splitRoadsAtIntersections`
- Dans `handleCutLot` : ajouter le même appel après la coupe si la ligne de coupe croise des voies

### 3. Marqueurs d'intersection — `LotCanvas.tsx`
Le rendu existant des marqueurs rouges (`getAllRoadIntersectionPoints`) reste pertinent pour visualiser les jonctions entre voies adjacentes (points communs aux extrémités).

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `utils/geometry.ts` | Ajouter `splitRoadsAtIntersections` qui divise les voies croisées en tronçons indépendants |
| `StepLotDesigner.tsx` | Remplacer `insertAllRoadIntersections` par `splitRoadsAtIntersections` dans `handleFinishRoadDraw` et `handleCutLot` |

