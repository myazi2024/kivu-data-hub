

# Test global front-end ↔ back-end — Diagnostic et orientations

## Résultat du diagnostic

### 1. Edge Functions — CORS incohérent (BUG ACTIF)

Deux Edge Functions utilisent un en-tête CORS **incomplet** :

| Edge Function | CORS `Allow-Headers` | Statut |
|---|---|---|
| `create-payment` | `authorization, x-client-info, apikey, content-type` | **Incomplet** — manque les headers `x-supabase-client-platform*` |
| `process-mobile-money-payment` | idem | **Incomplet** |
| `cleanup-test-data` | Complet (inclut `x-supabase-client-platform*`) | OK |
| `test-payment-provider` | Complet | OK |

Les versions récentes du SDK Supabase envoient automatiquement les headers `x-supabase-client-platform`, `x-supabase-client-platform-version`, etc. Si le navigateur envoie ces headers non déclarés dans le preflight, **la requête CORS échoue silencieusement** sur certains navigateurs.

### 2. Edge Function `test-payment-provider` — absente du `config.toml`

La nouvelle Edge Function `test-payment-provider` n'est pas déclarée dans `supabase/config.toml`. Sans `[functions.test-payment-provider]`, `verify_jwt` est `true` par défaut, ce qui bloque les appels depuis le frontend si le token n'est pas passé correctement.

### 3. API Deno — styles de serveur incohérents

| Edge Function | Serveur | Statut |
|---|---|---|
| `create-payment` | `serve()` (std) | Ancien |
| `process-mobile-money-payment` | `serve()` (std) | Ancien |
| `stripe-webhook` | `serve()` (std) | Ancien |
| `cleanup-test-data` | `Deno.serve()` | Moderne |
| `test-payment-provider` | `Deno.serve()` | Moderne |

`Deno.serve()` est la méthode native recommandée. Les anciennes fonctions importent `serve` depuis `deno.land/std` avec des versions variées (`0.168.0`, `0.190.0`).

### 4. Edge Function `stripe-webhook` — pas de CORS du tout

C'est correct pour un webhook (appel serveur-to-serveur), mais l'absence de gestion OPTIONS signifie qu'un appel accidentel depuis le frontend retournera une erreur non informative.

### 5. `create-payment` — utilise `SUPABASE_ANON_KEY` au lieu de `SERVICE_ROLE_KEY`

La fonction `create-payment` crée un client Supabase avec `SUPABASE_ANON_KEY` pour la validation initiale de l'utilisateur, puis crée un **second** client avec `SERVICE_ROLE_KEY` pour les opérations admin plus loin dans le code. Cela crée une duplication et un risque : le premier client est soumis aux RLS, ce qui peut faire échouer des requêtes silencieusement.

### 6. Pas de validation d'entrée structurée (Zod)

Aucune Edge Function n'utilise de validation d'entrée structurée. Le body JSON est parsé et utilisé directement avec un minimum de vérifications manuelles.

---

## Orientations et améliorations proposées

### Priorité haute — Corrections de bugs

1. **Harmoniser les CORS** : Mettre à jour `create-payment` et `process-mobile-money-payment` pour utiliser les mêmes headers CORS complets que `cleanup-test-data` et `test-payment-provider`.

2. **Ajouter `test-payment-provider` à `config.toml`** : Déclarer `[functions.test-payment-provider]` avec `verify_jwt = false`.

### Priorité moyenne — Cohérence technique

3. **Migrer vers `Deno.serve()`** : Convertir `create-payment`, `process-mobile-money-payment` et `stripe-webhook` pour utiliser `Deno.serve()` natif au lieu de `serve()` importé, et supprimer les imports `deno.land/std`.

4. **Client Supabase unique dans `create-payment`** : Utiliser `SERVICE_ROLE_KEY` dès le début (comme `process-mobile-money-payment`), avec validation manuelle du JWT via `supabase.auth.getUser(token)`.

5. **Ajouter la validation Zod** dans les Edge Functions `create-payment` et `process-mobile-money-payment` pour valider le body JSON à l'entrée.

### Priorité basse — Améliorations

6. **Endpoint de health-check dédié** : Créer une Edge Function `health-check` légère (retourne `{ ok: true, timestamp }`) au lieu de détourner `cleanup-test-data` avec `dry_run: true` dans `AdminSystemHealth`.

7. **Enrichir `AdminSystemHealth`** : Ajouter le test de chaque Edge Function individuellement (pas seulement `cleanup-test-data`) et afficher le statut Realtime (WebSocket).

8. **Unifier les versions des dépendances esm.sh** : `@supabase/supabase-js` est importé en `@2`, `@2.38.4`, et `@2.45.0` selon les fonctions. Aligner sur une seule version.

## Fichiers impactés

| Action | Fichier |
|---|---|
| Modifié | `supabase/functions/create-payment/index.ts` — CORS, Deno.serve, client unique, Zod |
| Modifié | `supabase/functions/process-mobile-money-payment/index.ts` — CORS, Deno.serve, Zod |
| Modifié | `supabase/functions/stripe-webhook/index.ts` — Deno.serve, version esm.sh |
| Modifié | `supabase/config.toml` — Ajouter `test-payment-provider` |
| Créé | `supabase/functions/health-check/index.ts` — Endpoint de health-check léger |
| Modifié | `src/components/admin/AdminSystemHealth.tsx` — Utiliser `health-check` au lieu de `cleanup-test-data` |

