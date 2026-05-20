## Objectif

Rendre les infrastructures par voie (canal d'évacuation, éclairage solaire, revêtement) entièrement dépendantes des règles admin de zonage et des tarifs admin, supprimer la sélection manuelle des infrastructures (onglet « Infrastructures du lotissement ») et la remplacer par un récapitulatif automatique dans l'onglet renommé « Récapitulatif ».

## Constat actuel (incohérences)

1. **Onglet « Lots » (`RoadsListPanel`)** : capture déjà `drainageCanal` et `solarLighting` quand `require_drainage_canal` / `require_solar_lighting` sont activés sur la règle de zonage admin. Mais le **revêtement** utilise une liste héritée (`asphalt/gravel/earth/paved/planned`) totalement déconnectée de `road_surface_allowed_materials` (admin) et n'expose ni l'épaisseur (`road_surface_min/max_thickness_cm`) ni la longueur.
2. **Onglet « Infrastructures du lotissement » (`StepInfrastructures`)** : sélection manuelle libre (checkbox + quantité) sur `subdivision_infrastructure_tariffs`. Double saisie incohérente avec les voies + risque d'oubli ou de doublon. Pas de lien avec ce qui a été tracé.
3. **`StepSummary`** affiche les infrastructures sélectionnées manuellement et non celles déduites des voies.
4. **Edge `subdivision-request`** valide bien les contraintes par voie côté serveur, mais le calcul de surcoût lit `selected_infrastructures` (saisie manuelle), pas les specs des voies.

## Refonte proposée

### 1. Onglet « Lots » — Revêtement piloté par l'admin
Dans `RoadsListPanel` :
- Ajouter un bloc « Revêtement » conditionné par `zoningRule.require_road_surface` (sur le même modèle que canal/éclairage).
- Champs : matériau (Select alimenté par `road_surface_allowed_materials` ∪ catalogue `subdivision_road_surface_materials`), épaisseur cm (Input borné par `road_surface_min/max_thickness_cm`), longueur m (auto‑calculée depuis `road.path` + `metricFrame`, lecture seule).
- Quand la règle n'impose rien : conserver le Select simple actuel mais limité aux matériaux actifs de `subdivision_road_surface_materials` (suppression de l'enum legacy).
- Badge « Revêtement manquant » si requis et absent, comme pour canal/éclairage.

Étendre `SubdivisionRoad` (`types.ts`) :
```ts
roadSurface?: {
  material: string;       // clef admin
  thicknessCm: number;
  lengthM: number;        // dérivé du path
} | null;
```
Conserver `surfaceType` legacy uniquement pour rétro‑compat des brouillons localStorage (mapping silencieux lors de la restauration), puis le supprimer.

### 2. Suppression de l'onglet « Infrastructures du lotissement »
- Supprimer `steps/StepInfrastructures.tsx`.
- Retirer `'infrastructures'` de `SubdivisionStep` (`types.ts`), de `steps[]` dans `useSubdivisionForm`, du `ALL_STEP_CONFIG` du dialog, du switch de rendu, et de `isStepValid`.
- Retirer le state `selectedInfrastructures` + persistance brouillon + payload edge.
- Mettre à jour `mem://features/subdivision/specifications-completes-fr` et la note de modularisation.

