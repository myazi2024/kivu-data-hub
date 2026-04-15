

# Ajouter le visuel "Construites vs Non construites" à l'onglet Parcelles

## Objectif

Ajouter un graphique comparant les parcelles construites et non construites, basé sur le champ `property_category` :
- **Non construites** : `property_category === 'Terrain nu'`
- **Construites** : `property_category !== 'Terrain nu'` (et non vide)

## Modifications

### 1. `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`

Ajouter un `useMemo` pour calculer les données :
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

Ajouter l'entrée dans `chartDefs` (après `property-category`, display_order logique) :
```ts
{ key: 'built-vs-unbuilt', el: () => <ChartCard title={ct('built-vs-unbuilt', 'Construites vs Non construites')} data={builtVsUnbuiltData} type={ty('built-vs-unbuilt', 'pie')} colorIndex={11} hidden={builtVsUnbuiltData.length === 0} insight={generateInsight(builtVsUnbuiltData, 'pie', 'la construction des parcelles')} /> }
```

### 2. `src/config/analyticsTabsRegistry.ts`

Ajouter l'entrée dans `parcels-titled.charts` (après `property-category`, ajuster les `display_order` suivants) :
```ts
{ tab_key: 'parcels-titled', item_key: 'built-vs-unbuilt', item_type: 'chart', is_visible: true, display_order: 3, custom_title: 'Construites vs Non construites', chart_type: 'pie' },
```
Décaler les `display_order` des charts suivants de +1.

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/config/analyticsTabsRegistry.ts` | Ajouter entrée `built-vs-unbuilt` |
| `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` | Ajouter données + chartDef |

