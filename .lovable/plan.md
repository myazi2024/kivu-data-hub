

# Audit detaille — Erreurs de generation de donnees test (Mode Test Admin)

## 1. Erreur identifiee

L'erreur console est :
```
canceling statement due to statement timeout
at useTestDataActions.ts:90
```

Cette erreur provient de l'appel RPC `cleanup_all_test_data()` qui est invoque dans **3 contextes** :
- **Rollback** lors d'un echec de generation (lignes 155, 167, 178 de `useTestDataActions.ts`)
- **Nettoyage manuel** via le bouton "Nettoyer tout" (ligne 83)
- **Regeneration** via le bouton "Regenerer" (ligne 339)

## 2. Causes racines

### E1 — **Statement timeout sur la RPC `cleanup_all_test_data`** (critique)

La RPC effectue **~20 DELETE sequentiels** sur des tables pouvant contenir 7 000+ enregistrements chacune. Supabase impose un `statement_timeout` par defaut (typiquement 30-60s pour les appels via l'API REST/anon key). Avec 7 020 parcelles + 7 020 contributions + milliers d'enfants FK, le cumul des DELETE depasse ce timeout.

**Facteurs aggravants** :
- Utilisation de `ILIKE 'TEST-%'` sans index dedie → sequential scan sur chaque table
- Sous-requetes imbriquees (`DELETE WHERE contribution_id IN (SELECT id FROM ... WHERE ILIKE)`) → scans multiplies
- `DELETE FROM notifications WHERE title ILIKE '%TEST-%'` → wildcard leading `%` = full table scan garanti
- `metadata->>'test_mode' = 'true'` sur `payment_transactions` → extraction JSON sans index

### E2 — **Generation massive sans batching suffisant** (moyenne)

La generation insere 7 020 parcelles + 7 020 contributions en batchs de 50 (= 140 requetes HTTP sequentielles rien que pour les parcelles). Chaque batch attend la reponse avant le suivant. Sur une connexion lente ou avec le overhead RLS, ca peut prendre plusieurs minutes et risquer un timeout cote client.

### E3 — **Rollback en cascade aggrave le probleme** (moyenne)

Quand une etape echoue (ex: contributions batch N timeout), le code appelle `supabase.rpc('cleanup_all_test_data')` en rollback (lignes 155, 167, 178). Mais cette RPC timeout elle aussi (E1), generant une **seconde erreur** qui masque l'erreur originale. Le rollback echoue silencieusement (`try/catch` avec `console.error`).

### E4 — **Pas de timeout cote client** (basse)

Aucun `AbortController` ou timeout n'est configure sur les appels Supabase. L'utilisateur attend indefiniment jusqu'au timeout serveur.

## 3. Resume des anomalies

```text
#   Severite   Description
E1  Critique   cleanup_all_test_data timeout (pas d'index, ILIKE full scan, 7000+ rows × 20 tables)
E2  Moyenne    Generation sequentielle trop lente (140+ requetes HTTP pour parcelles seules)
E3  Moyenne    Rollback appelle la meme RPC qui timeout → echec en cascade
E4  Basse      Pas de timeout/abort cote client
```

## 4. Plan de correction

### A) Migration SQL — Ajouter des index partiels pour les donnees TEST (corrige E1)

Creer des index partiels sur les colonnes filtrees par `ILIKE 'TEST-%'`. Comme `ILIKE 'TEST-%'` equivaut a `parcel_number LIKE 'TEST-%'` (majuscules deja), on peut utiliser `text_pattern_ops` :

```sql
-- Index partiels pour accelerer cleanup et count
CREATE INDEX IF NOT EXISTS idx_parcels_test ON cadastral_parcels (parcel_number text_pattern_ops) WHERE parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_contributions_test ON cadastral_contributions (parcel_number text_pattern_ops) WHERE parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_invoices_test ON cadastral_invoices (parcel_number text_pattern_ops) WHERE parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_contributor_codes_test ON cadastral_contributor_codes (parcel_number text_pattern_ops) WHERE parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_service_access_test ON cadastral_service_access (parcel_number text_pattern_ops) WHERE parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_title_requests_test ON land_title_requests (reference_number text_pattern_ops) WHERE reference_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_expertise_requests_test ON real_estate_expertise_requests (reference_number text_pattern_ops) WHERE reference_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_disputes_test ON cadastral_land_disputes (parcel_number text_pattern_ops) WHERE parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_boundary_conflicts_test ON cadastral_boundary_conflicts (reporting_parcel_number text_pattern_ops) WHERE reporting_parcel_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_certificates_test ON generated_certificates (reference_number text_pattern_ops) WHERE reference_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_mutations_test ON mutation_requests (reference_number text_pattern_ops) WHERE reference_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_subdivisions_test ON subdivision_requests (reference_number text_pattern_ops) WHERE reference_number LIKE 'TEST-%';
CREATE INDEX IF NOT EXISTS idx_payments_test_mode ON payment_transactions ((metadata->>'test_mode')) WHERE metadata->>'test_mode' = 'true';
```

### B) Migration SQL — Remplacer `ILIKE` par `LIKE` dans les RPC (corrige E1)

`ILIKE` empeche l'utilisation des index `text_pattern_ops`. Comme les prefixes TEST sont toujours en majuscules, remplacer `ILIKE 'TEST-%'` par `LIKE 'TEST-%'` dans `cleanup_all_test_data` et `count_test_data_stats`.

Aussi, remplacer `notifications WHERE title ILIKE '%TEST-%'` par `WHERE title LIKE '%TEST-%'` (ou mieux: `WHERE title LIKE 'TEST-%'` si possible, sinon accepter le full scan sur une petite table).

### C) Migration SQL — Augmenter le `statement_timeout` dans la RPC (corrige E1)

Ajouter `SET statement_timeout = '120s'` a la declaration de la fonction pour eviter le timeout par defaut :

```sql
CREATE OR REPLACE FUNCTION public.cleanup_all_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$ ... $$;
```

### D) Frontend — Augmenter le batch size de 50 a 200 (corrige E2)

Dans `testDataGenerators.ts`, augmenter les batchs d'insertion de 50 a 200 pour reduire le nombre de requetes HTTP de 140+ a ~35 pour les parcelles.

### E) Frontend — Remplacer le rollback par un noop ou un message (corrige E3)

Dans `useTestDataActions.ts`, supprimer les appels `supabase.rpc('cleanup_all_test_data')` dans les blocs catch intermediaires (lignes 155, 167, 178). A la place, afficher un toast avec "Generation partielle — utilisez Nettoyer pour supprimer les donnees incompletes".

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| Migration SQL | Index partiels + LIKE au lieu de ILIKE + statement_timeout sur RPC |
| `src/components/admin/test-mode/testDataGenerators.ts` | Batch size 50 → 200 |
| `src/components/admin/test-mode/useTestDataActions.ts` | Supprimer rollback auto, toast informatif |

**Impact** : 1 migration SQL (~50 lignes), ~15 lignes modifiees dans 2 fichiers TypeScript.

