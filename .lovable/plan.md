## Problème

Le bouton « Approuver » échoue avec :
`new row for relation "cadastral_parcels" violates check constraint "cadastral_parcels_declared_usage_check"`

Ligne fautive : `declared_usage = 'Usage mixte'`.

La contrainte CHECK actuelle sur `cadastral_parcels.declared_usage` n'accepte que les **valeurs héritées** :
`'Résidentiel', 'Commercial', 'Mixte', 'Institutionnel', 'Industriel', 'Agricole'`.

Or, le formulaire CCC (`useCCCFormPicklists` → `picklist_declared_usage`, cf. `src/utils/declaredUsageNormalizer.ts`) écrit désormais :
`'Habitation', 'Usage mixte', 'Commerce', 'Bureau', 'Entrepôt', 'Industrie', 'Agriculture', 'Terrain vacant', 'Parking'`.

Quand le trigger `create_parcel_from_approved_contribution()` copie la contribution vers `cadastral_parcels`, la valeur courante « Usage mixte » est rejetée. Aucun trigger ne fait de normalisation, et la source de vérité front est la nouvelle picklist — c'est la contrainte qui est obsolète.

## Plan

### Migration SQL (une seule)

**1. Remplacer la contrainte `cadastral_parcels_declared_usage_check`**
- `ALTER TABLE public.cadastral_parcels DROP CONSTRAINT cadastral_parcels_declared_usage_check;`
- `ALTER TABLE public.cadastral_parcels ADD CONSTRAINT cadastral_parcels_declared_usage_check CHECK (declared_usage = ANY (ARRAY[…]));`

Liste autorisée (union picklist CCC actuelle + valeurs légales encore présentes en base pour rétro-compatibilité) :

```
'Habitation', 'Usage mixte', 'Commerce', 'Bureau', 'Entrepôt',
'Industrie', 'Agriculture', 'Terrain vacant', 'Parking', 'Location',
-- legacy
'Résidentiel', 'Commercial', 'Mixte', 'Institutionnel', 'Industriel', 'Agricole'
```

(Liste alignée avec `KNOWN_USAGES` + `LEGACY_MAP` de `src/utils/declaredUsageNormalizer.ts`.)

### Hors scope

- Pas de modification des triggers `create_parcel_from_approved_contribution()` ni `sync_approved_contribution_to_parcel()` — leur correctif `area_hectares` reste en place.
- Pas de modification du front (`declaredUsageNormalizer.ts` reste l'unique source de mapping pour l'affichage analytique).
- Les contraintes `construction_nature`, `parcel_type`, `lease_type` ne sont pas concernées (le ligne fautive les respecte).

### Vérification post-migration

- Réessayer l'approbation de la contribution `SU/123456` (déclared_usage = « Usage mixte ») → doit créer la parcelle.
- `SELECT DISTINCT declared_usage FROM cadastral_contributions` (« Habitation », « Usage mixte ») → toutes acceptées par la nouvelle contrainte.
- Aucune ligne existante de `cadastral_parcels` rejetée (les valeurs legacy restent autorisées).
