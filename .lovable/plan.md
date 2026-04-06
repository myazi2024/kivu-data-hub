
# Atténuer les voisins quand une commune/quartier est sélectionné

## Problème
Quand une commune ou un quartier est sélectionné, les voisins ont la même opacité/couleur que d'habitude — pas de distinction visuelle claire entre la sélection et le contexte.

## Correction

Dans **DRCCommunesMap.tsx** (ligne 167) et **DRCQuartiersMap.tsx** (ligne 158), modifier la logique `fill` pour atténuer les features non sélectionnées quand une sélection est active :

```typescript
// Quand une sélection est active, les voisins deviennent très pâles
const hasSelection = !!commune; // (ou !!quartier pour QuartiersMap)
const fill = isSelected 
  ? HIGHLIGHT 
  : isHovered 
    ? 'hsl(var(--primary) / 0.55)' 
    : hasSelection 
      ? 'hsl(var(--muted) / 0.15)'  // voisins atténués
      : COLORS[i % COLORS.length];  // couleur normale

const stroke = isSelected ? HIGHLIGHT_STROKE : hasSelection ? 'hsl(var(--foreground) / 0.1)' : STROKE;
const strokeWidth = isSelected ? 2 : isHovered ? 1.5 : 0.8;
```

Les voisins passent à une opacité très faible (15%) avec un contour léger (10%), gardant le focus visuel sur la sélection.

### Fichiers modifiés
- `src/components/DRCCommunesMap.tsx` — atténuer voisins quand commune sélectionnée
- `src/components/DRCQuartiersMap.tsx` — atténuer voisins quand quartier sélectionné
