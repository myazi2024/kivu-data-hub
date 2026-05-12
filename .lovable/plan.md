## Objectif

Permettre à l'admin d'imposer (urbain/rural différenciés) la présence d'un **canal d'évacuation des eaux usées** et d'un **éclairage public solaire** sur chaque voie créée d'un lotissement, avec seuils techniques min/max. Côté demandeur, étendre le formulaire de création de voie pour saisir ces deux blocs et bloquer la soumission si la voie ne respecte pas la règle de zonage applicable.

## 1. Base de données — `subdivision_zoning_rules`

Ajouter les colonnes (toutes nullables avec valeurs par défaut sûres) :

**Canal eaux usées (par voie)**
- `require_drainage_canal` boolean default false — obligatoire ou non
- `drainage_canal_min_width_m` numeric — largeur min
- `drainage_canal_min_depth_m` numeric — profondeur min
- `drainage_canal_allowed_materials` text[] — matériaux autorisés (béton, PVC, maçonnerie, pierre…)
- `drainage_canal_allowed_types` text[] — types autorisés (ouvert, couvert, enterré)
- `drainage_canal_min_slope_pct` numeric — pente minimale (%)
- `drainage_canal_required_sides` text — `left` | `right` | `both` | `any`

**Éclairage public solaire (par voie)**
- `require_solar_lighting` boolean default false
- `solar_lighting_min_pole_height_m` numeric
- `solar_lighting_min_lumens` integer
- `solar_lighting_beam_angle_deg` integer (faisceau max)
- `solar_lighting_max_spacing_m` numeric (espacement max entre mâts)
- `solar_lighting_min_battery_hours` integer (autonomie min)
- `solar_lighting_required_sides` text — `left` | `right` | `both` | `alternating`

Ces seuils (`min`/`max`) sont **bornes admin** : la voie utilisateur doit les respecter ou la soumission est bloquée. La portée urbain/rural est déjà couverte par `section_type` existant : la même règle peut donc avoir `require_drainage_canal=true` en urbain et `false` en rural simplement en créant deux règles distinctes (comportement déjà en place pour `min_road_width_m`, etc.).

## 2. Admin — `AdminSubdivisionZoningRules.tsx`

Dans la section **« Contraintes techniques »** du dialogue, ajouter deux nouvelles sous-cartes pliables après les contraintes voie/lots :

- **« Canal d'évacuation des eaux usées »** : Switch obligatoire + champs min largeur, min profondeur, multi-select matériaux, multi-select types, pente min, côté.
- **« Éclairage public solaire »** : Switch obligatoire + hauteur mât, lumens min, faisceau, espacement max, autonomie min, côté.

Les champs sont désactivés tant que le Switch « obligatoire » est off. Mappés dans `emptyForm`, `openEdit`, et `payload` du `handleSave`. Aide contextuelle (`FieldHelp`) sur chaque seuil.

## 3. Frontend types & hook

- `useZoningRules.ts` : étendre l'interface `ZoningRule` avec les nouveaux champs.
- `src/components/cadastral/subdivision/types.ts` :
  - Étendre `SubdivisionRoad` avec :
    - `drainageCanal?: { widthM, depthM, material, type, slopePct, side } | null`
    - `solarLighting?: { poleHeightM, lumens, beamAngleDeg, spacingM, batteryHours, side } | null`
- Constantes labels matériaux/types/côtés (FR).

## 4. Demande de lotissement — UI création/édition de voie

Dans `RoadsListPanel.tsx` (et le mini-formulaire d'édition de voie) :
- Ajouter deux sections rétractables sous les attributs de la voie.
- Les champs deviennent **obligatoires** si la règle de zonage active (`useZoningCompliance`) impose `require_drainage_canal` / `require_solar_lighting`.
- Bornes min/max issues de la règle injectées comme `min`/`max` HTML + validation visuelle.
- Affichage d'un badge « Requis par la zone » à côté de chaque section quand applicable.

## 5. Validation & soumission

- `subdivisionValidation.ts` (front) : ajouter règles
  - Si `require_drainage_canal` : chaque road doit avoir `drainageCanal` rempli + chaque champ ≥ min admin + matériau/type/côté ∈ liste autorisée.
  - Idem pour `require_solar_lighting`.
- Edge function `subdivision-request/index.ts` (back) : refaire la même validation côté serveur (source de vérité), refuser la requête avec message explicite par voie non conforme.
- Persistance : les attributs sont déjà dans le JSON `subdivision_plan_data.roads`, aucune nouvelle table requise. La table matérialisée `subdivision_roads` sera étendue avec deux colonnes JSON `drainage_canal_data` et `solar_lighting_data` pour requêtes admin.

## 6. Affichage admin de la demande

- `AdminSubdivisionRequests` : dans la vue détail d'une demande, lister par voie les attributs canal + éclairage avec badge conformité (✓ conforme / ✗ hors normes).
- Plan PDF (`StepPlanView` / export) : option « Afficher canal / éclairage » dans la légende.

## 7. Migrations & rétro-compatibilité

- Toutes nouvelles colonnes nullables / défauts permissifs → règles existantes inchangées.
- Demandes existantes sans ces blocs : restent valides (pas de validation rétroactive).

## Détails techniques

```text
ZoningRule (admin) → useZoningCompliance → RoadsListPanel
                                        ↓
                              SubdivisionRoad.drainageCanal / solarLighting
                                        ↓
                  validateSubdivisionFull (front) + edge fn (back)
                                        ↓
                       subdivision_plan_data.roads (JSON)
                                        ↓
                       trigger sync → subdivision_roads (matérialisée)
```

Choix utilisateur retenus : portée selon section urbain/rural (deux règles distinctes), admin fixe les seuils min/max, champs canal = largeur+profondeur+matériau+type+côté/pente, champs éclairage = hauteur+lumens+faisceau+espacement+autonomie+côté.
