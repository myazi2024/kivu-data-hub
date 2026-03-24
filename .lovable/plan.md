

# Synchronisation filtre Analytics → Zoom Carte RDC

## Objectif

Quand l'utilisateur sélectionne une province dans les filtres Analytics (colonne droite), la carte RDC (colonne gauche) zoome automatiquement sur cette province avec la même animation (600ms, ease-out cubique) que lors d'un clic direct sur la carte.

## Architecture actuelle

- Chaque bloc Analytics (`TitleRequestsBlock`, etc.) gère son propre `filter` local via `AnalyticsFilters`
- `ProvinceDataVisualization` orchestre les onglets mais ne remonte pas les changements de filtre
- `DRCMapWithTooltip` ne zoome que sur clic SVG direct — pas de réaction aux changements de la prop `selectedProvince`

## Plan

### 1. `AnalyticsFilters.tsx` — Ajouter callback `onProvinceChange`

Nouvelle prop optionnelle `onProvinceChange?: (province: string | undefined) => void`. Appelée dans le `onValueChange` du Select Province (en plus du `onChange` existant).

### 2. Chaque bloc Analytics — Propager le callback

Ajouter `onProvinceChange` comme prop à chaque bloc (`TitleRequestsBlock`, `ParcelsWithTitleBlock`, etc.) et le passer à `AnalyticsFilters`.

### 3. `ProvinceDataVisualization.tsx` — Remonter vers le parent

Nouvelle prop `onProvinceFilter?: (provinceName: string | undefined) => void`, passée au `BlockComponent` actif.

### 4. `DRCInteractiveMap.tsx` — Réagir au filtre province

- Recevoir le callback de `ProvinceDataVisualization`
- Trouver le `ProvinceData` correspondant au nom de province
- Appeler `setSelectedProvince(province)` pour mettre à jour le bloc de données

### 5. `DRCMapWithTooltip.tsx` — Zoom automatique sur changement de prop

Ajouter un `useEffect` qui surveille `selectedProvince` : quand il change vers une nouvelle province (et n'est pas déjà zoomé dessus), appeler `zoomToProvince(provinceId)`. Quand il passe à `null`, appeler `zoomOut()`.

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/visualizations/filters/AnalyticsFilters.tsx` | Prop `onProvinceChange` |
| `src/components/visualizations/ProvinceDataVisualization.tsx` | Prop `onProvinceFilter` + passage aux blocs |
| `src/components/visualizations/blocks/*.tsx` (13 blocs) | Prop `onProvinceChange` → `AnalyticsFilters` |
| `src/components/DRCInteractiveMap.tsx` | Handler province depuis analytics |
| `src/components/DRCMapWithTooltip.tsx` | `useEffect` zoom auto sur `selectedProvince` |

16 fichiers modifiés.

