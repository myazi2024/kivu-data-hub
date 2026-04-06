

# Couche carte Quartiers de Goma depuis les filtres Analytics

## Contexte

Le dataset HDI contient 18 quartiers repartis dans 2 communes (Goma et Karisimbi) de la ville de Goma. Le GeoJSON source est disponible a `https://data.humdata.org/.../osm_goma_quartiers_210527.geojson`. Chaque feature a `name` (= quartier) et `is_in_commune` ou equivalent (= commune).

Actuellement, quand on selectionne une ville dans le filtre Lieu, la carte bascule de la carte RDC provinces vers la carte communes (`DRCCommunesMap`). Il faut ajouter un niveau supplementaire : quand on selectionne aussi une commune (ex: "Goma"), la carte bascule vers les quartiers de cette commune.

## Structure de la carte

```text
Carte RDC provinces (par defaut)
 └─ Carte communes (quand ville selectionnee)
     └─ Carte quartiers Goma (quand commune selectionnee ET ville = Goma)
```

## Modifications

### 1. Telecharger et simplifier le GeoJSON quartiers

- Telecharger `osm_goma_quartiers_210527.geojson` depuis HDI
- Simplifier les coordonnees (precision 4 decimales) pour reduire la taille
- Enregistrer dans `public/goma-quartiers.geojson`
- Chaque feature aura `name` (quartier) et un champ identifiant la commune parente

### 2. Creer le composant `DRCQuartiersMap.tsx`

- Meme architecture que `DRCCommunesMap.tsx` (SVG, projection proportionnelle, bounding box dynamique)
- Props : `ville: string`, `commune?: string`, `quartier?: string`
- Charge `public/goma-quartiers.geojson` via fetch
- Filtre les features par commune parente quand `commune` est defini
- Met en surbrillance le quartier selectionne (`name === quartier`)
- Tooltip au hover, labels SVG

### 3. Ajouter le contexte `QuartierFilterContext` et callback

- Dans `AnalyticsFilters.tsx` : exporter `QuartierFilterContext` et `QuartierChangeContext`
- Dans `ProvinceDataVisualization.tsx` : ajouter les providers + props `onQuartierChange`, `selectedQuartier`

### 4. Mettre a jour `DRCInteractiveMap.tsx`

- Ajouter state `selectedQuartier`
- Logique de bascule a 3 niveaux :
  - Si `selectedVille` ET `selectedCommune` ET ville === 'Goma' → afficher `DRCQuartiersMap`
  - Si `selectedVille` seulement → afficher `DRCCommunesMap`
  - Sinon → afficher carte provinces
- Mettre a jour le titre et la description contextuelle
- Passer `onQuartierChange={setSelectedQuartier}` et `selectedQuartier` a `ProvinceDataVisualization`

### 5. Mettre a jour `ProvinceDataVisualization.tsx`

- Ajouter props `onQuartierChange` et `selectedQuartier`
- Ajouter les providers `QuartierFilterContext` et `QuartierChangeContext`

### 6. Propager la selection quartier dans les filtres

- Dans `AnalyticsFilters.tsx`, quand le quartier change dans le filtre, appeler `handleQuartierChange` pour remonter au contexte carte

### Fichiers concernes
- `public/goma-quartiers.geojson` — nouveau fichier GeoJSON
- `src/components/DRCQuartiersMap.tsx` — nouveau composant carte quartiers
- `src/components/DRCInteractiveMap.tsx` — bascule 3 niveaux
- `src/components/visualizations/filters/AnalyticsFilters.tsx` — contextes quartier + propagation
- `src/components/visualizations/ProvinceDataVisualization.tsx` — providers quartier

