
## Lot M2 — Modularisation de `DRCInteractiveMap.tsx` (930 l)

### Objectif
Découper le composant monolithique de la carte interactive `/map` en sous-modules à responsabilité unique, sans changer le comportement observable. Cible : composant racine ~250 l + 5 sous-modules.

### Découpage proposé

```text
src/components/map/
├── DRCInteractiveMap.tsx          (~250 l) — orchestrateur
├── meta/
│   └── mapMeta.ts                 (~80 l)  — constantes (niveaux, couleurs, libellés)
├── hooks/
│   ├── useMapDrilldown.ts         (~120 l) — état niveau (province→territoire→commune→quartier)
│   ├── useMapIndicators.ts        (~150 l) — calculs KPI par feature (parcelles, titres, litiges…)
│   └── useMapGeoData.ts           (~80 l)  — chargement GeoJSON 4 niveaux + cache
├── layers/
│   ├── ProvinceLayer.tsx          (~100 l) — rendu SVG niveau 1
│   ├── TerritoryLayer.tsx         (~100 l) — niveau 2
│   ├── MunicipalityLayer.tsx      (~100 l) — niveau 3
│   └── QuartierLayer.tsx          (~100 l) — niveau 4
└── ui/
    ├── MapKPICards.tsx            (~120 l) — cartes d'indicateurs latérales
    ├── MapBreadcrumb.tsx          (~60 l)  — fil d'Ariane drilldown
    └── MapLegend.tsx              (~80 l)  — légende couleur/seuils
```

### Garanties non-régression
- Comportement identique : même drilldown 4 niveaux, mêmes seuils, mêmes couleurs (cf. mem `interactive-map-layers-fr`)
- Mêmes KPI, mêmes formats d'affichage, même fullscreen
- Mêmes données GeoJSON sources (aucun changement de fetch)
- `Map.tsx` (page) inchangé : importe toujours `DRCInteractiveMap` avec la même prop `onFullscreenChange`

### Plan d'exécution (4 sous-étapes commitables)
1. **M2.1** — Extraire `mapMeta.ts` + `useMapGeoData` + `useMapDrilldown` (état pur, pas de UI)
2. **M2.2** — Extraire `useMapIndicators` (logique KPI mémoïsée)
3. **M2.3** — Extraire les 4 `*Layer.tsx` (rendu SVG par niveau)
4. **M2.4** — Extraire `MapKPICards` + `MapBreadcrumb` + `MapLegend`, finaliser orchestrateur

### Validation après chaque sous-étape
- TypeScript compile
- Test manuel `/map` : drilldown province → territoire → commune → quartier, retour, fullscreen, KPI cohérents
- Aucun changement de contrat avec `Map.tsx`

### Notes
- Pas de changement de logique métier, pas de changement de fetch, pas de changement RLS
- Les Lots M1 (sécurité PII) et M5 (RPC server-side) restent à planifier ensuite séparément
- Mémoriser la nouvelle architecture une fois M2 terminé (mise à jour de `mem://admin/land-data-analytics-debt-fr`)

### Démarrage
Je commence par **M2.1** (constantes + hooks de données/drilldown) après approbation. Confirmez-vous ?
