

# Corrections graphique "Hauteur construction" et ordre d'affichage

## Problemes identifies

1. **Ordre JSX incorrect** : Dans `ParcelsWithTitleBlock.tsx`, le graphique "Evolution" (ligne 211) est rendu AVANT permit-type, building-size et building-height. L'utilisateur veut que "Evolution" soit le dernier graphique affiché.

2. **Props manquantes** : Les graphiques `building-size` et `building-height` n'ont pas les props `crossVariables` et `rawRecords`, contrairement aux autres graphiques. Cela empêche l'analyse croisée.

3. **Registry display_order** : Les `display_order` dans le registre sont déjà corrects (evolution=14, permit=15, size=16, height=17) mais le JSX ne suit pas cet ordre.

## Modifications

### 1. `ParcelsWithTitleBlock.tsx` — Reordonner et completer

- Deplacer les 3 graphiques (permit-type, building-size, building-height) **avant** le graphique "Evolution"
- Ajouter `crossVariables={cx('building-size')} rawRecords={filteredContribs} groupField="building_shapes"` sur building-size
- Ajouter `crossVariables={cx('building-height')} rawRecords={filteredContribs} groupField="building_shapes"` sur building-height

Ordre final dans le JSX :
```
...subdivided → geo → permit-type → building-size → building-height → evolution (dernier)
```

### 2. `useAnalyticsChartsConfig.ts` — Ajuster display_order

Reordonner pour refléter l'ordre voulu :
- permit-type: 14
- building-size: 15
- building-height: 16
- evolution: 17 (dernier)

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` | Reordonner JSX + ajouter props cross |
| `src/hooks/useAnalyticsChartsConfig.ts` | Ajuster display_order |

**Impact** : ~10 lignes modifiées dans 2 fichiers. Aucune migration.

