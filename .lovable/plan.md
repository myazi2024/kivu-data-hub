

# Corriger l'ordre de suppression dans `cleanup_all_test_data`

## Problème
La fonction supprime les `cadastral_parcels` (ligne 82) **avant** les `mutation_requests` et `subdivision_requests` (lignes 107-113). Or ces tables ont une FK `parcel_id` vers `cadastral_parcels`, ce qui provoque l'erreur de contrainte.

## Solution
Déplacer la suppression de `mutation_requests` et `subdivision_requests` **dans le bloc parcel_ids** (avant la suppression des parcelles), en les supprimant par `parcel_id = ANY(parcel_ids)` en plus de par `reference_number ILIKE 'TEST-%'`.

### Migration SQL
Recréer la fonction `cleanup_all_test_data()` avec l'ordre corrigé :

```
-- Inside the IF parcel_ids block (before parcels delete):
DELETE FROM mutation_requests WHERE parcel_id = ANY(parcel_ids) OR reference_number ILIKE 'TEST-%';
DELETE FROM subdivision_requests WHERE parcel_id = ANY(parcel_ids) OR reference_number ILIKE 'TEST-%';
```

Puis supprimer les deux DELETE redondants de la section "Independent tables".

| Fichier | Modification |
|---------|-------------|
| Nouvelle migration SQL | `CREATE OR REPLACE FUNCTION cleanup_all_test_data()` avec ordre FK corrigé |

