

# Audit — Menu "Données foncières" (Analytics)

## A. Champs CCC collectés mais absents des analytics

Le hook `useLandDataAnalytics` ne récupère pas plusieurs colonnes ajoutées récemment aux tables, rendant impossible leur analyse :

| Champ | Table source | Impact |
|---|---|---|
| `property_category` | `cadastral_parcels` / `cadastral_contributions` | Aucun graphique par catégorie de bien (Villa, Appartement, etc.) |
| `construction_materials` | `cadastral_parcels` | Absent du bloc "Parcelles titrées" — seul `construction_nature` est analysé |
| `standing` | `cadastral_parcels` | Aucune analyse du niveau de finition |
| `lease_years` | `cadastral_parcels` / `cadastral_contributions` | Aucune distribution de durée de bail |
| `construction_year` | `cadastral_contributions` | Présent pour `parcels` mais **non fetchée** pour `contributions` |
| `is_subdivided` | `cadastral_parcels` | Aucun compteur parcelles subdivisées |
| `has_dispute` | `cadastral_parcels` | Aucun indicateur direct (le bloc Litiges utilise la table `disputes` séparément) |
| `additional_constructions` | `cadastral_parcels` / `cadastral_contributions` | JSONB non exploité |
| `building_shapes` | `cadastral_parcels` / `cadastral_contributions` | JSONB non exploité (hauteurs, surfaces bâties) |
| `road_sides` | `cadastral_parcels` / `cadastral_contributions` | Données de voirie non analysées |
| `is_title_in_current_owner_name` | `cadastral_contributions` | Non fetchée |
| `permit_type` | `cadastral_building_permits` | Non fetchée — impossible de distinguer "bâtir" vs "régularisation" |

## B. Graphiques manquants (fonctionnalités absentes)

1. **Bloc "Parcelles titrées"** — Pas de graphique `property_category` (Villa/Appartement/Terrain nu). C'est la donnée pivot du formulaire CCC.
2. **Bloc "Parcelles titrées"** — Pas de graphique `construction_materials` (Béton armé, Pierres, etc.) alors que `construction_nature` (Durable/Semi-durable/Précaire) est présent. Les matériaux sont plus granulaires.
3. **Bloc "Parcelles titrées"** — Pas de graphique `standing` (Haut/Moyen/Bas).
4. **Bloc "Parcelles titrées"** — Pas de graphique `is_subdivided` (parcelles loties vs non loties).
5. **Bloc "Autorisations de bâtir"** — Pas de graphique `permit_type` (construction vs régularisation). C'est une distinction fondamentale du formulaire CCC.
6. **Bloc "Contributions"** — Pas de graphique `property_category`. Les contributions collectent cette donnée mais elle n'est ni fetchée ni analysée.
7. **Aucun bloc** n'exploite les données de `building_shapes` (surface bâtie totale par parcelle, hauteur moyenne des constructions). Ces données pourraient alimenter le bloc Expertise ou un sous-bloc dans Parcelles titrées.
8. **Bloc "Taxes"** — Pas de graphique par type de taxe (`tax_type`). Le champ n'est pas non plus fetchée dans la requête.

## C. Incohérences logiques

