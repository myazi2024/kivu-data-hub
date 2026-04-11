# Graphique multi-series "Évolution signalements" par nature de litige

## Objectif

(Transformer le graphique "Évolution signalements" (onglet Litiges) en graphique multi-courbes. L'utilisateur pourra cocher/decocher les natures de litige (Succession, Delimitation, Double vente, Occupation illegale, etc.) pour superposer leurs courbes d'evolution. Une option "Tous" affiche la courbe agregee.) Le graphique est "**Évolution du nombre de litige foncier" est le graphique qui va intégrer ces modifications.**

## Modifications

### 1. `src/components/visualizations/shared/ChartCard.tsx` — Nouveau composant `MultiAreaChartCard`

Creer un composant exporte `MultiAreaChartCard` dans le meme fichier (ou un fichier dedie) :

- Props : `title`, `icon`, `iconColor`, `colSpan`, `series` (tableau `{ key: string; label: string; data: {name:string; value:number}[] }[]`), `insight?`
- Etat local : `selectedKeys: Set<string>` initialise avec `'all'`
- Rendu : 
  - Rangee de checkboxes (Tous + chaque nature) au-dessus du graphique
  - Quand "Tous" est coche : une seule courbe Area agregee
  - Quand des natures specifiques sont cochees : une courbe Area par nature, chacune avec une couleur differente de `CHART_COLORS`
  - Recharts `AreaChart` avec `Legend` et `Tooltip`
- Meme style (Card, copy-as-image, focused state) que `ChartCard`

### 2. `src/components/visualizations/blocks/DisputesBlock.tsx` — Remplacer le rendu evolution

- Calculer `trendByNature` : un `useMemo` qui genere pour chaque nature un tableau mensuel `{name, value}[]`, plus un "Tous" agrege (= le `trend` actuel)
- Utiliser les labels depuis `DISPUTE_NATURES_MAP` pour afficher les noms lisibles
- Remplacer la ligne 165 (`ChartCard` simple) par le nouveau `MultiAreaChartCard` avec les series calculees

### 3. `src/hooks/useAnalyticsChartsConfig.ts` — Mettre a jour le type

- Changer `chart_type: 'area'` en `chart_type: 'multi-area'` pour l'entree `disputes > evolution` (ligne 468) afin que l'admin voie le bon type

## Detail technique : calcul trendByNature

```text
const trendByNature = useMemo(() => {
  // Collecter toutes les natures presentes
  const natures = [...new Set(filtered.map(d => d.dispute_nature).filter(Boolean))];
  // Pour chaque nature, grouper par mois
  const series = natures.map(nature => ({
    key: nature,
    label: DISPUTE_NATURES_MAP[nature] || nature,
    data: trendByMonth(filtered.filter(d => d.dispute_nature === nature))
  }));
  // Ajouter "Tous"
  series.unshift({ key: 'all', label: 'Tous', data: trend });
  return series;
}, [filtered, trend]);
```

## Fichiers concernes


| Fichier                                                  | Action                                                    |
| -------------------------------------------------------- | --------------------------------------------------------- |
| `src/components/visualizations/shared/ChartCard.tsx`     | Ajouter `MultiAreaChartCard`                              |
| `src/components/visualizations/blocks/DisputesBlock.tsx` | Calculer series par nature, utiliser `MultiAreaChartCard` |
| `src/hooks/useAnalyticsChartsConfig.ts`                  | Changer chart_type en 'multi-area'                        |


**Impact** : ~80 lignes ajoutees dans 3 fichiers. Aucune migration.