
Tripler l'ombre actuelle (déjà doublée) des visuels analytics.

**Fichier :** `src/index.css`

Modifier les variables existantes :
- `--shadow-analytics`: `0 24px 90px -10px hsl(var(--seloger-red) / 0.6)` (3× blur et opacité)
- `--shadow-analytics-hover`: `0 48px 150px -16px hsl(var(--seloger-red) / 1)` (3× blur, opacité plafonnée)

Aucun autre fichier modifié — les composants `ChartCard`, `StackedBarCard`, `MultiAreaChartCard`, `ColorMappedPieCard` utilisent déjà ces variables CSS.
