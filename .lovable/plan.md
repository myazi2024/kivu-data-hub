

## Bug : nettoyage mode test bloqué par FK `mutation_requests → cadastral_parcels`

### Cause
Lors de la suppression de `cadastral_parcels`, Postgres rejette à cause de `mutation_requests.parcel_id` qui référence encore les parcelles TEST.

Dans les flux actuels :
- **`rollback.ts`** (front, post-génération en cas d'échec) supprime `mutation_requests` par `reference_number ILIKE 'TEST-MUT-%-{suffix}'` mais **après** `cadastral_parcels` → trop tard, et le filtre par suffix peut rater des lignes liées aux parcelles via `parcel_id` plutôt que via la référence.
- **`cleanup-test-data/index.ts`** (edge auto-cleanup) supprime `mutation_requests` à l'**étape 10**, soit après les parcelles à l'étape 8 → même conflit FK.
- Le RPC `cleanup_all_test_data` (purge manuelle admin) suit probablement le même ordre.

D'autres FK potentiellement orphelines pointent aussi vers `cadastral_parcels.id` : `subdivision_requests.parcel_id`, `land_title_requests.parcel_id`, `real_estate_expertise_requests.parcel_id`, `cadastral_land_disputes.parcel_id`. Toutes doivent être purgées **avant** les parcelles.

### Correctifs

| # | Fichier | Action |
|---|---|---|
| 1 | `src/components/admin/test-mode/generators/rollback.ts` | Réordonner : supprimer `mutation_requests`, `subdivision_requests`, `land_title_requests`, `real_estate_expertise_requests` (+ `expertise_payments`), `cadastral_land_disputes` **par `parcel_id IN parcelIds`** AVANT `cadastral_parcels`. Garder le filtrage par `reference_number` en complément pour les lignes sans parcelle. |
| 2 | `supabase/functions/cleanup-test-data/index.ts` | Déplacer les blocs étape 9-10 (mutations, subdivisions, expertises, disputes, land_title) **avant** l'étape 8 (parcels). Ajouter un `delete().in('parcel_id', parcelIds)` en plus des filtres par `reference_number`. |
| 3 | Migration SQL | Mettre à jour le RPC `cleanup_all_test_data()` pour appliquer le même ordre FK-safe (children par `parcel_id` → parcelles), puis vérifier `cleanup_old_test_data()` si présent. |

### Détails techniques

- **Pattern à appliquer** dans rollback ET edge function :
  ```
  // Avant cadastral_parcels :
  delete from mutation_requests where parcel_id = ANY(parcelIds)
  delete from subdivision_requests where parcel_id = ANY(parcelIds)
  delete from land_title_requests where parcel_id = ANY(parcelIds)
  delete from expertise_payments where expertise_request_id IN (... where parcel_id = ANY(parcelIds))
  delete from real_estate_expertise_requests where parcel_id = ANY(parcelIds)
  delete from cadastral_land_disputes where parcel_id = ANY(parcelIds)
  // Puis seulement cadastral_parcels
  ```
- **Pourquoi double filtre (parcel_id + reference_number)** : certaines demandes TEST n'ont pas de `parcel_id` (préfixe seul), et certaines parcelles TEST peuvent avoir des demandes legacy sans préfixe TEST sur la référence. Les deux passes garantissent zéro orphelin.
- **Vérification post-fix** : query SQL `SELECT count(*) FROM mutation_requests m JOIN cadastral_parcels p ON p.id = m.parcel_id WHERE p.parcel_number LIKE 'TEST-%'` doit retourner 0 après purge.
- Mise à jour mémoire `mem://admin/test-mode-hardening-fr` pour documenter l'ordre FK-safe complet.

