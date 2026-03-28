

# Tracer une voie = créer la voie + diviser le lot

## Probleme
Actuellement, "Tracer voie" crée uniquement la voie sans couper le lot traversé. L'utilisateur s'attend à ce que tracer une voie à travers un lot le divise automatiquement en deux, avec la voie entre les deux.

## Solution

Modifier `handleFinishRoadDraw` dans `StepLotDesigner.tsx` pour :

1. **Créer la voie** (comme actuellement)
2. **Trouver le lot traversé** par le tracé (en testant les intersections du chemin avec les arêtes de chaque lot)
3. **Couper ce lot en deux** le long de la ligne de tracé (réutiliser la logique de `handleCutLot`)
4. **Rétrécir les deux lots résultants** de `halfWidth` perpendiculairement à la voie, pour laisser la place à l'emprise de la voie (réutiliser la logique d'auto-shrink existante)

### Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `StepLotDesigner.tsx` | Enrichir `handleFinishRoadDraw` (~ligne 395) pour détecter le lot traversé, le couper en deux, et rétrécir les résultats selon la largeur de la voie |

### Logique

```text
handleFinishRoadDraw(path):
  1. Créer la voie (inchangé)
  2. Pour chaque lot, chercher 2 intersections du path avec ses arêtes
  3. Si un lot est traversé :
     a. Couper le lot en poly1 et poly2 (même algo que handleCutLot)
     b. Pour chaque polygone, décaler les sommets proches de la voie
        de halfWidthNorm vers l'extérieur (perpendiculaire à la voie)
     c. Remplacer le lot original par les deux nouveaux lots
```

