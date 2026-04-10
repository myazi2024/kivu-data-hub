

# Ajouter 3 graphiques manquants a l'onglet Parcelles

## Constat

L'onglet "Parcelles" ne visualise pas les donnees de construction collectees dans le formulaire CCC :
- **Autorisation de batir** : stocke dans `cadastral_contributions.building_permits` (JSONB) avec `permitType: 'construction' | 'regularization'`
- **Taille de construction** : stocke dans `cadastral_contributions.building_shapes` (JSONB) avec `areaSqm` (ou `width * height` pour les anciennes donnees)
- **Hauteur de construction** : stocke dans `cadastral_contributions.building_shapes` (JSONB) avec `heightM`

Ces donnees proviennent des contributions et non des parcelles directement. Les contributions sont deja chargees dans `useLandDataAnalytics`.

## Modifications

### 1. `useLandDataAnalytics.tsx` — Ajouter `building_permits, building_shapes` au SELECT des contributions

Ajouter ces 2 colonnes a la requete `fetchAll('cadastral_contributions', ...)` pour qu'elles soient disponibles cote client.

### 2. `ParcelsWithTitleBlock.tsx` — 3 nouveaux graphiques

Utiliser les **contributions filtrees** (`filteredContribs`) pour calculer :

**a) Autorisation de batir** (cle: `permit-type`)
- Parcourir `building_permits` JSONB de chaque contribution
- Compter par `permitType` : "Construction" vs "Regularisation"
- Graphique donut

**b) Taille de construction** (cle: `building-size`)
- Parcourir `building_shapes` de chaque contribution
- Calculer la surface (`areaSqm` ou `width * height` en fallback)
- Distribuer en tranches : `< 50 m²`, `50-100`, `100-200`, `200-500`, `> 500 m²`
- Graphique bar-v

**c) Hauteur de construction** (cle: `building-height`)
- Parcourir `building_shapes` de chaque contribution
- Extraire `heightM`
- Distribuer en tranches : `< 3m`, `3-6m`, `6-10m`, `10-15m`, `> 15m`
- Graphique bar-v

### 3. `useAnalyticsChartsConfig.ts` — Registre

Ajouter les 3 entrees dans `ANALYTICS_TABS_REGISTRY['parcels-titled'].charts` :
- `permit-type` (display_order 15, donut)
- `building-size` (display_order 16, bar-v)
- `building-height` (display_order 17, bar-v)

### 4. `crossVariables.ts` — Variables de croisement

Ajouter pour les 3 nouveaux graphiques des variables de croisement pertinentes (Province, Usage, Type titre).

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/hooks/useLandDataAnalytics.tsx` | Ajouter `building_permits, building_shapes` au SELECT contributions |
| `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` | +3 graphiques (~40 lignes) |
| `src/hooks/useAnalyticsChartsConfig.ts` | +3 entrees registre |
| `src/config/crossVariables.ts` | +3 entrees croisement |

**Impact** : ~60 lignes ajoutees dans 4 fichiers. Aucune migration.

