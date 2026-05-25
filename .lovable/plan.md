## Problème

Le bouton « Approuver » échoue avec `cannot insert a non-DEFAULT value into column "area_hectares"`. La colonne `cadastral_parcels.area_hectares` est `GENERATED ALWAYS AS (area_sqm / 10000.0)`, mais **deux fonctions trigger** SQL essaient encore d'écrire dedans :

- `create_parcel_from_approved_contribution()` — INSERT incluant `area_hectares` (ligne 16, 27)
- `sync_approved_contribution_to_parcel()` — INSERT et UPDATE incluant `area_hectares` (lignes 168, 200, 233)

Les deux sont déclenchées sur `UPDATE` de `cadastral_contributions` quand le statut passe à `approved`, donc l'erreur remonte côté admin. Le code TypeScript du front est déjà correct (il n'insère pas `area_hectares`) — seules les fonctions Postgres sont à corriger.

## Plan

### Migration SQL (une seule, deux `CREATE OR REPLACE FUNCTION`)

**1. `create_parcel_from_approved_contribution()`**
- Retirer la colonne `area_hectares` de la liste des colonnes du `INSERT INTO cadastral_parcels`
- Retirer la valeur correspondante `NEW.area_sqm / 10000.0` du `VALUES`
- Tout le reste de la fonction (historiques propriétaires/bornage/taxes/hypothèques/permis) reste identique

**2. `sync_approved_contribution_to_parcel()`**
- Dans la branche `UPDATE` : supprimer la ligne `area_hectares = COALESCE(NEW.area_sqm / 10000, area_hectares),`
- Dans la branche `INSERT` (fallback sans `original_parcel_id`) : retirer `area_hectares` de la liste de colonnes et la valeur `COALESCE(NEW.area_sqm / 10000, 0)` correspondante
- Conserver `SECURITY DEFINER` + `SET search_path = public`

Aucune modification de schéma (la colonne `area_hectares` reste `GENERATED ALWAYS`), aucune modification des triggers eux-mêmes, aucune modification du code TypeScript. Le calcul `area_hectares = area_sqm / 10000` continuera d'être produit automatiquement par Postgres à chaque INSERT/UPDATE de `area_sqm`.

### Vérification post-migration

- Approuver une contribution `pending` de type `new` → parcelle créée, `area_hectares` peuplé automatiquement
- Approuver une contribution `update` liée à `original_parcel_id` → parcelle mise à jour, pas d'erreur
- `SELECT area_sqm, area_hectares FROM cadastral_parcels` sur la nouvelle ligne → ratio 10000 respecté
