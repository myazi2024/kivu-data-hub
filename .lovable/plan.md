

## Doubler l'intensité des ombres des visuels Analytics

### Analyse
Les ombres des visuels Analytics sont définies dans `src/index.css` via la classe `.analytics-card` (et probablement `.analytics-panel`), avec un `box-shadow` interne combiné à des pseudo-éléments. Pour doubler l'effet, il faut amplifier les valeurs (opacité, blur, spread) du `box-shadow` principal et de l'état hover.

### Modification

**`src/index.css`**
- Sur `.analytics-card` : doubler l'opacité et/ou le blur des `box-shadow` (inset + externe légère).
- Sur `.analytics-card:hover` : doubler également l'intensité du halo.
- Idem pour `.analytics-panel` si applicable.

Exemple de transformation :
- Avant : `box-shadow: 0 1px 3px hsl(var(--foreground) / 0.08), inset 0 1px 0 0 hsl(var(--background) / 0.6);`
- Après : `box-shadow: 0 2px 6px hsl(var(--foreground) / 0.16), inset 0 2px 0 0 hsl(var(--background) / 0.6);`

### Résultat
Les visuels Analytics (graphiques, KPI, panneaux) auront un relief deux fois plus prononcé, tout en restant cohérents avec le design system sémantique.

