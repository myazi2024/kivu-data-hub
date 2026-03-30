

# Corriger le nettoyage des données test ("Nettoyer tout")

## Problème
Les DELETE depuis le client échouent silencieusement car la plupart des tables cadastrales n'ont **pas de politique RLS pour DELETE** (seules `cadastral_contributions` et `notifications` en ont). Le helper `safeDelete` log l'erreur en console mais ne la remonte pas à l'utilisateur, donnant l'impression que ça a fonctionné.

## Solution
Créer une fonction SQL `SECURITY DEFINER` qui effectue la suppression des données TEST- côté serveur, en contournant les RLS. Puis appeler cette fonction via `supabase.rpc()` depuis le client.

### Changements

**Migration SQL** --- Nouvelle fonction `cleanup_all_test_data()`
- Fonction `SECURITY DEFINER` qui supprime toutes les lignes `TEST-%` dans les 19 tables, en respectant l'ordre FK (enfants → parents)
- Retourne un JSON avec le nombre de lignes supprimées par table
- Accessible uniquement aux utilisateurs authentifiés avec le rôle `admin`

**`src/components/admin/test-mode/useTestDataActions.ts`**
- Remplacer les ~50 lignes de `cleanupTestData` (lignes 85-152) par un simple appel `supabase.rpc('cleanup_all_test_data')`
- Afficher le résultat (nombre de lignes supprimées) dans le toast de succès
- Supprimer le helper `safeDelete` devenu inutile

## Détails techniques

```sql
CREATE OR REPLACE FUNCTION public.cleanup_all_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  cnt integer;
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  -- Suppression FK-safe (enfants → parents)
  -- 1. fraud_attempts via contribution_id join
  DELETE FROM fraud_attempts WHERE contribution_id IN (
    SELECT id FROM cadastral_contributions WHERE parcel_number ILIKE 'TEST-%'
  );
  GET DIAGNOSTICS cnt = ROW_COUNT;
  result := result || jsonb_build_object('fraud_attempts', cnt);

  -- ... (19 tables au total, même ordre que l'actuel)

  RETURN result;
END;
$$;
```

| Fichier | Modification |
|---------|-------------|
| Nouvelle migration SQL | Fonction `cleanup_all_test_data()` |
| `useTestDataActions.ts` | Remplacer cleanup par `rpc('cleanup_all_test_data')` |

