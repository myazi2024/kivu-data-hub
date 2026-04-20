

## Fix — Mode test : RPC stats cassée par les entrées registry invalides

### Cause racine

La migration `20260420193550` a inséré 8 lignes dans `test_entities_registry` pour couvrir les tables enfants. Trois de ces lignes pointent vers des **tables qui n'existent pas** (noms erronés) et cinq pointent vers des **colonnes marqueurs inexistantes** ou non préfixées `TEST-` :

| label_key | table_name déclaré | Réalité |
|---|---|---|
| `expertisePayments` | `real_estate_expertise_payments` | Table → `expertise_payments` |
| `permitPayments` | `building_permit_payments` | Table → `permit_payments` |
| `permitAdminActions` | `building_permit_admin_actions` | Table → `permit_admin_actions` |
| `fraudAttempts` | `fraud_attempts` | Pas de colonne `reference_number` |
| `ownershipHistory` / `taxHistory` / `boundaryHistory` / `mortgagePayments` | tables OK | Colonnes marqueurs ne sont jamais préfixées `TEST-` (lien par FK) |

À chaque ouverture de l'admin Mode Test, la boucle `EXECUTE format(...)` de `count_test_data_stats()` plante sur la première table fantôme → toast « relation public.real_estate_expertise_payments does not exist ».

### Correctif (1 migration, données seules — pas de schéma)

**Désactiver dans le registry les 8 entrées ajoutées par la migration précédente.** La RPC `count_test_data_stats()` couvre déjà ces entités via FK (`parcel_id`, `expertise_request_id`, `contribution_id`) — leur présence dans le registry est redondante et nuisible.

```sql
UPDATE public.test_entities_registry
   SET is_active = false
 WHERE label_key IN (
   'ownershipHistory','taxHistory','boundaryHistory',
   'mortgagePayments','expertisePayments','fraudAttempts',
   'permitPayments','permitAdminActions'
 );
```

### Conséquences

- **Stats admin** : le compteur `expertisePayments`, `ownershipHistory`, etc. continue d'être renvoyé par la RPC (logique FK déjà présente, lignes 33–75 de la fonction). Aucune perte.
- **Export CSV pré-purge** (`TestDataExportButton`) : ne tentera plus d'exporter des tables fantômes. Les entités enfants restent purgées par l'edge `cleanup-test-data-batch` (qui a sa propre liste interne de 23 étapes).
- **Frontend** : aucun changement requis. `loadTestEntities()` filtre déjà sur `is_active = true`.

### Hors périmètre

- Pas de modification de la RPC `count_test_data_stats()` (déjà correcte).
- Pas de modification de l'edge `cleanup-test-data-batch`.
- Pas de modification de `src/constants/testEntities.ts`.

### Validation attendue

- Ouvrir admin → Mode Test → les statistiques s'affichent sans toast d'erreur.
- Export CSV pré-purge fonctionne sur les 14 entités racines historiques.
- La purge batched continue de couvrir l'ensemble des 23 tables enfants.

