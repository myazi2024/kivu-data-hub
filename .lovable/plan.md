

# Correction de l'infobulle RDC et intégration admin

## Problème

L'infobulle (`ProvinceTooltip.tsx`) affiche les champs `ProvinceData` avec les **anciens libellés** (Vente/m², Location/m², Taux occup.) alors que ces champs contiennent désormais des données réelles différentes (nombre de parcelles, titres demandés, contributions, etc.). Résultat : des nombres de parcelles affichés en USD, des compteurs affichés en pourcentages, etc.

De plus, ni l'infobulle ni le panneau de détail province ne sont gérés par la configuration admin (`analytics_charts_config`).

## Plan

### 1. Réécrire `ProvinceTooltip.tsx` avec les bons libellés

Remplacer les lignes affichant les anciens indicateurs immobiliers par les vraies métriques cadastrales :

| Champ `ProvinceData` utilisé | Ancien libellé (faux) | Nouveau libellé (correct) | Format |
|---|---|---|---|
| `prixMoyenLoyer` | Location/m² (USD) | Parcelles | nombre |
| `prixMoyenVenteM2` | Vente/m² (USD) | Titres demandés | nombre |
| `tauxOccupationLocatif` | Taux occup. (%) | Contributions | nombre |
| `dureeMoyenneMiseLocationJours` | Durée loc. (jours) | Mutations | nombre |
| `tauxVacanceLocative` | Taux vac. (%) | Litiges | nombre |
| `populationLocativeEstimee` | Population (hab.) | Expertises | nombre |
| `volumeAnnoncesImmobilieres` | — | Certificats | nombre |
| `nombreTransactionsEstimees` | — | Factures | nombre |
| `recettesLocativesUsd` | Rec. loc. (USD) | Revenus | USD |
| `recettesFiscalesUsd` | Rec. fisc. (USD) | Recettes fisc. | USD |
| `indicePresionLocative` | Pression | Densité | badge |

Supprimer les métriques qui n'ont plus de sens (valeur foncière parcelle).

### 2. Ajouter un tab `rdc-map` dans `ANALYTICS_TABS_REGISTRY`

Créer une section `rdc-map` dans le registre avec des items de type `kpi` correspondant à chaque ligne de l'infobulle et chaque carte du panneau de détail province :

- **Infobulle** : `tooltip-parcels`, `tooltip-titles`, `tooltip-contributions`, `tooltip-mutations`, `tooltip-disputes`, `tooltip-expertises`, `tooltip-certificates`, `tooltip-invoices`, `tooltip-revenue`, `tooltip-fiscal`, `tooltip-density`
- **Panneau détail** (sections Cadastre, Activité, Finances, Indicateurs) : `detail-parcels`, `detail-titles`, `detail-contributions`, `detail-mutations`, `detail-disputes`, `detail-certificates`, `detail-expertises`, `detail-invoices`, `detail-revenue`, `detail-fiscal`, `detail-surface`, `detail-density`, `detail-resolution`

### 3. Intégrer `useTabChartsConfig` dans `DRCInteractiveMap.tsx`

- Importer `useTabChartsConfig` avec les defaults du tab `rdc-map`
- Conditionner l'affichage de chaque ligne de l'infobulle et de chaque carte du panneau détail via `isChartVisible('tooltip-parcels')`, etc.
- Utiliser `getChartConfig('tooltip-parcels')?.custom_title` pour permettre le renommage admin

### 4. Passer la config au `ProvinceTooltip`

Ajouter une prop optionnelle `visibleItems` et `getTitle` au composant `ProvinceTooltip` pour que chaque ligne soit conditionnée par la config admin.

### Fichiers modifiés

- `src/components/ProvinceTooltip.tsx` — Réécriture complète avec bons libellés + support config admin
- `src/components/DRCInteractiveMap.tsx` — Intégration `useTabChartsConfig`, passage de la config au tooltip et au panneau détail
- `src/hooks/useAnalyticsChartsConfig.ts` — Ajout du tab `rdc-map` dans `ANALYTICS_TABS_REGISTRY`

