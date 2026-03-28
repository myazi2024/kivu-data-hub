

# Correction : impossible de sélectionner une voie

## Problème
Les lots sont **toujours** rendus après les voies dans le SVG (ligne 1060). Les polygones des lots couvrent donc entièrement la zone cliquable des voies, empêchant leur sélection.

## Solution
Inverser l'ordre de rendu des couches selon le type d'élément sélectionné, comme prévu dans le plan précédent mais non implémenté :

- **Par défaut** (aucun road sélectionné) : Roads → Lots (les lots sont au-dessus, cliquables normalement)
- **Quand une voie est sélectionnée** : Lots → Roads (la voie passe au-dessus)

De plus, ajouter `pointer-events: all` sur le hit-area invisible des voies et s'assurer que le polygone de hit-area de la voie a une priorité de clic suffisante.

### Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `LotCanvas.tsx` | Extraire le rendu des roads et des lots en deux blocs séparés, puis conditionner leur ordre avec `{selectedRoadId ? <>{lotsBlock}{roadsBlock}</> : <>{roadsBlock}{lotsBlock}</>}` |

### Détail technique

Extraire les deux blocs de rendu (~lignes 805-1058 pour roads, ~lignes 1060-1180 pour lots) dans des variables `roadsBlock` et `lotsBlock`, puis :

```typescript
{selectedRoadId ? (
  <>{lotsBlock}{roadsBlock}</>
) : (
  <>{roadsBlock}{lotsBlock}</>
)}
```

Cela garantit que la couche contenant l'élément sélectionné est toujours au-dessus et reste cliquable.

