

# Masquer les noms de territoires en mode "showAll"

## Problème

Quand les 164 territoires sont affichés simultanément (filtre Rurale + Tous les territoires), les labels texte se superposent et rendent la carte illisible.

## Modification

### `src/components/DRCTerritoiresMap.tsx` (ligne ~191)

Conditionner le rendu des labels `<text>` : ne pas les afficher quand `showAll` est `true` et qu'aucun territoire n'est sélectionné. Les labels restent visibles quand :
- On est en mode province (pas `showAll`)
- Un territoire spécifique est sélectionné (même en `showAll`)

Concrètement, entourer le bloc `filtered.map` des labels (lignes 191-208) avec une condition :

```
{(!showAll || territoire) && filtered.map(...)}
```

Le tooltip au survol (ligne 211+) reste actif pour identifier les territoires au hover.

## Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `src/components/DRCTerritoiresMap.tsx` | Conditionner l'affichage des labels |

