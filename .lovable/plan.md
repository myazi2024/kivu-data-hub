

# Suppression d'une voie au clavier (Delete/Suppr)

## Problème
Le handler `onDelete` dans `useCanvasKeyboard` (ligne 173 de `LotCanvas.tsx`) ne gère que la suppression de lots. Quand une voie est sélectionnée et qu'on appuie sur Supprimer, rien ne se passe.

## Solution
Ajouter la vérification de `selectedRoadId` dans le callback `onDelete` :

```typescript
onDelete: () => {
  if (selectedRoadId && onDeleteRoad) {
    onDeleteRoad(selectedRoadId);
  } else if (selectedLotId && onDeleteLot) {
    onDeleteLot(selectedLotId);
  }
},
```

### Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `LotCanvas.tsx` (ligne 173-175) | Ajouter la condition `selectedRoadId` avant la condition `selectedLotId` dans `onDelete` |

