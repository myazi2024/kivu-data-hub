

## Diagnostic des erreurs console actuelles

### Verdict : aucune régression liée au module Lotissement

Les deux erreurs visibles sont **indépendantes** des modifications faites sur la gestion admin du Lotissement.

---

### Erreur 1 — `PGRST002 : Could not query the database for the schema cache. Retrying.`

**Origine :** PostgREST (couche API Supabase), pas le code applicatif.

**Cause :** Le cache de schéma de PostgREST est temporairement indisponible. Cela se produit quand :
- Une migration vient d'être appliquée (plusieurs migrations datent de ce jour, dont `20260422141501`) → PostgREST recharge son cache.
- Le projet Supabase redémarre / fait un cold-start.
- Surcharge ponctuelle de l'instance.

**Impact :** `useAuth.fetchProfile` et `useCatalogConfig.loadConfig` échouent pendant quelques secondes, puis se rétablissent automatiquement (le message « Retrying » est normal).

**Action proposée :** Ajouter un **retry exponentiel silencieux** spécifique au code `PGRST002` dans :
- `src/hooks/useAuth.tsx` → `fetchProfile`
- `src/hooks/useCatalogConfig.tsx` → `loadConfig`

Logique : 3 tentatives avec backoff (500ms, 1s, 2s) avant d'afficher l'erreur en console. Cela élimine les faux-positifs visibles par l'utilisateur sans masquer les vraies erreurs.

---

### Erreur 2 — `Failed to fetch dynamically imported module: /src/pages/CadastralMap.tsx`

**Vérifications faites :**
- Le fichier `src/pages/CadastralMap.tsx` **existe bien**.
- Ses imports sont valides (hooks, composants cadastraux, Leaflet).
- Le dev-server Vite tourne sans erreur de compilation (`tail` du log : aucune erreur).
- Le lazy-import dans `App.tsx` (`React.lazy(() => import("./pages/CadastralMap"))`) est syntaxiquement correct.

**Cause probable :** Erreur réseau transitoire entre le navigateur et le HMR Vite — typiquement déclenchée par :
- Le redémarrage Vite vu dans les logs (`[vite] server connection lost. Polling for restart...`).
- Un chunk dont le hash a changé après hot-reload alors que l'utilisateur avait déjà la vieille référence en mémoire.

**Action proposée :** Implémenter un **retry automatique des lazy imports** via un wrapper `lazyWithRetry` :
- Capture les `ChunkLoadError` / `Failed to fetch dynamically imported module`.
- Refait l'import 1 fois après 800ms.
- Si toujours en échec, déclenche un `window.location.reload()` (le user récupère ainsi le nouveau bundle).

Application à toutes les routes lazy de `App.tsx` (Map, CadastralMap, Admin, UserDashboard, etc.).

---

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/lib/lazyWithRetry.ts` *(nouveau)* | Wrapper `React.lazy` avec retry + reload fallback |
| `src/App.tsx` | Remplacer les `React.lazy(...)` par `lazyWithRetry(...)` |
| `src/hooks/useAuth.tsx` | Retry silencieux sur `PGRST002` dans `fetchProfile` |
| `src/hooks/useCatalogConfig.tsx` | Retry silencieux sur `PGRST002` dans `loadConfig` |

### Hors périmètre confirmé
Aucun fichier touché par l'audit Lotissement (`AdminSubdivision*`, `subdivision/requests/*`, `_shared/subdivisionFees.ts`, `sidebarConfig.ts`) n'est impliqué. La structure globale de l'app est saine.

