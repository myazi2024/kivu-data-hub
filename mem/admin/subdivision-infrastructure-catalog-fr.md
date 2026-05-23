---
name: Subdivision infrastructure catalog harmonization
description: Modèle base+multiplicateur pour drainage/revêtement/éclairage (3 tarifs base + catalogues admin avec price_multiplier)
type: feature
---

## Modèle unifié

3 tarifs de base uniquement dans `subdivision_infrastructure_tariffs` (UNIQUE sur `infrastructure_key`) :
- `road_surface` (USD/m²)
- `drainage` (USD/ml)
- `street_lighting` (USD/unité)

Multiplicateurs portés par les catalogues admin (colonne `price_multiplier numeric DEFAULT 1.0`) :
- `subdivision_road_surface_materials`
- `subdivision_drainage_materials` (béton, pvc, maconnerie, pierre, metal, composite)
- `subdivision_drainage_types` (ouvert, couvert, enterre)

Calcul final côté serveur (`_shared/subdivisionFees.ts` à mettre à jour) :
```
revêtement(road) = base.road_surface × material.mult × longueur × largeur
drainage(road)   = base.drainage × material.mult × type.mult × longueur × (côtés)
éclairage(road)  = base.street_lighting × nb_lampadaires
```

## Règles

- Les clés `road_surface_<mat>` et `drainage_<mat>` sont **obsolètes** ; l'admin Tarifs les signale comme « clé obsolète à supprimer ».
- RLS catalogues drainage : `SELECT USING (true)`, écriture `has_role(auth.uid(),'admin')`.
- Zonage : matériaux/types autorisés (`allowed_materials/types`) sont des sous-ensembles des catalogues. Front demande filtre via cette liste.

## Bug écran blanc (fix UI)

Dans `AdminSubdivisionZoningRules`, les chips multi-sélection utilisaient `<label><input type="checkbox" className="sr-only"></label>` à l'intérieur d'un `Dialog` Radix → crash silencieux du focus-trap → écran blanc. Remplacé par `<button type="button" role="checkbox" aria-checked>` qui ne pose pas de problème de focus management.

## Fichiers clés

- Migration tables + nettoyage : 2026-05-23.
- `src/components/admin/AdminSubdivisionZoningRules.tsx` : chips → button, lecture base `road_surface`, dédup matériaux.
- `src/components/admin/AdminSubdivisionInfrastructureTariffs.tsx` : `syncRoadSurfaces` retiré, détection résidus.
- `src/components/admin/AdminSubdivisionRoadSurfaceMaterials.tsx` : type étendu avec `price_multiplier`.
- `src/integrations/supabase/untyped.ts` : helpers `subdivision_drainage_materials/types/road_surface_materials`.

## TODO (suite)

- UI admin pour éditer `price_multiplier` (revêtements + drainage matériaux + drainage types).
- `_shared/subdivisionFees.ts` : passer au calcul base×multiplier (actuellement encore basé sur clés détaillées).
- `infrastructureConstants.ts` : remplacer constantes drainage par hooks DB.
- Formulaire demande lotissement : filtrer matériaux/types selon `allowed_*` de la règle de zonage + afficher prix unitaire calculé.
