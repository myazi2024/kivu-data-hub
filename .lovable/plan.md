

# Ajouter les tables manquantes au nettoyage des données test

## Problème
La fonction `cleanup_all_test_data()` ne supprime pas :
- `expertise_payments` (liée par FK à `real_estate_expertise_requests`)
- `real_estate_expertise_requests` (données test avec `reference_number ILIKE 'TEST-%'`)
- `payment_transactions` (données test avec `metadata->>'test_mode' = 'true'`)

## Solution
Nouvelle migration SQL qui recrée `cleanup_all_test_data()` en ajoutant ces 3 DELETE dans le bon ordre FK :

1. **`expertise_payments`** : supprimer ceux dont `expertise_request_id` pointe vers une expertise `TEST-%` (enfant → avant le parent)
2. **`payment_transactions`** : supprimer ceux avec `metadata->>'test_mode' = 'true'` OU liés à des factures `TEST-%`
3. **`real_estate_expertise_requests`** : supprimer ceux avec `reference_number ILIKE 'TEST-%'`

Ces suppressions seront placées **avant** la suppression des parcelles et factures pour respecter l'ordre FK.

## Détails techniques

Ajouts dans la fonction, juste après la suppression de `cadastral_service_access` (ligne 32) et avant `cadastral_invoices` :

```sql
-- expertise_payments (FK → real_estate_expertise_requests)
DELETE FROM public.expertise_payments WHERE expertise_request_id IN (
  SELECT id FROM public.real_estate_expertise_requests WHERE reference_number ILIKE 'TEST-%'
);

-- payment_transactions (test data)
DELETE FROM public.payment_transactions WHERE metadata->>'test_mode' = 'true';

-- real_estate_expertise_requests
DELETE FROM public.real_estate_expertise_requests WHERE reference_number ILIKE 'TEST-%';
```

| Fichier | Modification |
|---------|-------------|
| Nouvelle migration SQL | `CREATE OR REPLACE FUNCTION cleanup_all_test_data()` avec les 3 tables manquantes |

