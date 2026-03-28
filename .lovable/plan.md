

# Remplacer les cliparts emoji par des formes géométriques de bâtiments

## Problème
Le bouton "Cliparts" ouvre une palette d'emojis (arbre, maison, etc.). L'utilisateur souhaite plutôt une liste de **formes géométriques de construction** (cercle, carré, rectangle, trapèze, polygone) — le même système que celui déjà implémenté dans `ParcelMapPreview.tsx` (SHAPE_OPTIONS) — afin de placer une forme dans un lot.

## Solution
Réutiliser le concept de `SHAPE_OPTIONS` de `ParcelMapPreview.tsx` dans le module de lotissement. Quand l'utilisateur clique sur "Cliparts", il voit les 5 formes géométriques. Il en sélectionne une, puis clique dans un lot pour y placer la forme (rendue en SVG au lieu d'un emoji).

## Changements

### 1. `types.ts` — Adapter le type d'annotation
- Modifier `LotAnnotation['type']` pour inclure les formes géométriques : `'circle' | 'square' | 'rectangle' | 'trapeze' | 'polygon'` (remplacer les types emoji actuels ou les garder en complément)
- Mettre à jour `CLIPART_TYPES` avec les 5 formes géométriques (icône Lucide au lieu d'emoji) : Cercle, Carré, Rectangle, Trapèze, Polygone

### 2. `ClipartPalette.tsx` — Afficher les formes géométriques
- Remplacer le contenu de la grille par les 5 formes avec icônes Lucide (Circle, Square, Triangle, Hexagon) au lieu d'emojis
- Titre changé en "Formes de construction"

### 3. `LotCanvas.tsx` — Rendu SVG des formes
- Dans le bloc annotations (ligne 1154), remplacer le `<text>` emoji par un rendu SVG conditionnel selon le type :
  - `circle` → `<circle>` SVG
  - `square` → `<rect>` SVG (carré)
  - `rectangle` → `<rect>` SVG (allongé)
  - `trapeze` → `<polygon>` SVG (trapèze)
  - `polygon` → `<polygon>` SVG (hexagone)
- Couleur de remplissage semi-transparente (rouge/gris) avec contour

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `types.ts` | Mettre à jour `LotAnnotation['type']` et `CLIPART_TYPES` avec les formes géométriques |
| `ClipartPalette.tsx` | Afficher les formes avec icônes Lucide au lieu d'emojis |
| `LotCanvas.tsx` | Rendre les annotations en formes SVG au lieu d'emojis texte |

