

# Remplacement des indicateurs du bloc Carte RDC

## Constat

Les indicateurs actuels dans l'infobulle (tooltip) et le bloc details province sont generiques (Parcelles, Contributions, Factures, Revenus, Recettes fiscales, Densite...). L'utilisateur souhaite les remplacer par 11 indicateurs alignes sur les KPIs de l'onglet Analytics Parcelles.

## Nouveaux indicateurs (11)

| # | Label | Source | Calcul |
|---|-------|--------|--------|
| 1 | Parc. Certif. enregistrement | `parcels` filtres + `normalizeTitleType` | count where type = "Certificat d'enregistrement" |
| 2 | Parc. Contrat location | `parcels` filtres + `normalizeTitleType` | count where type = "Contrat de location..." |
| 3 | Parc. Fiche parcellaire | `parcels` filtres + `normalizeTitleType` | count where type = "Fiche parcellaire" |
| 4 | Titres demandes | `titleRequests` filtres | count |
| 5 | Litiges fonciers | `disputes` filtres | count |
| 6 | Hypotheques actives | `mortgages` filtres | count where status = 'active' |
| 7 | Mutations en cours | `mutationRequests` filtres | count where status = 'pending' |
| 8 | Expertises en cours | `expertiseRequests` filtres | count where status = 'pending' |
| 9 | Superficie moy. parcelle | `parcels` filtres | avg(area_sqm) en m² |
| 10 | Superficie moy. construction | `contributions` filtres, `building_shapes` | avg(areaSqm ou width*height) |
| 11 | Hauteur moy. construction | `contributions` filtres, `building_shapes` | avg(heightM) |

## Fichiers a modifier

### 1. `src/types/province.ts` — Refondre ProvinceData

Remplacer les champs actuels par les 11 nouveaux indicateurs. Supprimer les anciens (contributionsCount, certificatesCount, invoicesCount, revenueUsd, fiscalRevenueUsd, densityLevel, disputeResolutionRate, totalSurfaceHa).

### 2. `src/components/DRCInteractiveMap.tsx` — Recalculer provincesData et scopedStats

- Dans `provincesData` (ligne 131) et `scopedStats` (ligne 217) : calculer les 11 nouveaux indicateurs en utilisant `normalizeTitleType`, filtrage des mortgages actives, moyennes surfaces/hauteurs depuis `building_shapes`.
- Dans le **bloc details province** (lignes 536-654) : remplacer les 3 sections (Cadastre/Activite/Finances + Indicateurs) par une grille unique des 11 indicateurs.
- Dans la **legende contextuelle** sur la carte (lignes 452-461) : remplacer les 4 lignes actuelles par un sous-ensemble pertinent des nouveaux indicateurs.

### 3. `src/components/ProvinceTooltip.tsx` — Remplacer DEFAULT_LINES

Remplacer les 10 lignes actuelles par les 11 nouveaux indicateurs. Supprimer le badge densite. Ajouter le format 'avg' pour les moyennes (m², m).

### 4. `src/hooks/useAnalyticsChartsConfig.ts` — Mettre a jour le registre rdc-map

Remplacer les KPIs tooltip-* et detail-* actuels par les 11 nouveaux cles pour le tooltip et les 11 pour le detail (22 entrees KPI total). Cles proposees :
- tooltip: `tooltip-cert-enreg`, `tooltip-contrat-loc`, `tooltip-fiche-parc`, `tooltip-title-req`, `tooltip-disputes`, `tooltip-mortgages`, `tooltip-mutations`, `tooltip-expertises`, `tooltip-avg-surface`, `tooltip-avg-building`, `tooltip-avg-height`
- detail: `detail-cert-enreg`, `detail-contrat-loc`, `detail-fiche-parc`, `detail-title-req`, `detail-disputes`, `detail-mortgages`, `detail-mutations`, `detail-expertises`, `detail-avg-surface`, `detail-avg-building`, `detail-avg-height`

### 5. `src/components/DRCInteractiveMap.tsx` — buildEmptyProvince

Mettre a jour la fonction utilitaire pour retourner les nouveaux champs a 0.

## Impact

- 4 fichiers modifies
- ~100 lignes ajoutees/modifiees
- Aucune migration SQL
- L'admin "Config graphiques > Carte RDC" refletera automatiquement les nouveaux indicateurs

