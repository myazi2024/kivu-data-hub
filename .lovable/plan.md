

# Corrections légende choroplèthe + couleurs sur la carte

## Problèmes

1. **Titre manquant** : La légende affiche "Densité parcelles" au lieu de "Densité parcelles cadastrées"
2. **Couleurs non appliquées sur la carte** : `DRCMapWithTooltip.tsx` force une couleur uniforme gris-bleu (`hsl(210, 40%, 85%)`) sur toutes les provinces, ignorant complètement la prop `getProvinceColor`. Le mouseout restaure aussi cette couleur uniforme au lieu de la couleur choroplèthe.

## Plan

### 1. `DRCInteractiveMap.tsx` — Renommer la légende

Ligne 212 : `"Densité parcelles"` → `"Densité parcelles cadastrées"`

### 2. `DRCMapWithTooltip.tsx` — Appliquer les couleurs choroplèthes

- **Initialisation SVG (lignes 61-69)** : Remplacer la couleur uniforme par `getProvinceColor(province)` pour chaque province ayant des données
- **mouseout (ligne 148)** : Restaurer `getProvinceColor(province)` au lieu de la couleur uniforme

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/DRCInteractiveMap.tsx` | Renommer légende |
| `src/components/DRCMapWithTooltip.tsx` | Utiliser `getProvinceColor` à l'init et au mouseout |

2 fichiers, corrections ciblées.

