

## Bug : `column "certificate_number" does not exist` à l'étape `generated_certificates`

### Cause exacte
La RPC `_cleanup_test_data_chunk_internal` (étape `generated_certificates`, ligne 96) référence `certificate_number` qui **n'existe pas** dans la table `generated_certificates`. Les colonnes réelles utiles sont `reference_number` et `parcel_number`.

Conséquence : l'étape lève `42703` → l'edge function retourne 500 → toast « Edge Function returned a non-2xx status code ».

### Correctif (1 migration SQL)
Recréer `_cleanup_test_data_chunk_internal` à l'identique en changeant uniquement le bloc `WHEN 'generated_certificates'` :

```sql
WHEN 'generated_certificates' THEN
  WITH v AS (
    SELECT id FROM public.generated_certificates
    WHERE reference_number LIKE 'TEST-%' OR parcel_number LIKE 'TEST-%'
    LIMIT p_limit
  )
  DELETE FROM public.generated_certificates USING v
  WHERE generated_certificates.id = v.id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
```

Tout le reste de la fonction est conservé. `SECURITY DEFINER` + `SET search_path = public` maintenus.

### Bonus robustesse (optionnel mais utile)
Modifier `supabase/functions/cleanup-test-data-batch/index.ts` pour renvoyer **status 200** avec `{ ok: false, error, failed_step, partial_summary, partial_total }` en cas d'erreur d'étape, au lieu de 500. Le frontend pourra ainsi afficher le nom exact de l'étape fautive plutôt qu'un message générique « non-2xx ».

### Vérification post-fix
- Relancer « Nettoyer tout » : doit terminer sans erreur.
- Logs edge : plus aucun `42703`.
- `count_test_data_stats()` revient à 0.

