
# Tests de régression — purge post-paiement (`useCadastralCart`)

## Objectif

Garantir, par une suite de tests automatisés rejouables, que le handler `cadastralPaymentCompleted` ne supprime jamais une parcelle/service ajouté pendant la requête réseau `cadastral_service_access`. L'invariant clé est que le snapshot du panier doit être pris **après** la résolution de la requête (via le callback `setParcelsMap(prev => ...)`), conformément au correctif P0-2 documenté dans `.lovable/plan.md`.

## Périmètre

Hook ciblé : `src/hooks/useCadastralCart.tsx` (effet listener du `cadastralPaymentCompleted`, lignes ~229-269).

Aucun changement de code applicatif. Uniquement de l'outillage de test + spec.

## Mise en place de l'environnement de tests

Aucun harnais Vitest n'existe aujourd'hui. À ajouter :

1. **Dépendances dev** (`package.json`) :
   - `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react-swc`
2. **`vitest.config.ts`** avec `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, alias `@`.
3. **`src/test/setup.ts`** : import `@testing-library/jest-dom`, polyfill `matchMedia`.
4. **`tsconfig.app.json`** : ajouter `"vitest/globals"` aux `types`.
5. **Mock global Supabase** dans `src/test/mocks/supabase.ts` : factory pour `from(...).select(...).eq(...).in(...)` retournant un `Promise` contrôlable, plus `auth.getUser` et `auth.onAuthStateChange`.

## Scénarios de régression

Fichier : `src/hooks/__tests__/useCadastralCart.purge.test.tsx`

Wrapper : composant test consommant `useCadastralCart` via `CadastralCartProvider` ; helpers `addParcel(pn, svcId)` et `firePaymentCompleted()` exposés via boutons.

### Test 1 — Parcelle ajoutée pendant la requête doit survivre (cas nominal du bug)

```text
1. Monter le provider, désactiver le consent OFF (panier vide).
2. addParcel('P-1', 'svc-A')                 → cart = { P-1: [svc-A] }
3. Mock supabase.in(...) renvoie une Promise NON résolue.
4. Dispatch 'cadastralPaymentCompleted'.
5. Pendant que la Promise est en attente :
     addParcel('P-2', 'svc-B')               → cart = { P-1, P-2 }
6. Résoudre la Promise avec
     [{ parcel_number:'P-1', service_type:'svc-A', expires_at:null }]
7. Attendre flush microtâches.
Assertions :
  - parcels contient P-2 avec [svc-B]        ← invariant principal
  - P-1 retirée (svc-A purgé, plus de services)
```

### Test 2 — Service ajouté à une parcelle existante pendant la requête

```text
1. addParcel('P-1', 'svc-A')
2. Dispatch 'cadastralPaymentCompleted' (Promise pendante)
3. addServiceForParcel('P-1', loc, svc-B)
4. Resolve avec ownership svc-A uniquement
Assertions :
  - parcels[P-1].services contient svc-B
  - svc-A retiré
```

### Test 3 — Aucun changement quand rien n'est acheté

```text
1. addParcel('P-1', 'svc-A')
2. Dispatch event ; resolve avec [] (rien possédé)
Assertions :
  - parcelsMap inchangé (référence stable via early-return changed=false)
```

### Test 4 — Erreur réseau ne purge rien

```text
1. addParcel('P-1', 'svc-A')
2. Dispatch event ; resolve avec { error: { message:'boom' }, data: null }
Assertions :
  - parcels inchangé, pas d'exception non capturée
```

### Test 5 — Service expiré ignoré (pas purgé)

```text
1. addParcel('P-1', 'svc-A')
2. Resolve avec [{ parcel_number:'P-1', service_type:'svc-A',
                   expires_at: <hier> }]
Assertions :
  - svc-A toujours présent (expires_at <= now → ignoré)
```

### Test 6 — Utilisateur non authentifié → no-op

```text
1. auth.getUser → { data: { user: null } }
2. addParcel('P-1', 'svc-A') ; dispatch event
Assertions :
  - Aucune requête supabase.from émise
  - parcels inchangé
```

### Test 7 — Panier vide au moment du dispatch → no-op

```text
1. Aucun ajout. Dispatch event.
Assertions :
  - Aucune requête supabase.from émise
```

## Exécution & livrable

- Lancement via le runner Vitest du projet (`bunx vitest run src/hooks/__tests__/useCadastralCart.purge.test.tsx`).
- Sortie attendue : 7 tests verts.
- Documentation : ajouter une note dans `.lovable/memory/features/cadastral-map-architecture-fr.md` (section panier) pointant vers cette suite comme garde-fou anti-régression du snapshot post-purge.

## Détails techniques

- Le test exploite l'observabilité du callback fonctionnel `setParcelsMap(prev => …)` : insérer un `setParcelsMap` synchronisé via `act(...)` entre `dispatchEvent` et la résolution de la Promise mockée garantit que `prev` reflète le panier élargi.
- Le mock Supabase doit retourner un objet chainable où `.in(...)` est la dernière étape qui renvoie la Promise contrôlable (pattern `deferred = { promise, resolve }`).
- `consent` forcé via mock de `CookieManager.getConsentStatus` pour bypass storage.
- Aucun appel réseau réel ; `supabase` du module est mocké via `vi.mock('@/integrations/supabase/client', …)`.

## Fichiers créés / modifiés

- créé `vitest.config.ts`
- créé `src/test/setup.ts`
- créé `src/test/mocks/supabase.ts`
- créé `src/hooks/__tests__/useCadastralCart.purge.test.tsx`
- modifié `package.json` (devDependencies + script `test`)
- modifié `tsconfig.app.json` (`types: ["vitest/globals"]`)
- modifié `.lovable/memory/features/cadastral-map-architecture-fr.md` (note suite de tests)
