

# Ajouter le visuel "Construites vs Non construites" — onglet Parcelles

## Objectif

Ajouter un graphique pie comparant les parcelles construites (`property_category !== 'Terrain nu'`) et non construites (`property_category === 'Terrain nu'`).

## Modifications

### 1. `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`

- Ajouter un `useMemo` :
```ts
const builtVsUnbuiltData = useMemo(() => {
  const built = filteredParcels.filter(p => p.property_category && p.property_category !== 'Terrain nu').length;
  const unbuilt = filteredParcels.filter(p => p.property_category === 'Terrain nu').length;
  return [
    { name: 'Construites', value: built },
    { name: 'Non construites', value: unbuilt },
  ].filter(d => d.value > 0);
}, [filteredParcels]);
```

- Ajouter dans `chartDefs` (après `property-category`, position 3) :
```ts
{ key: 'built-vs-unbuilt', el: () => <ChartCard
    title={ct('built-vs-unbuilt', 'Construites vs Non construites')}
    data={builtVsUnbuiltData} type={ty('built-vs-unbuilt', 'pie')}
    colorIndex={11} hidden={builtVsUnbuiltData.length === 0}
    insight={generateInsight(builtVsUnbuiltData, 'pie', 'la construction des parcelles')} /> }
```

### 2. `src/config/analyticsTabsRegistry.ts`

- Insérer après `property-category` (display_order 2) :
```ts
{ tab_key: 'parcels-titled', item_key: 'built-vs-unbuilt', item_type: 'chart',
  is_visible: true, display_order: 3, custom_title: 'Construites vs Non construites', chart_type: 'pie' },
```
- Décaler tous les `display_order` suivants de +1 (construction-type passe à 4, etc.)

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/config/analyticsTabsRegistry.ts` | Ajouter entrée `built-vs-unbuilt`, décaler orders |
| `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` | Ajouter données + chartDef |

