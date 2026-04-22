

## Plan — Réparer le Mode Test (erreur `column "reference_number" does not exist`)

### Diagnostic

L'erreur réelle dans la console n'est **pas** celle de la migration précédente (`real_estate_expertise_payments` est déjà corrigée). Le bug actuel est :

```
42703 — column "reference_number" does not exist
```

**Cause** : la dernière migration a réactivé `fraudAttempts` dans `test_entities_registry` avec `marker_column = 'reference_number'`. Or la table `public.fraud_attempts` ne possède **aucune colonne `reference_number`** (colonnes réelles : `id, user_id, contribution_id, fraud_type, description, severity, created_at`).

Le RPC `count_test_data_stats()` boucle sur les entités actives du registry et exécute :
```sql
EXECUTE format('SELECT count(*) FROM public.%I WHERE %I LIKE $1', table_name, marker_column)
```
→ explose au premier appel sur `fraud_attempts`, et toute la carte stats s'effondre. Cela bloque aussi indirectement la génération de données test (le hook `useTestDataStats` plante avant/après génération).

### Architecture sous-jacente

`fraud_attempts` n'est pas marquable par un pattern `TEST-%` — elle est rattachée aux contributions via `contribution_id`. Le RPC le sait déjà : il a un bloc spécial FK juste pour ça (`WHERE contribution_id IN (SELECT id FROM cadastral_contributions WHERE parcel_number LIKE 'TEST-%')`). Cette entité n'a donc **rien à faire** dans la boucle générique du registry.

Même logique pour 5 autres entités enfants déjà gérées par blocs FK hardcodés dans le RPC (`ownershipHistory`, `taxHistory`, `boundaryHistory`, `expertisePayments`, et override pour `mortgages`/`buildingPermits`). Les laisser actives dans le registry produit du double-comptage silencieux (override par jsonb concat) et des requêtes inutiles.

### Correction

**Migration SQL — désactiver les 6 entités FK-linked du registry** (le RPC continue de les compter correctement via ses blocs spéciaux) :

```sql
UPDATE public.test_entities_registry
SET is_active = false
WHERE label_key IN (
  'fraudAttempts',       -- corrige l'erreur 42703 (colonne inexistante)
  'ownershipHistory',    -- déjà compté via FK parcel_ids
  'taxHistory',          -- déjà compté via FK parcel_ids
  'boundaryHistory',     -- déjà compté via FK parcel_ids
  'expertisePayments',   -- déjà compté via FK expertise_request_id
  'mortgagePayments'     -- pas de bloc FK dédié, mais marker_column 'payment_receipt_url' fragile (URL ne commence pas par TEST-)
);
```

Restent actives dans la boucle générique du registry : 16 entités avec marker text réel et contrôlé.

**Mise à jour mémoire** (`mem://admin/test-mode-hardening-fr`) : préciser que le registry contient **22 entités au total**, dont **16 actives (boucle générique)** + **6 désactivées volontairement (gérées par blocs FK hardcodés du RPC)**. Justifier la séparation pour éviter une nouvelle régression.

### Vérification post-fix

1. `/admin?tab=test-mode` : plus d'erreur 42703, toast disparaît, carte stats s'affiche complètement.
2. Bouton « Générer données test » → doit fonctionner (le blocage venait du `refresh()` post-génération).
3. Les compteurs `fraudAttempts`, `ownershipHistory`, `taxHistory`, `boundaryHistory`, `expertisePayments`, `mortgagePayments` restent affichés (alimentés par les blocs FK du RPC).
4. CSV export : ces 6 entités ne seront plus dans le CSV pré-purge (acceptable — l'edge `cleanup-test-data-batch` les purge quand même via FK).

### Fichiers impactés

| Fichier | Action |
|---|---|
| Nouvelle migration SQL | `UPDATE test_entities_registry SET is_active=false` sur 6 label_keys |
| `mem://admin/test-mode-hardening-fr` | Documenter la règle "FK-linked entities ≠ registry generic loop" |

### Pourquoi pas d'autre approche

- **Ajouter `reference_number` à `fraud_attempts`** : non, table sécuritaire pas conçue pour markers texte.
- **Modifier le RPC pour skip-on-error** : masquerait de futures dérives ; mieux vaut un registry strictement valide.
- **Supprimer ces lignes du registry** : `is_active=false` est plus prudent (audit trail conservé, rollback facile).

