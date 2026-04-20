

## Plan — Couche « Quartiers RDC » (toutes provinces · urbaine)

### Objectif

Reproduire la logique existante de la couche `Territoires` (`selectedSectionType === 'rurale'` + aucune province ⇒ vue nationale des 164 territoires) pour le cas symétrique :

**`selectedSectionType === 'urbaine'` + aucune province sélectionnée ⇒ vue nationale des quartiers RDC (12 villes, 385 quartiers, source humdata.org/OSM).**

### Source de données

`https://data.humdata.org/dataset/quartiers-rdc-quarters-drc`
- 385 quartiers de 12 villes (Kinshasa, Lubumbashi, Goma, Bukavu, Kisangani, Mbuji-Mayi, Kananga, Matadi, Mbandaka, Bunia, Kolwezi, Likasi)
- Champs : `name`, `commune`, `ville`
- Format source : Shapefile → à convertir en GeoJSON

### Étapes

**1. Asset GeoJSON**
- Télécharger l'archive humdata `OSM_RDC_quartiers_221007.zip`
- Convertir SHP → GeoJSON simplifié (tolérance ~0.0005°) avec uniquement `name`, `commune`, `ville` en propriétés
- Cible : `public/drc-quartiers.geojson` (~1–2 Mo après simplification, comparable à `drc-territoires.geojson`)

**2. Nouveau composant `DRCQuartiersAllMap.tsx`**

Calque national, calqué sur `DRCTerritoiresMap.tsx` :
```tsx
interface Props {
  ville?: string;             // filtre éventuel par ville
  commune?: string;           // filtre éventuel par commune
  quartier?: string;          // sélection
  showAll?: boolean;          // true = toute la RDC
  onQuartierSelect?: (q: string) => void;
  getEntityColor?: (name: string) => string | undefined;  // choroplèthe profil
  profileLabel?: string;
}
```
- Lit `/drc-quartiers.geojson` via `useGeoJsonData`
- Mêmes mécaniques : `projectFeature`, `useAnimatedBbox`, hover/click, palette `COLORS`, `HIGHLIGHT`
- Labels visibles uniquement quand `ville` ou `quartier` ciblé (≤ ~30 features) — sinon trop dense
- Tooltip : `<quartier> — <commune>, <ville>`

**3. Branchement dans `DRCInteractiveMap.tsx`**

a) Ajouter une condition AVANT le bloc `selectedVille && selectedCommune === 'goma'` (ligne ~378) :

```tsx
} else if (selectedSectionType === 'urbaine' && !selectedVille) {
  // Vue nationale des quartiers (toutes villes RDC)
  <DRCQuartiersAllMap
    showAll={!selectedProvince}
    ville={undefined}
    commune={undefined}
    quartier={selectedQuartier}
    onQuartierSelect={(name) => { setSelectedQuartier(name); }}
    getEntityColor={getQuartierColor}
    profileLabel={activeProfile?.legendTitle}
  />
}
```

b) Mettre à jour le titre/sous-titre de l'en-tête (lignes 332–349) pour refléter ce nouveau contexte :
- Titre : `Quartiers — RDC` (ou `Quartiers — <Province>` si une province est sélectionnée mais sans ville)
- Sous-titre : `Carte des 385 quartiers urbains de la RDC (12 villes)`

c) Aucune modification de `useMapDrilldown` ni du système de couleurs/profils — `getQuartierColor` existe déjà et est réutilisé tel quel.

**4. Conservation du comportement existant**
- `selectedVille === 'Goma'` continue d'utiliser `DRCQuartiersMap` (`/goma-quartiers.geojson`) — précision actuelle conservée
- `selectedSectionType === 'rurale'` : inchangé (territoires)
- Le clic sur un quartier dans la vue nationale alimente `setSelectedQuartier` ; le breadcrumb et `scopeLabel` se mettent à jour automatiquement

### Fichiers touchés

| Fichier | Action |
|---|---|
| `public/drc-quartiers.geojson` | **Nouveau** — généré depuis humdata SHP, simplifié |
| `src/components/DRCQuartiersAllMap.tsx` | **Nouveau** — calqué sur `DRCTerritoiresMap.tsx` |
| `src/components/DRCInteractiveMap.tsx` | Ajout d'une branche conditionnelle + libellés d'en-tête |
| `mem://features/land-data-analytics/interactive-map-layers-fr` | Mise à jour : ajout du 5ᵉ niveau de navigation national urbain |

### Hors périmètre

- Pas de modification de `DRCQuartiersMap.tsx` (Goma reste prioritaire dès qu'on entre dans la ville)
- Pas de changement des analytics/KPI (`useMapIndicators` agrège déjà par quartier)
- Pas de nouvelle table BD ni edge function (asset statique)
- Aucun couplage avec le formulaire CCC ou les services

### Détails techniques

- **Conversion SHP → GeoJSON** : exécutée côté Lovable avec `ogr2ogr` (GDAL via nix) lors de l'implémentation, simplifiée avec `mapshaper` ou `topojson-simplify` pour rester < 2 Mo
- **Performance** : 385 polygones SVG ≈ acceptable (territoires = 164, quartiers Goma = ~30) ; on désactive les labels au niveau national pour éviter le surcroît de DOM
- **Cohérence visuelle** : même palette `hsl(var(--primary) / x)`, même `HIGHLIGHT`, même `useAnimatedBbox` → expérience identique à la couche territoires
- **Couleur par profil métier** : `getQuartierColor` (déjà construit dans `buildEntityColorFn('quartier')`) est passé tel quel ; le matching se fait sur `r.quartier` (déjà supporté dans le predicate)

### Validation attendue

- Filtre RDC + toutes provinces + section **urbaine** (sans ville) → carte des 385 quartiers RDC ✅
- Filtre RDC + une province + section **urbaine** (sans ville) → quartiers de cette province (filtrés via `ville` ⊂ province) ✅
- Filtre RDC + une ville (Goma) → conserve la carte détaillée Goma actuelle ✅
- Filtre RDC + section **rurale** → comportement inchangé (territoires) ✅
- Onglet métier actif → choroplèthe par quartier appliquée ✅
- Clic sur quartier → breadcrumb + détails se mettent à jour ✅