9. **`BuildingPermitsBlock` — statuts hardcodés en anglais** (lignes 59-61) : filtre `approved`/`pending`/`rejected` mais le formulaire CCC et l'admin utilisent des statuts français : `Conforme`, `Approuvé`, `Délivré`, `En attente`, `Rejeté`. Le KPI "Approuvées" sera toujours à 0 si les données sont en français.
10. **`ParcelsWithTitleBlock` — `parcel_type` mixte** (ligne 81-82) : filtre urbain/rural sur `SU`/`SR` ET `Terrain bâti`/`Terrain nu`. Or `Terrain bâti`/`Terrain nu` est `property_category`, pas `parcel_type`. C'est un vestige d'une confusion de mapping.
11. **`ContributionsBlock` — `construction_year` non fetchée** : le SELECT de `cadastral_contributions` omet `construction_year`, donc le graphique "Année construction" ne pourra jamais apparaître dans ce bloc (il est d'ailleurs absent).
12. **`applyFilters` dateField** : certains blocs passent un `dateField` custom (`payment_date`, `issue_date`, `ownership_start_date`) mais l'`AnalyticsFilters` component ne sait pas quel champ est utilisé pour le filtre temporel, ce qui peut créer un décalage entre le filtre affiché et le filtrage réel.

## D. Données potentiellement fictives ou non vérifiées

13. **`fraud_attempts`** — Cette table est alimentée uniquement par du code de test/seed (`generateFraudAttempts`). En production, aucun mécanisme fonctionnel ne crée de lignes dans cette table. Le bloc "Fraude" affiche potentiellement des données de test.
14. **`generated_certificates`** — Les certificats sont générés automatiquement par le système. Les KPI "En attente" supposent un workflow de validation qui n'existe pas (les certificats sont directement `generated`).
15. **`cadastral_invoices`** — Le champ `geographical_zone` n'est pas alimenté dynamiquement par le système de facturation actuel. Le graphique "Zone géographique" montre des données incomplètes ou vides.

## E. Redondances

16. **Graphique "Évolution" dupliqué** — Chacun des 14 blocs contient un graphique `evolution` (tendance par mois). C'est cohérent mais prend de la place. Pas un bug, mais beaucoup de blocs ont aussi un `revenue-trend` (Titres, Mutations, Subdivisions, Factures) qui est essentiellement la même area chart sur un champ différent.
17. **`GeoCharts` identique partout** — Les 14 blocs incluent un composant `GeoCharts` qui produit 2 graphiques (par province + par section). C'est le même pattern dans chaque bloc sans différenciation.
18. **Contributions vs Parcelles titrées** — Les graphiques `title-type`, `legal-status`, `usage`, `construction-type` apparaissent dans les DEUX blocs avec les mêmes données normalisées. Les contributions sont censées devenir des parcelles après approbation — les compteurs se chevauchent.

## F. Optimisations

19. **Requête monolithique `fetchAll` × 14** — Le hook charge les 14 tables en parallèle avec `Promise.all`, même si l'utilisateur ne consulte qu'un seul onglet. Pour les bases volumineuses, charger ~14000+ lignes au premier rendu est coûteux. Un chargement par onglet actif (lazy) serait plus performant.
20. **Pas de normalisation des `permit_type` / `administrative_status`** — Les blocs filtrent sur des valeurs hardcodées (`approved`, `pending`) sans passer par un normaliseur comme pour les titres (`normalizeTitleType`). Les statuts en français ou anglais ne matchent pas.
21. **`enrichByParcelNumber` cherche `reporting_parcel_number`** — Ce champ n'existe pas dans les tables `certificates` ou `invoices`. C'est du code mort (ligne 129).

---

## Plan de corrections

### Priorite 1 — Données manquantes dans le fetch

**Fichier** : `src/hooks/useLandDataAnalytics.tsx`

- Ajouter au SELECT de `cadastral_parcels` : `property_category, construction_materials, standing, lease_years, is_subdivided, has_dispute`
- Ajouter au SELECT de `cadastral_contributions` : `construction_year, property_category, construction_materials, standing`
- Ajouter au SELECT de `cadastral_building_permits` : `permit_type`
- Supprimer `reporting_parcel_number` de `enrichByParcelNumber` (code mort)

### Priorite 2 — Graphiques manquants

**Fichier** : `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`
- Ajouter graphiques : `property_category`, `construction_materials`, `standing`, `is_subdivided`
- Corriger le filtre urbain/rural (retirer `Terrain bâti`/`Terrain nu`)

**Fichier** : `src/components/visualizations/blocks/BuildingPermitsBlock.tsx`
- Ajouter graphique `permit_type` (construction vs régularisation)
- Corriger les statuts hardcodés anglais → utiliser normalisation

**Fichier** : `src/components/visualizations/blocks/ContributionsBlock.tsx`
- Ajouter graphique `property_category`

### Priorite 3 — Corrections logiques

**Fichier** : `src/components/visualizations/blocks/BuildingPermitsBlock.tsx`
- Normaliser `administrative_status` pour matcher les statuts français du formulaire CCC

**Fichier** : `src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`
- Supprimer la confusion `Terrain bâti`/`Terrain nu` dans le compteur urbain/rural

### Priorite 4 — Nettoyage

- Documenter que `fraud_attempts` nécessite un mécanisme de création fonctionnel en production
- Supprimer le code mort `reporting_parcel_number` dans `enrichByParcelNumber`

**Impact total** : ~60 lignes modifiees dans 4 fichiers.

