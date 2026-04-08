

# Ajout de la couche Territoires sur la carte interactive

## Contexte

La carte interactive (`/map`) a actuellement 3 niveaux de navigation : Provinces (SVG) → Communes (GeoJSON) → Quartiers (GeoJSON Goma). Le filtre "Territoire" existe dans Analytics (cascade rurale : Province → Section rurale → Territoire) mais n'est **pas connecté** a la carte. L'objectif est d'ajouter une 4e couche cartographique affichant le territoire selectionne.

## Source de donnees

Le fichier GeoPackage sur humdata.org (`OSM_RDC_sante_territoires_211212.gpkg`) contient les 145 territoires + 19 villes avec la propriete `name`. Il sera converti en GeoJSON et place dans `public/drc-territoires.geojson`.

## Plan technique

### Etape 1 — Generer le GeoJSON des territoires

- Telecharger le fichier `.gpkg` depuis humdata.org
- Convertir en GeoJSON via `ogr2ogr` (outil GDAL)
- Simplifier la geometrie pour reduire la taille (~2-3 MB max)
- Placer le fichier dans `public/drc-territoires.geojson`
- Structure attendue : `{ features: [{ properties: { name: "Kalehe", ... }, geometry: {...} }] }`

### Etape 2 — Creer le composant `DRCTerritoiresMap.tsx`

Nouveau composant SVG identique en architecture a `DRCCommunesMap.tsx` :
- Props : `province: string`, `territoire?: string`, `onTerritoireSelect?: (t: string) => void`
- Charge `/drc-territoires.geojson` au mount
- Filtre les features dont le `name` correspond aux territoires de la province selectionnee (via lookup dans `geographicData.ts` ou matching geographique)
- Calcule le bounding box dynamique avec zoom proportionnel sur le territoire selectionne
- Affiche les labels, tooltip au survol, highlight de la selection
- Attenuation des territoires non selectionnes (opacite 0.15)

### Etape 3 — Connecter le filtre Analytics a la carte

**Fichier** : `src/components/visualizations/filters/AnalyticsFilters.tsx`
- Creer `TerritoireFilterContext` et `TerritoireChangeContext` (meme pattern que `VilleFilterContext`/`VilleChangeContext`)
- Quand l'utilisateur selectionne un territoire dans le filtre rural, appeler le callback `onTerritoireChange`

**Fichier** : `src/components/visualizations/ProvinceDataVisualization.tsx`
- Ajouter les props `onTerritoireChange` et `selectedTerritoire`
- Wrapper le contenu avec `TerritoireChangeContext.Provider` et `TerritoireFilterContext.Provider`

### Etape 4 — Integrer dans `DRCInteractiveMap.tsx`

- Ajouter l'etat `selectedTerritoire` (meme pattern que `selectedVille`, `selectedCommune`)
- Passer `onTerritoireChange={setSelectedTerritoire}` et `selectedTerritoire` a `ProvinceDataVisualization`
- Dans la zone d'affichage de la carte (lignes 386-410), ajouter une condition : si `selectedTerritoire` est defini ET `sectionType === 'rurale'`, afficher `<DRCTerritoiresMap>` au lieu de la carte provinces/communes
- Mettre a jour le header contextuel et le breadcrumb (`scopeLabel`) pour inclure le territoire
- Mettre a jour `buildScopePredicate` pour prendre en compte le territoire dans le filtrage des KPIs scoped

### Etape 5 — Mettre a jour le scope label et le header

- Le breadcrumb doit afficher : `Kalehe — Nord-Kivu` quand un territoire est selectionne
- Le sous-titre doit afficher : `Decoupe du territoire de Kalehe — Nord-Kivu`

## Fichiers modifies/crees

| Fichier | Action |
|---------|--------|
| `public/drc-territoires.geojson` | Cree — donnees geographiques |
| `src/components/DRCTerritoiresMap.tsx` | Cree — composant carte SVG |
| `src/components/DRCInteractiveMap.tsx` | Modifie — integration couche + etat |
| `src/components/visualizations/filters/AnalyticsFilters.tsx` | Modifie — contextes territoire |
| `src/components/visualizations/ProvinceDataVisualization.tsx` | Modifie — propagation contexte |

**Impact** : ~250 lignes ajoutees, ~30 modifiees dans 4 fichiers existants.

