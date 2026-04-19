

## Ajout du visuel « Capacité d'accueil » dans Analytics → Construction

### Constat
Onglet `Construction` (`src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx`) :
- `hosting_capacity` est déjà collecté (CCC, onglet Infos), déjà chargé dans `useLandDataAnalytics` (`builtParcels`), et affiché uniquement comme KPI agrégé `Cap. accueil` (ligne 179).
- Aucun chart ne montre la distribution, ni n'autorise les croisements avec Occupation, Type, Catégorie, Nature, Année, Standing, Taille de construction.

### Cible
`src/components/visualizations/blocks/ParcelsWithTitleBlock.tsx` uniquement (la registry de cross-variables et `ChartCard` supportent déjà `crossVariables` + `rawRecords`/`groupField`).

### Changements

**1. Nouveau dataset bucketé `hostingCapacityData`** (parallèle à `buildingSizeData`/`buildingHeightData`) sur `builtParcels` filtrés sur `hosting_capacity > 0` :
- 1-2 pers · 3-5 pers · 6-10 pers · 11-20 pers · 21-50 pers · > 50 pers
- Buckets ignorés s'ils sont vides (cohérent avec les autres charts).

**2. Nouveau dataset `capacityPerOccupantData`** (ratio pression d'occupation = `occupant_count / hosting_capacity`) bucketé : Sous-occupé (<0.5) · Équilibré (0.5-1) · Saturé (>1). Calculé seulement si les deux champs > 0. Permet une lecture immédiate « capacité réelle vs déclarée ».

**3. Nouveau chart `hosting-capacity`** dans `chartDefs` :
- `title="Capacité d'accueil"`, `icon=Users` (lucide), `type='bar-v'`, `colorIndex=9`.
- `rawRecords={builtParcels}`, `groupField="hosting_capacity"` → active automatiquement le croisement.
- `crossVariables={cx('hosting-capacity')}` pour pouvoir le croiser avec : `occupation`, `construction-type`, `property-category`, `construction-nature`, `construction-decade`, `standing`, `building-size`.
- `insight` généré via `generateInsight(...)`.

**4. Nouveau chart `occupancy-pressure`** (Pression d'occupation) avec les mêmes croisements, type `donut`. Masqué si dataset vide (`hidden`).

**5. KPI complémentaire `kpi-avg-capacity`** (Capacité moyenne / construction) à côté du KPI total existant — utile pour interpréter la densité moyenne sans dépendre du volume.

**6. Ordonnancement** : insérer les deux nouveaux charts juste après `occupation` et `floor-dist` (regroupement logique « occupation & densité »), via la mécanique `ord()` existante (clés ajoutées à la registry, pas de réordonnancement manuel hors du `.sort` existant).

### Cohérence et hors-scope
- Aucune modification du schéma BD, ni de `useLandDataAnalytics`, ni de la sélection SQL (`hosting_capacity` déjà inclus).
- Les croisements fonctionnent automatiquement via `ChartCard` (registry existante, voir mémoire `cross-variable-analytics-fr`).
- Les nouveaux items sont contrôlables depuis l'admin Analytics config (visibilité/ordre/type) puisqu'ils suivent la même API `v/ct/cx/ty/ord` — pas de hardcode.
- Pas de changement aux autres onglets ni aux formulaires CCC.

