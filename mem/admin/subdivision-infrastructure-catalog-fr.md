---
name: Subdivision infrastructure catalog harmonization
description: Modèle base+multiplicateur unifié pour drainage/revêtement/éclairage (3 tarifs base + 3 catalogues admin avec price_multiplier, calcul serveur en place)
type: feature
---

## Modèle unifié

3 tarifs de base uniquement dans `subdivision_infrastructure_tariffs` (UNIQUE sur `infrastructure_key`) :
- `road_surface` (USD/m²) — défaut 18
- `drainage` (USD/ml) — défaut 2
- `street_lighting` (USD/unité) — défaut 150

Multiplicateurs portés par les catalogues admin (colonne `price_multiplier numeric DEFAULT 1.0`) :
- `subdivision_road_surface_materials` (bitume ×1.2, gravier ×0.4, etc.)
- `subdivision_drainage_materials` (béton ×1.0, pvc ×0.6, maconnerie ×0.8, pierre ×1.1, metal ×1.4, composite ×1.6)
- `subdivision_drainage_types` (ouvert ×1.0, couvert ×1.4, enterre ×2.0)

## Calcul serveur (en place)

`supabase/functions/_shared/subdivisionFees.ts` exporte :
- `loadInfraCatalogs(supabase)` : charge en parallèle les 3 tarifs base + 3 catalogues actifs.
- `computeRoadInfrastructures(roads, frame, catalogs)` : produit `items[]`, `total`, `roadLengthCoveredM`.

Formules :
```
revêtement(road) = base.road_surface  × material.mult              × longueur × largeur
drainage(road)   = base.drainage      × material.mult × type.mult  × longueur × côtés
éclairage(road)  = base.street_lighting × ceil(longueur/spacing) × côtés
```

Audit : chaque ligne `InfraLineItem` conserve `base_rate_usd`, `material_key/multiplier`, `type_key/multiplier` pour traçabilité.

Edge function `subdivision-request/index.ts` : appelle `loadInfraCatalogs` + `computeRoadInfrastructures` (les anciennes clés composées `road_surface_<mat>`, `drainage_<mat>`, `street_lighting_solar` ne sont plus utilisées).

## UI admin (en place)

- `AdminSubdivisionRoadSurfaceMaterials` : CRUD complet avec champ `price_multiplier` (input number step 0.05, affichage `×1.20` dans la table).
- `AdminSubdivisionDrainageCatalog` : tabs "Matériaux" / "Types", même pattern que road_surface.
- Intégrés dans `AdminSubdivisionZoningRules` sous le tableau des règles.
- Les chips matériaux/types autorisés dans le dialog de règle lisent désormais `useDrainageMaterialsCatalog/useDrainageTypesCatalog` et affichent le multiplicateur en suffixe.

## UI utilisateur (en place)

`RoadsListPanel` consomme les hooks `useDrainageMaterialsCatalog`/`useDrainageTypesCatalog` pour peupler les Select des canaux. Les constantes `DRAINAGE_CANAL_MATERIAL_LABELS/TYPE_LABELS` restent comme fallback offline pour les anciennes clés.

## Règles

- Les clés `road_surface_<mat>` et `drainage_<mat>` sont **obsolètes** ; l'admin Tarifs les signale comme « clé obsolète à supprimer ».
- RLS catalogues drainage : `SELECT USING (true)`, écriture `has_role(auth.uid(),'admin')`.
- Zonage : `drainage_canal_allowed_materials/types` est un sous-ensemble des catalogues. Si vide → toutes les entrées actives sont proposées.
- Multiplicateur = 0 → matériau désactivé de fait (subtotal = 0, item omis).

## Bug écran blanc (fix UI)

Dans `AdminSubdivisionZoningRules`, les chips multi-sélection utilisaient `<label><input type="checkbox" className="sr-only"></label>` à l'intérieur d'un `Dialog` Radix → crash silencieux du focus-trap → écran blanc. Remplacé par `<button type="button" role="checkbox" aria-checked>`.

## Fichiers clés

- Migration : `20260523155908_99bdabec-...sql` (3 tarifs base + catalogues drainage + cleanup).
- `supabase/functions/_shared/subdivisionFees.ts` : `loadInfraCatalogs`, `computeRoadInfrastructures`, `InfraLineItem`.
- `supabase/functions/subdivision-request/index.ts` : appel unifié, audit `persistedInfrastructures`.
- `src/hooks/useSubdivisionDrainageCatalog.ts` : hooks React (`useDrainageMaterialsCatalog`, `useDrainageTypesCatalog`).
- `src/components/admin/AdminSubdivisionDrainageCatalog.tsx` : CRUD tabbed.
- `src/components/admin/AdminSubdivisionRoadSurfaceMaterials.tsx` : champ multiplier.
- `src/components/admin/AdminSubdivisionZoningRules.tsx` : chips dynamiques + intégration catalogue.
- `src/components/cadastral/subdivision/steps/panels/RoadsListPanel.tsx` : Select drainage depuis DB.
