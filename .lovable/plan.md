

# Mise au premier plan de l'element selectionne

## Probleme
Quand on clique sur un lot ou une voie, il est selectionne visuellement (surbrillance) mais son ordre de rendu SVG ne change pas. Les elements dessines apres dans le code restent au-dessus, masquant partiellement l'element selectionne.

## Solution
En SVG, l'ordre de rendu est determine par l'ordre des elements dans le DOM (le dernier dessine est au-dessus). Pour mettre l'element selectionne au premier plan, il suffit de **trier les listes `lots` et `roads` avant le rendu** afin que l'element selectionne soit dessine en dernier.

### Fichier impacte

| Fichier | Modification |
|---------|-------------|
| `LotCanvas.tsx` | Trier `lots` et `roads` avant le `.map()` de rendu pour placer l'element selectionne en fin de liste |

### Detail technique

Dans la section de rendu des **roads** (~ligne 823) :
```typescript
{showRoads && [...roads].sort((a, b) => 
  (a.id === selectedRoadId ? 1 : 0) - (b.id === selectedRoadId ? 1 : 0)
).map(road => { ... })}
```

Dans la section de rendu des **lots** (~ligne 1078) :
```typescript
{[...lots].sort((a, b) => {
  const aSelected = a.id === selectedLotId || selectedLotIds.includes(a.id) ? 1 : 0;
  const bSelected = b.id === selectedLotId || selectedLotIds.includes(b.id) ? 1 : 0;
  return aSelected - bSelected;
}).map(lot => { ... })}
```

De plus, si un **lot** est selectionne, le groupe des lots doit etre rendu **apres** le groupe des roads, et inversement. On peut conditionner l'ordre de rendu des deux blocs (`roads` puis `lots` vs `lots` puis `roads`) en fonction de quel type d'element est selectionne :

```typescript
const renderRoads = () => showRoads && [...roads].sort(...).map(...);
const renderLots = () => lots.sort(...).map(...);

{selectedRoadId ? <>{renderLots()}{renderRoads()}</> : <>{renderRoads()}{renderLots()}</>}
```

Cela garantit que l'element clique est toujours visuellement au premier plan.

