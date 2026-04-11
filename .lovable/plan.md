

# Ajouter un filtre multi-nature sur le graphique "Évolution signalements" (Litiges)

## Objectif

Transformer le graphique "Évolution signalements" (actuellement une seule courbe) en un graphique multi-courbes où l'utilisateur peut cocher/décocher les natures de litige (Tous, Succession, Délimitation, Double vente, Occupation illégale, etc.) pour superposer leurs courbes d'évolution avec des couleurs distinctes.

## Approche

Le graphique `evolution` actuel utilise `ChartCard` avec `type="area"` (courbe unique). Il faut le remplacer par un composant dédié qui :
1. Calcule un trend mensuel **par nature de litige**
2. Affiche des checkboxes pour chaque nature + "Tous"
3. Rend un `AreaChart` multi-séries (une `<Area>` par nature cochée, couleurs distinctes)

## Modifications

### 1. `src/components/visualizations/blocks/DisputesBlock.tsx`

- Ajouter un `useMemo` calculant `trendByNature` : une structure `{ month, succession: N, delimitation: N, ... }[]`
- Remplacer le rendu `ChartCard` pour `evolution` par un nouveau composant `DisputeEvolutionChart` qui gère les checkboxes et le multi-area
- Importer `DISPUTE_NATURES` depuis `disputeSharedTypes.ts` pour les labels

### 2. `src/components/visualizations/shared/DisputeEvolutionChart.tsx` (nouveau)

Composant dédié contenant :
- State `selectedNatures: Set<string>` (par défaut : toutes cochées = courbe "Tous")
- Checkbox "Tous" qui affiche la courbe agrégée
- Checkboxes individuelles pour chaque nature présente dans les données
- `AreaChart` avec une `<Area>` par nature sélectionnée, chacune avec une couleur de `CHART_COLORS`
- Légende intégrée via les checkboxes elles-mêmes (pastille colorée + label)
- Même style Card que `ChartCard` (copier le wrapper)

### 3. `src/hooks/useAnalyticsChartsConfig.ts`

- Mettre à jour l'entrée `evolution` du registre `disputes` pour refléter le nouveau type `multi-area` (informatif pour l'admin)

## Comportement UX

- Par défaut : checkbox "Tous" cochée → affiche la courbe totale
- L'utilisateur décoche "Tous" et coche des natures individuelles → superposition des courbes par nature
- Cocher "Tous" décoche automatiquement les individuelles (et vice-versa)
- Chaque courbe a une couleur différente issue de `CHART_COLORS`

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `DisputeEvolutionChart.tsx` | Nouveau composant multi-courbes |
| `DisputesBlock.tsx` | Calculer trendByNature, remplacer le rendu evolution |
| `useAnalyticsChartsConfig.ts` | Annotation chart_type pour l'admin |

**Impact** : 1 nouveau fichier (~80 lignes), 2 fichiers modifiés (~20 lignes). Aucune migration.

