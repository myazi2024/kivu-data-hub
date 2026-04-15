

# Audit d'alignement : Formulaire CCC ↔ Menu Données Foncières

## Méthodologie

Comparaison des champs collectés par le formulaire CCC (`useCadastralContribution.tsx`), stockés en DB (`cadastral_contributions`), et exploités dans les blocs analytics (`useLandDataAnalytics.tsx` → `ContributionsBlock.tsx` + `ParcelsWithTitleBlock.tsx`).

---

## Champs collectés par le CCC mais ABSENTS des requêtes analytics

| # | Champ CCC (DB) | Type | Bloc concerné | Impact |
|---|---------------|------|---------------|--------|
| 1 | `is_occupied` | boolean | Contributions + Parcelles | **Données d'occupation jamais visualisées**. Le formulaire collecte si le bien est habité, mais aucun graphique ne l'exploite. |
| 2 | `occupant_count` | integer | Contributions + Parcelles | **Nombre d'occupants ignoré**. Pourrait alimenter un KPI ou une distribution. |
| 3 | `hosting_capacity` | integer | Contributions + Parcelles | **Capacité d'accueil ignorée**. Même situation. |
| 4 | `lease_type` | text | Contributions | Collecté mais **non sélectionné** dans la requête `fetchAll` des contributions (ligne 91). Présent côté parcelles (ligne 87) mais aucun graphique ne l'exploite dans `ParcelsWithTitleBlock`. |
| 5 | `lease_years` | integer | Contributions + Parcelles | Sélectionné pour parcelles mais **aucun graphique** ne l'exploite. |
| 6 | `floor_number` | text | Contributions + Parcelles | Collecté, stocké en DB, mais **jamais sélectionné ni visualisé**. |
| 7 | `apartment_number` | text | Contributions + Parcelles | Même situation que `floor_number`. |
| 8 | `additional_constructions` | jsonb | Contributions + Parcelles | Stocké en DB, **jamais sélectionné ni exploité** dans les analytics. Données multi-constructions invisibles. |
| 9 | `road_sides` | jsonb | Contributions + Parcelles | Côtés donnant sur route, types de voie — **jamais exploités**. |
| 10 | `servitude_data` | jsonb | Contributions + Parcelles | Servitudes — **jamais exploitées**. |
| 11 | `has_dispute` | boolean | Contributions | Sélectionné pour parcelles, mais **pas sélectionné** dans la requête contributions (ligne 91). |
| 12 | `title_issue_date` | date | Contributions + Parcelles | Stocké mais **jamais exploité** (âge du titre). |

---

## Champs sélectionnés mais NON EXPLOITÉS dans les graphiques

| # | Champ | Sélectionné dans | Visualisé ? |
|---|-------|-------------------|-------------|
| 13 | `lease_type` (parcelles) | `fetchAll` parcelles | Non — aucun `countBy` ni chart |
| 14 | `lease_years` (parcelles) | `fetchAll` parcelles | Non |
| 15 | `gps_coordinates` (parcelles) | `fetchAll` parcelles | Non (seulement pour la carte interactive, pas les analytics) |

---

## Champs correctement alignés (CCC → DB → Analytics)

| Champ | Contributions | Parcelles |
|-------|:---:|:---:|
| `property_title_type` | ✅ | ✅ |
| `current_owner_legal_status` | ✅ | ✅ |
| `current_owners_details` (genre) | ✅ | ✅ (via contribs) |
| `declared_usage` | ✅ | ✅ |
| `construction_type` | ✅ | ✅ |
| `construction_nature` | — | ✅ |
| `construction_materials` | — | ✅ |
| `construction_year` | — | ✅ |
| `property_category` | ✅ | ✅ |
| `standing` | — | ✅ |
| `area_sqm` | — | ✅ |
| `building_permits` (type) | — | ✅ (via contribs) |
| `building_shapes` (taille, hauteur) | — | ✅ (via contribs) |
| `sound_environment` | — | ✅ (via contribs) |
| `nearby_noise_sources` | — | ✅ (via contribs) |
| `status` / fraude / appels | ✅ | — |
| `is_subdivided` | — | ✅ |
| `parcel_type` (SU/SR) | — | ✅ |

---

## Plan de corrections

### Phase 1 — Ajouter les champs manquants à la requête SELECT (prioritaire)

**Fichier** : `src/hooks/useLandDataAnalytics.tsx`

Ajouter à la requête `fetchAll` des contributions (ligne 91) :
- `is_occupied, occupant_count, hosting_capacity`
- `lease_type, lease_years`
- `floor_number, apartment_number`
- `additional_constructions`
- `road_sides, servitude_data`
- `has_dispute`
- `title_issue_date`

Ajouter à la requête `fetchAll` des parcelles (ligne 87) :
- `is_occupied, occupant_count, hosting_capacity`

**Fichier** : `src/types/landAnalytics.ts`

Mettre à jour `ContributionRecord` et `ParcelRecord` pour inclure les types des nouveaux champs.

### Phase 2 — Créer les graphiques manquants

**Fichier** : `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`

Ajouter 4 nouveaux graphiques :
1. **Occupation** : Pie chart `is_occupied` (Habité / Non habité)
2. **Type de bail** : Bar chart `lease_type` (Initial / Renouvellement)
3. **Nombre d'étages** : Distribution `floor_number`
4. **Multi-constructions** : KPI comptant les parcelles avec `additional_constructions.length > 0`

**Fichier** : `src/components/visualizations/blocks/ContributionsBlock.tsx`

Ajouter 2 graphiques :
1. **Occupation** : Pie chart `is_occupied`
2. **Type de bail** : Donut `lease_type`

### Phase 3 — Enrichir les KPIs existants

- **ParcelsWithTitleBlock** : Ajouter KPI "Parcelles habitées" et "Capacité d'accueil totale"
- **ContributionsBlock** : Ajouter KPI "Contributions avec bail"

---

## Résumé

| Catégorie | Count |
|-----------|-------|
| Champs collectés mais non exploités | 12 |
| Champs sélectionnés mais non visualisés | 3 |
| Champs correctement alignés | 18 |
| Nouveaux graphiques à créer | 6 |
| Nouveaux KPIs à ajouter | 3 |

**Taux d'exploitation actuel** : ~60% des données CCC sont exploitées dans les analytics. Les 40% manquants concernent principalement l'occupation, les baux, les étages, et les données JSONB complexes (constructions additionnelles, côtés routiers, servitudes).

