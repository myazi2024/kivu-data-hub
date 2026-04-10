

# Ajouter "Sans autorisation de bâtir" au graphique Autorisation de bâtir

## Constat

Le graphique actuel ne compte que les contributions ayant des permis (`building_permits` JSONB non vide). Or, quand l'utilisateur repond "Non" a la question "Avez-vous obtenu une autorisation de batir ?", `permitMode = 'request'` et `building_permits` reste vide/null. Ces cas doivent apparaitre comme "Sans autorisation".

## Modification

### `ParcelsWithTitleBlock.tsx` — bloc `permitTypeData` (lignes 66-78)

Modifier la logique pour :
1. Compter les permis existants comme avant (Construction / Regularisation)
2. Compter les contributions sans permis (`building_permits` null, vide, ou tableau vide) comme "Sans autorisation"

```typescript
const permitTypeData = useMemo(() => {
  const map = new Map<string, number>();
  filteredContribs.forEach(c => {
    const permits = c.building_permits;
    if (Array.isArray(permits) && permits.length > 0) {
      permits.forEach((p: any) => {
        const t = p?.permitType === 'regularization' ? 'Régularisation' 
                : p?.permitType === 'construction' ? 'Construction' : null;
        if (t) map.set(t, (map.get(t) || 0) + 1);
      });
    } else {
      map.set('Sans autorisation', (map.get('Sans autorisation') || 0) + 1);
    }
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}, [filteredContribs]);
```

## Impact

- 1 fichier modifie (~5 lignes changees)
- Aucune migration

