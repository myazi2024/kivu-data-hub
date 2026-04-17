
## Refonte de la profondeur visuelle des cards Analytics

### Diagnostic
- L’approche actuelle repose sur des `box-shadow` externes sur les cartes des graphiques.
- Dans Analytics, ces cartes sont rendues dans plusieurs conteneurs avec `overflow-hidden` / `overflow-x-hidden` (`DRCInteractiveMap.tsx`, `ProvinceDataVisualization.tsx`), donc les ombres débordantes sont souvent rognées.
- Même quand elles ne sont pas coupées, elles restent trop discrètes sur un fond clair.
- Il faut donc abandonner la logique “ombre externe seule” et passer à une **surface Analytics dédiée**, visible même sans débordement.

### Refonte proposée
1. Créer un nouveau style Analytics réutilisable dans `src/index.css` :
   - `.analytics-panel` pour les grands blocs
   - `.analytics-card` pour les KPI, graphiques et mini-cards
2. Ce nouveau style ne dépendra plus principalement d’un `box-shadow` externe, mais d’un relief combiné :
   - fond légèrement dégradé
   - bordure/ring plus lisible
   - ombre interne (`inset`) via pseudo-élément
   - léger halo/relief au hover
3. Supprimer l’usage de `shadow-[var(--shadow-analytics)]` sur les visuels Analytics.
4. Remplacer l’effet de focus actuel en `scale` par un état plus stable (`ring` + léger lift), pour éviter les effets coupés.

### Fichiers à modifier
- `src/index.css`
  - ajouter les classes utilitaires `.analytics-panel` et `.analytics-card`
  - retirer ou cesser d’utiliser `--shadow-analytics` / `--shadow-analytics-hover`
- `src/components/visualizations/shared/ChartCard.tsx`
  - appliquer `.analytics-card` à :
    - `ChartCard`
    - `StackedBarCard`
    - `MultiAreaChartCard`
    - `ColorMappedPieCard`
  - revoir l’état focus/hover
- `src/components/visualizations/shared/KpiGrid.tsx`
  - appliquer `.analytics-card` aux KPI
- `src/components/DRCInteractiveMap.tsx`
  - appliquer `.analytics-panel` aux grands blocs Analytics
  - appliquer `.analytics-card` aux petites cards de stats pour homogénéiser tout l’espace Analytics

### Détails techniques
- Rester 100% en classes sémantiques (`bg-card`, `border-border`, `ring-border`, `from-background`, `to-muted/20`, etc.)
- Utiliser `relative isolate overflow-hidden` + pseudo-éléments `before/after` pour créer une profondeur visible même dans les conteneurs clippés
- Si une ombre externe légère est conservée, elle restera secondaire ; la profondeur principale viendra du relief interne et du contour

### Résultat attendu
- Le bloc principal qui contient les diagrammes aura enfin une vraie présence visuelle
- Chaque visuel aura son relief individuel
- Les KPI, graphiques, mini-cards et panneaux Analytics auront un rendu cohérent
- Le rendu restera visible même dans les zones avec `overflow-hidden`

### Validation
- Vérifier sur desktop et sur viewport compact que :
  - le bloc Analytics principal ressort clairement
  - chaque graphique a bien son relief propre
  - les KPI ont la même profondeur visuelle
  - aucun effet n’est rogné pendant le scroll ou dans les panneaux Analytics
