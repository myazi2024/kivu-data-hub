# Contrainte « Revêtement de voie » — règles de zonage lotissement

Aligné sur le pattern existant `require_drainage_canal` / `require_solar_lighting`.

## 1. Migration BDD

**Table `subdivision_zoning_rules`** — ajouter colonnes :
- `require_road_surface boolean default false`
- `road_surface_allowed_materials text[] default '{}'`
- `road_surface_min_thickness_cm numeric`
- `road_surface_max_thickness_cm numeric`

**Nouvelle table `subdivision_road_surface_materials`** (liste 100 % configurable, comme demandé) :
- `key text unique` (ex: `bitume`, `pave_beton`, `pave_pierre`, `briques`)
- `label text`
- `description text`
- `display_order int`, `is_active boolean default true`
- RLS : lecture publique sur `is_active=true`, CRUD admin/super_admin.
- Seed initial : bitume, pavé béton, pavé pierre naturelle (granit/grès/travertin), briques, béton coulé, gravier stabilisé.

**Table `subdivision_infrastructure_tariffs`** — déjà existante, ajouter via seed une catégorie `road_surface` avec une entrée par matériau (unité `sqm`, `section_type` urban/rural), pour intégration tarification.

**Table `subdivision_requests`** — ajouter `road_surface_material text`, `road_surface_thickness_cm numeric`, `road_surface_fee_usd numeric default 0`.

## 2. Admin — `AdminSubdivisionZoningRules.tsx`

Dans le bloc « Contraintes techniques » (après éclairage solaire), nouveau bloc **« Revêtement de la voie »** :
- Switch `require_road_surface`
- Multi-select des matériaux (alimenté par `subdivision_road_surface_materials` actifs)
- Inputs `min_thickness_cm` / `max_thickness_cm` (globaux)
- Validation : si `require=true`, au moins 1 matériau coché ; max ≥ min.

Nouvel onglet ou sous-section dans le hub admin : **« Matériaux de revêtement »** (CRUD sur `subdivision_road_surface_materials`).

## 3. Hook `useZoningRules.ts`

Étendre l'interface `ZoningRule` avec les 4 nouveaux champs.

## 4. Formulaire utilisateur — saisie globale

**Nouveau composant** `StepRoadSurface.tsx` (ou intégré à `StepInfrastructures`) :
- Affiché conditionnellement si `rule.require_road_surface === true`.
- Select unique matériau (limité à `rule.road_surface_allowed_materials`).
- Input épaisseur (cm) borné par min/max de la règle.
- Sous-total live = `rate_usd(material) × thickness_factor × Σ(road_length × road_width)`.

**`useSubdivisionForm.ts`** : ajouter `roadSurface: { material, thicknessCm }` au state, persistance dans le draft v3, propagation à l'edge payload.

**`FeeBreakdown`** : ajouter ligne « Revêtement voirie » au récap (`StepSummary`).

## 5. Edge function `subdivision-request`

Validation serveur (source de vérité) :
- Si `require_road_surface` et `roadSurface` manquant/invalide → 422 `ROAD_SURFACE_REQUIRED`.
- Matériau ∈ liste autorisée, épaisseur ∈ [min,max] → sinon 422 `ROAD_SURFACE_INVALID`.
- Recalcul `road_surface_fee_usd` depuis `subdivision_infrastructure_tariffs` (catégorie `road_surface`, key = matériau choisi) × surface voirie totale recomputée depuis vertices.
- Persistance dans `subdivision_requests` + ajout au `total_amount_usd` via `_shared/subdivisionFees.ts`.

**`_shared/subdivisionFees.ts`** : intégrer le calcul `roadSurfaceFee` au breakdown unifié.

## 6. `SubdivisionRequestDialog.tsx`

Mapping des nouveaux codes erreur (`ROAD_SURFACE_REQUIRED`/`ROAD_SURFACE_INVALID`) → rebascule sur l'onglet revêtement.

## 7. Détails techniques

```text
Saisie utilisateur :   1 matériau global + 1 épaisseur (pas de surcharge par voie)
Calcul frais :         rate_usd × surface_voirie_totale_sqm
Surface voirie =       Σ(road.path_length × road.widthM)  [serveur uniquement]
Fallback :             si require=false, bloc masqué, fee=0
```

## 8. Tests
- `useZoningCompliance` : ajout cas `ROAD_SURFACE_REQUIRED`/`OK`.
- Edge function : validation matériau hors liste, épaisseur hors bornes.

## 9. Mémoire
Mise à jour de `mem://admin/subdivision-admin-audit-fr` avec le nouveau Lot « Revêtement voirie ».
