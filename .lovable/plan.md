

## Augmenter l'ombre des visuels analytics

### Objectif
L'ombre des cartes de visualisation analytics est trop discrète. La doubler (taille et opacité) pour la rendre plus visible.

### Fichiers modifiés

**1. `src/index.css`** — Ajouter des variables CSS pour les ombres analytics

Ajouter après les variables shadow existantes (ligne 56) :
```css
/* Analytics shadows (doubled) */
--shadow-analytics: 0 8px 30px -10px hsl(var(--seloger-red) / 0.2);
--shadow-analytics-hover: 0 16px 50px -16px hsl(var(--seloger-red) / 0.35);
```

**2. `src/components/visualizations/shared/ChartCard.tsx`** — Appliquer les ombres aux 4 composants

| Composant | Ligne | Modification |
|-----------|-------|--------------|
| `ChartCard` | 327 | Remplacer `shadow-card hover:shadow-hover` par `shadow-[var(--shadow-analytics)] hover:shadow-[var(--shadow-analytics-hover)]` |
| `StackedBarCard` | 429 | Idem |
| `MultiAreaChartCard` | ~542 | Idem |
| `ColorMappedPieCard` | ~605 | Idem |

**Structure du changement** :
```tsx
<Card className={`... shadow-[var(--shadow-analytics)] hover:shadow-[var(--shadow-analytics-hover)] ...`}>
```

Les ombres seront ainsi deux fois plus grandes et plus opaques,