

# Réorganisation des onglets Analytics : Parcelle → Construction + Titres fonciers

## Analyse des doublons

Visuels à déplacer depuis "Parcelles" vers "Titres fonciers" :

| Visuel (Parcelles) | Existe déjà dans Titres ? | Action |
|---|---|---|
| `legal-status` — Propriétaires | ✅ Oui (`legal-status`) | **Supprimer** de Parcelles |
| `gender` — Genre propriétaires | ✅ Oui (`gender`) | **Supprimer** de Parcelles |
| `surface` — Superficie | ✅ Oui (`surface`) | **Supprimer** de Parcelles |
| `geo` — Géographie | ✅ Oui (`geo`) | **Supprimer** de Parcelles |
| `evolution` — Évolution | ✅ Oui (`evolution`) | **Supprimer** de Parcelles |
| `subdivided` — Loties vs Non loties | ❌ Non | **Ajouter** dans TitleRequestsBlock |

## Modifications

### 1. `src/config/analyticsTabsRegistry.ts`

- **Renommer** le label de `parcels-titled` : `'Parcelles'` → `'Construction'`
- **Supprimer** les entrées charts : `legal-status`, `gender`, `surface`, `subdivided`, `geo`, `evolution`
- **Ajouter** 2 nouveaux charts construction : `construction-evolution` (tendance mensuelle des constructions) et `construction-geo` (géographie des constructions)
- **Ajouter** dans `title-requests.charts` : `subdivided` (Loties vs Non loties)
- **Nettoyer les KPIs** : supprimer `kpi-parcels` (renommer en `kpi-constructions`), retirer `kpi-urban`, `kpi-rural`, `kpi-surface`, `kpi-avg-surface`, `kpi-density` (données parcellaires, pas construction). Garder `kpi-occupied`, `kpi-hosting`, `kpi-multi-constr`. Ajouter un KPI `kpi-constructions` (total constructions).

### 2. `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`

- **Supprimer** les calculs et les chartDefs pour : `legal-status`, `gender`, `genderData`, `genderInsight`, `subdividedData`, `surface`/`surfaceDist`, `geo` (GeoCharts), `evolution` (trend)
- **Supprimer** les KPIs parcellaires (`urbanCount`, `ruralCount`, `totalSurface`, `avgSurface`, `density`)
- **Ajouter** `construction-evolution` : `trendByMonth` basé sur `construction_year` ou `created_at` des parcelles ayant une construction
- **Ajouter** `construction-geo` : `<GeoCharts>` filtré sur les parcelles construites uniquement
- **Adapter** les KPIs restants pour le contexte "Construction" (total = parcelles construites)

### 3. `src/components/visualizations/blocks/TitleRequestsBlock.tsx`

- **Ajouter** le visuel `subdivided` (Loties vs Non loties) utilisant `data.parcels` (même logique que dans ParcelsWithTitleBlock actuel)
- Import de `countBy` pour `is_subdivided` sur `data.parcels`

### 4. `src/components/visualizations/ProvinceDataVisualization.tsx`

- **Changer l'icône** de `parcels-titled` : `Map` → `Building` (plus cohérent avec "Construction")

### Fichiers modifiés (4)
- `src/config/analyticsTabsRegistry.ts`
- `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`
- `src/components/visualizations/blocks/TitleRequestsBlock.tsx`
- `src/components/visualizations/ProvinceDataVisualization.tsx`

