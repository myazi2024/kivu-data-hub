

# Refonte des KPIs de l'onglet Parcelles

## Changement demande

Remplacer les 6 KPIs actuels (Parcelles, Urbaines, Rurales, Surface tot., Surface moy., Densite) par 11 nouveaux indicateurs :

1. Parcelle avec certificat d'enregistrement
2. Parcelle avec Contrat de location
3. Parcelle avec fiche parcellaire
4. Nombre de Titre foncier demande
5. Nombre de litige foncier
6. Nombre d'hypotheques actives
7. Demande de mutation fonciere en cours
8. Demande d'expertise immobiliere en cours
9. Superficie moyenne parcelle
10. Superficie moyenne construction
11. Hauteur moyenne construction

## Sources de donnees

| KPI | Source | Logique |
|-----|--------|---------|
| 1-3 | `filteredParcels` | Compter par `property_title_type` normalise (Certificat d'enregistrement, Contrat de location, Fiche parcellaire) |
| 4 | `data.titleRequests` filtre | `.length` |
| 5 | `data.disputes` filtre | `.length` |
| 6 | `data.mortgages` filtre | `.filter(m => m.mortgage_status === 'active').length` |
| 7 | `data.mutationRequests` filtre | `.filter(m => status in ['pending','submitted','in_progress']).length` |
| 8 | `data.expertiseRequests` filtre | `.filter(e => status in ['pending','submitted','in_progress']).length` |
| 9 | `filteredParcels` | Moyenne `area_sqm` |
| 10 | `filteredContribs.building_shapes` | Moyenne `areaSqm` ou `width*height` |
| 11 | `filteredContribs.building_shapes` | Moyenne `heightM` |

## Modifications

### 1. `ParcelsWithTitleBlock.tsx`

- Ajouter `applyFilters` sur `data.titleRequests`, `data.disputes`, `data.mortgages`, `data.mutationRequests`, `data.expertiseRequests` (avec le meme `filter`)
- Calculer les 11 valeurs dans le `kpiItems` memo
- Adapter le `KpiGrid` pour afficher 11 items (grille responsive sur 2 lignes)

### 2. `KpiGrid.tsx`

- Etendre `gridClass` pour supporter plus de 6 items (ajouter des classes pour 7-12 items, ex: `grid-cols-3 md:grid-cols-4 lg:grid-cols-6`)

### 3. `useAnalyticsChartsConfig.ts`

- Remplacer les 6 KPIs du registre `parcels-titled` par les 11 nouveaux :
  - `kpi-cert-enregistrement`, `kpi-contrat-location`, `kpi-fiche-parcellaire`
  - `kpi-titres-demandes`, `kpi-litiges`, `kpi-hypotheques-actives`
  - `kpi-mutations-cours`, `kpi-expertises-cours`
  - `kpi-superficie-moy`, `kpi-superficie-construction-moy`, `kpi-hauteur-construction-moy`

### 4. Migration SQL (optionnel)

- DELETE anciennes configs KPI orphelines pour `parcels-titled` dans `analytics_charts_config`

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` | Refonte KPIs (filtrage cross-tables + calculs moyennes) |
| `src/components/visualizations/shared/KpiGrid.tsx` | Support > 6 items |
| `src/hooks/useAnalyticsChartsConfig.ts` | 11 nouveaux KPIs dans le registre |