### 3. Onglet « Envoi » → « Récapitulatif »
Renommer `summary` (label + shortLabel) en « Récapitulatif » dans `ALL_STEP_CONFIG`.
Dans `StepSummary`, ajouter une carte « Infrastructures (auto)** » qui :
- Liste pour chaque voie ses infrastructures spécifiées (canal, éclairage, revêtement) avec leurs mesures (longueur, largeur, profondeur, hauteur mât, espacement, épaisseur…).
- Calcule automatiquement chaque coût via le tarif admin (`subdivision_infrastructure_tariffs.infrastructure_key`) en mappant par clés conventionnelles : `drainage_canal_<material>`, `solar_lighting`, `road_surface_<material>` (fallback générique si la clef spécifique n'existe pas).
- Quantités calculées : `road.lengthM` (canal/revêtement), `floor(lengthM / spacingM)` (mâts), `lengthM × widthM` (m² revêtement), etc.
- Affiche un sous‑total par voie et un total infrastructures, déjà additionné au `total` final.

### 4. Calcul des frais déplacé
- `useSubdivisionForm.computeFee` : ne lit plus `selectedInfrastructures`. À la place, dérive un dictionnaire d'items depuis `roads` et la table tarifs (helper `buildInfraItemsFromRoads(roads, tariffs, metricFrame)` à créer dans `subdivision/utils/`).
- `FeeBreakdown.infrastructures` conserve sa forme actuelle (key/label/qty/unit/subtotal) → `StepSummary` reste compatible.
- Suppression de l'effet `selectedInfrastructures` dans le debounce.

### 5. Edge `subdivision-request` aligné
- Recalcul serveur des items infra à partir de `body.roads` (même helper porté en TS Deno sous `_shared/subdivisionInfrastructures.ts`) au lieu de `body.selected_infrastructures`.
- Conserver `selected_infrastructures` JSONB en colonne pour rétro‑compat (audit), mais le serveur l'**ignore** en lecture et l'**écrit** avec la liste dérivée des voies.
- Garde‑fou : si une voie spécifie un matériau hors `road_surface_allowed_materials`, retourne `ROAD_INFRA_VIOLATIONS`.

### 6. Code mort supprimé
- `steps/StepInfrastructures.tsx` (fichier entier).
- Enum legacy `ROAD_SURFACE_LABELS` dans `types.ts` (si plus référencé après refonte) → remplacé par lecture dynamique.
- Champs `SubdivisionStep['infrastructures']`, state `selectedInfrastructures`, props/keys `selected_infrastructures` côté front (conservés côté DB).
- `StepInfrastructures` dans `SubdivisionRequestDialog` (imports + bloc render).
- Vérifier `subdivisionDetails.ts` (générateur test) : aligne `surface_type` sur clefs admin si nécessaire.

### 7. Validation côté front
- Étendre `useZoningCompliance` pour signaler revêtement manquant / matériau interdit / épaisseur hors bornes (cohérent avec les violations serveur).
- Mettre à jour `validateSubdivisionFull` si nécessaire pour bloquer `isStepValid('designer')` quand une infra par voie obligatoire est absente.

### 8. Mémoire projet
- Mettre à jour `mem://admin/subdivision-admin-audit-fr.md` et `mem://features/subdivision/specifications-completes-fr.md` : retrait de l'étape, nouveau pipeline tarifaire dérivé des voies.

## Détails techniques

### Migration base
Aucune migration SQL nouvelle obligatoire — toutes les colonnes existent. Ajout d'un index optionnel `subdivision_infrastructure_tariffs(infrastructure_key)` si pas déjà unique.

### Helper partagé
`src/components/cadastral/subdivision/utils/infrastructureFromRoads.ts` (et copie Deno `supabase/functions/_shared/subdivisionInfrastructures.ts`) :
```ts
buildInfraItemsFromRoads(roads, tariffs, metricFrame): InfraItem[]
// Convention de clés :
//   road_surface_<material>     unit: sqm   qty = lengthM * widthM
//   drainage_canal_<material>   unit: linear_m  qty = lengthM * sidesFactor
//   solar_lighting              unit: unit  qty = ceil(lengthM / spacingM) * sidesFactor
```
`sidesFactor` = 1 (left|right|any) ou 2 (both|alternating).

### Fichiers impactés
- `src/components/cadastral/subdivision/types.ts`
- `src/components/cadastral/subdivision/hooks/useSubdivisionForm.ts`
- `src/components/cadastral/subdivision/hooks/useZoningCompliance.ts`
- `src/components/cadastral/subdivision/steps/panels/RoadsListPanel.tsx`
- `src/components/cadastral/subdivision/steps/StepSummary.tsx`
- `src/components/cadastral/SubdivisionRequestDialog.tsx`
- `src/components/cadastral/subdivision/utils/infrastructureFromRoads.ts` (nouveau)
- `supabase/functions/_shared/subdivisionInfrastructures.ts` (nouveau)
- `supabase/functions/subdivision-request/index.ts`
- Suppression : `src/components/cadastral/subdivision/steps/StepInfrastructures.tsx`
- Tests : `src/components/cadastral/subdivision/utils/__tests__/infrastructureFromRoads.test.ts`

### Hors périmètre
- Pas de changement de design system.
- Pas de modification des règles admin elles‑mêmes (déjà OK).
- Brouillons localStorage v3 existants : seront migrés silencieusement (ignore `selectedInfrastructures`, mappe `surfaceType` legacy → `roadSurface.material` si possible).
