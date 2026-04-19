

## Bug : `column "parcel_id" does not exist` — vraie cause identifiée

### Cause exacte

La table `land_title_requests` **n'a que la colonne `reference_number`** — pas de `parcel_id`, pas de `parcel_number`. Or les fonctions `cleanup_all_test_data()` et `cleanup_all_test_data_auto()` exécutent toutes deux :

```sql
DELETE FROM land_title_requests WHERE parcel_id = ANY(v_parcel_ids);
```

→ Postgres rejette : `column "parcel_id" does not exist`.

Les 4 autres tables (`mutation_requests`, `subdivision_requests`, `cadastral_land_disputes`, `real_estate_expertise_requests`) ont bien `parcel_id` → seule `land_title_requests` casse la transaction.

Le code front (`rollback.ts`) fait la même supposition incorrecte ligne 33 (`sb.from('land_title_requests').delete().in('parcel_id', parcelIds)`) — Supabase REST ignore silencieusement les colonnes inexistantes mais c'est dormant.

### Correctifs

| # | Cible | Action |
|---|---|---|
| 1 | Migration SQL | Recréer `cleanup_all_test_data()` et `cleanup_all_test_data_auto()` : **supprimer** les deux lignes `DELETE FROM land_title_requests WHERE parcel_id = ANY(...)`. La passe orpheline `WHERE reference_number LIKE 'TEST-%'` (déjà présente plus bas) suffit pour purger cette table. |
| 2 | `src/components/admin/test-mode/generators/rollback.ts` ligne 33 | Retirer l'appel `sb.from('land_title_requests').delete().in('parcel_id', parcelIds)`. La purge par `reference_number` (LIKE `TEST-LTR-%`) reste à ajouter dans la passe orpheline si elle n'y est pas. |
| 3 | Mémoire `mem://admin/test-mode-hardening-fr` | Documenter le particularisme : `land_title_requests` n'a pas de `parcel_id` → purger uniquement par `reference_number`. |

### Vérification post-fix
- `SELECT public.cleanup_all_test_data();` doit s'exécuter sans erreur.
- Le bouton "Nettoyer tout" et "Régénérer" doivent réussir.
- Les compteurs stats doivent revenir à 0 après purge.

