

# Ajouter `subdivision_requests` à la fonction de nettoyage

## Problème
La table `subdivision_requests` a une FK `parcel_id` vers `cadastral_parcels`, mais elle n'est pas supprimée dans la fonction `cleanup_all_test_data()`. Cela provoque l'erreur de contrainte FK lors de la suppression des parcelles.

## Solution
Ajouter un DELETE de `subdivision_requests` juste après `mutation_requests` (ligne 95), avant la suppression des parcelles.

### Migration SQL

Recréer la fonction en ajoutant entre les lignes 95 et 97 :

```sql
-- subdivision_requests (FK parcel_id -> cadastral_parcels)
DELETE FROM public.subdivision_requests WHERE parcel_id = ANY(parcel_ids) OR reference_number ILIKE 'TEST-%';
GET DIAGNOSTICS cnt = ROW_COUNT;
result := result || jsonb_build_object('subdivision_requests', cnt);
```

| Fichier | Modification |
|---------|-------------|
| Nouvelle migration SQL | `CREATE OR REPLACE FUNCTION cleanup_all_test_data()` avec `subdivision_requests` ajouté avant la suppression des parcelles |

