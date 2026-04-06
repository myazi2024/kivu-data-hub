

# Couche carte Villes/Communes depuis les filtres Analytics

## Contexte

Le dataset HDI contient 58 communes reparties dans 11 villes de la RDC. Le GeoJSON (94 KB, simplifie) a ete genere et place dans `public/drc-communes.geojson`. Chaque feature a `is_in_admi` (= ville) et `name` (= commune).

Actuellement, le filtre Lieu dans Analytics ne contient pas de niveau "Ville" — il passe directement de Section Urbaine a Commune. Il faut reintroduire le filtre "Ville" entre Section et Commune, puis utiliser ce filtre pour piloter l'affichage d'une nouvelle couche carte.

## Structure cible du filtre Lieu (urbain)

```text
Province → Section Urbaine → Ville (nouveau) → Commune → Quartier → Avenue
```

## Modifications

### 1. Reintroduire le champ `ville` dans le filtre

**`src/utils/analyticsHelpers.ts`** :
- Ajouter `ville?: string` dans `AnalyticsFilter`
- Ajouter le check `ville` dans `matchesLocation` (`if (f.ville && r.ville !== f.ville) return false`)
- Ajouter `ville` dans `buildFilterLabel`

### 2. Ajouter le select "Ville" dans les filtres Analytics

**`src/components/visualizations/filters/AnalyticsFilters.tsx`** :
- Dans la cascade urbaine, ajouter un select "Ville" avant "Commune" :
  - Visible des que `sectionType === 'urbaine'`
  - Options depuis `getVillesForProvince(province)` (deja disponible dans geographicData)
  - Quand on selectionne une ville, les communes se filtrent via `getCommunesForVille`
  - Reset : changer de ville reset commune, quartier, avenue
- Le `implicitVille` actuel est remplace par `filter.ville` explicite
- Exporter un nouveau contexte `VilleFilterContext` pour communiquer la ville selectionnee a la carte
- Exporter un nouveau contexte `CommuneFilterContext` pour communiquer la commune selectionnee a la carte

### 3. Creer le composant de carte communes

**`src/components/DRCCommunesMap.tsx`** (nouveau) :
- Charge `public/drc-communes.geojson` via fetch
- Props : `ville?: string`, `commune?: string`
- Quand `ville` est defini : filtre les features ou `is_in_admi === ville`, calcule le bounding box et affiche la carte zoomee dynamiquement
- Quand `commune` est aussi defini : met en surbrillance la feature ou `name === commune`
- Rendu SVG avec projection proportionnelle (meme style que DRCMapWithTooltip)
- Tooltip au hover montrant le nom de la commune
- Couleurs : communes avec fond colore, commune selectionnee en surbrillance

### 4. Integrer la carte communes dans DRCInteractiveMap

**`src/components/DRCInteractiveMap.tsx`** :
- Ajouter un state `selectedVille` et `selectedCommune` (provenants des filtres Analytics via contextes)
- Logique de bascule : si `selectedVille` est defini, remplacer la carte RDC provinces par la carte communes (DRCCommunesMap)
- Si `selectedVille` est vide, afficher la carte provinces classique
- Mettre a jour le titre de la carte pour refleter la ville affichee
- Propagation : `VilleFilterContext.Provider` et `CommuneFilterContext.Provider` dans ProvinceDataVisualization

### 5. Mettre a jour les contextes dans ProvinceDataVisualization

**`src/components/visualizations/ProvinceDataVisualization.tsx`** :
- Ajouter les providers `VilleFilterContext` et `CommuneFilterContext`
- Les callbacks remontent les valeurs vers DRCInteractiveMap

### 6. Mettre a jour les blocs de visualisation

**Tous les 14 blocs** : ajouter le reset de `ville` dans le `useEffect` qui gere `mapProvince` :
```typescript
useEffect(() => { 
  setFilter(f => ({ ...f, province: mapProvince || undefined, ville: undefined })); 
}, [mapProvince]);
```

### 7. GeoCharts — ajouter "Par ville"

**`src/components/visualizations/shared/GeoCharts.tsx`** :
- Ajouter un graphique "Par ville" entre Section et Commune dans la cascade urbaine

### Fichiers concernes
- `public/drc-communes.geojson` (deja genere)
- `src/utils/analyticsHelpers.ts` — ajouter `ville` au filtre
- `src/components/visualizations/filters/AnalyticsFilters.tsx` — ajouter select Ville + contextes
- `src/components/DRCCommunesMap.tsx` — nouveau composant carte communes
- `src/components/DRCInteractiveMap.tsx` — bascule carte provinces/communes
- `src/components/visualizations/ProvinceDataVisualization.tsx` — providers contexte
- `src/components/visualizations/shared/GeoCharts.tsx` — graphique "Par ville"
- 14 fichiers blocs — reset ville

