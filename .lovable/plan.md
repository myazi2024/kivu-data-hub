

# Refonte des KPIs de l'onglet Parcelles

## Constat

Les 6 KPIs actuels (Parcelles, Urbaines, Rurales, Surface tot., Surface moy., Densité) ne reflètent pas les indicateurs métier demandés. Ils doivent être remplacés par 11 indicateurs couvrant l'ensemble des services cadastraux.

## Nouveaux indicateurs

| # | KPI | Source | Calcul |
|---|-----|--------|--------|
| 1 | Parcelle avec certificat d'enregistrement | `data.parcels` | `property_title_type` normalisé === "Certificat d'enregistrement" |
| 2 | Parcelle avec contrat de location | `data.parcels` | `property_title_type` normalisé === "Contrat de location" |
| 3 | Parcelle avec fiche parcellaire | `data.parcels` | `property_title_type` normalisé === "Fiche parcellaire" |
| 4 | Titres fonciers demandés | `data.titleRequests` | count (filtré par province/localisation) |
| 5 | Litiges fonciers | `data.disputes` | count |
| 6 | Hypothèques actives | `data.mortgages` | `mortgage_status === 'active'` |
| 7 | Mutations en cours | `data.mutationRequests` | `status === 'pending'` ou similaire |
| 8 | Expertises en cours | `data.expertiseRequests` | `status === 'pending'` ou similaire |
| 9 | Superficie moy. parcelle | `data.parcels` | moyenne `area_sqm` |
| 10 | Superficie moy. construction | `data.contributions` | moyenne des `areaSqm` dans `building_shapes` |
| 11 | Hauteur moy. construction | `data.contributions` | moyenne des `heightM` dans `building_shapes` |

## Modifications

### 1. `KpiGrid.tsx` — Supporter jusqu'à 12 colonnes

Ajouter des classes grid pour 7-12 items :
- 7-8 : `grid-cols-4 md:grid-cols-4` (2 lignes)
- 9-12 : `grid-cols-3 md:grid-cols-4 lg:grid-cols-6` (2 lignes sur desktop)

Rendre le texte plus compact pour accommoder 11 items.

### 2. `ParcelsWithTitleBlock.tsx` — Remplacer les KPIs

- Supprimer les 6 anciens KPIs (parcels, urban, rural, surface, avg-surface, density)
- Ajouter les 11 nouveaux avec filtrage géographique appliqué sur toutes les sources de données (pas uniquement parcels)
- Utiliser `applyFilters` sur `data.titleRequests`, `data.disputes`, `data.mortgages`, `data.mutationRequests`, `data.expertiseRequests`

### 3. `useAnalyticsChartsConfig.ts` — Mettre à jour le registre KPIs

Remplacer les 6 entrées KPI par 11 nouvelles :
```
kpi-certificat, kpi-contrat, kpi-fiche, kpi-titres, kpi-litiges,
kpi-hypotheques, kpi-mutations, kpi-expertises,
kpi-surf-parcelle, kpi-surf-construction, kpi-hauteur-construction
```

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `src/components/visualizations/shared/KpiGrid.tsx` | Etendre grid pour 7-12 items |
| `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` | Remplacer 6 KPIs par 11 nouveaux |
| `src/hooks/useAnalyticsChartsConfig.ts` | Mettre à jour registre KPIs parcels-titled |

