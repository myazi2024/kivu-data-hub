

# Correction : impossible de cliquer sur une voie pour la sélectionner

## Problème
Le swap de couches (`selectedRoadId ? lotsBlock→roadsBlock : roadsBlock→lotsBlock`) ne résout pas le problème initial : quand aucune voie n'est sélectionnée, les lots sont rendus **au-dessus** des voies, donc le clic sur une voie est intercepté par le polygone du lot.

## Solution
Ajouter une couche de **hit-areas invisibles des voies** qui est **toujours rendue au-dessus de tout**, indépendamment de la sélection. Cela permet de cliquer sur une voie même quand les lots sont au premier plan.

### Détail technique

Après le rendu conditionnel `roadsBlock/lotsBlock`, ajouter un bloc supplémentaire qui rend uniquement les zones de clic invisibles des voies (polylines transparentes larges + polygones transparents) — toujours au-dessus :

```typescript
{/* Hit areas for roads — always on top for clickability */}
{showRoads && mode === 'select' && !readOnly && roads.map(road => {
  // Même calcul de polylineStr et polygonStr que dans roadsBlock
  return (
    <g key={`road-hit-${road.id}`}>
      <polyline ... fill="none" stroke="transparent" strokeWidth={Math.max(20, roadWidthPx + 10)}
        pointerEvents="all" onClick={e => handleRoadClick(road.id, e)} />
      <polygon ... fill="transparent" pointerEvents="all"
        onClick={e => handleRoadClick(road.id, e)} />
    </g>
  );
})}
```

### Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `LotCanvas.tsx` | Ajouter un bloc de hit-areas de voies toujours rendu après `lotsBlock`/`roadsBlock` (~10 lignes après la ligne 1389) |

