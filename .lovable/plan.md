

## Audit — Liens « Mode test » dans l'admin

### État actuel

Deux liens proposés dans `AdminTestMode.tsx` (lignes 211–228) et `TestModeGuide.tsx` (lignes 31–43) :

| Lien | URL cible | Composant rendu |
|---|---|---|
| 📊 Analytics / Données foncières (test) | `/test/map` | `<Map />` |
| 🗺️ Carte cadastrale (test) | `/test/cadastral-map` | `<CadastralMap />` |

### Anomalies détectées

#### 🔴 Incohérence d'accès — `/test/map` vs `/map`

`src/App.tsx` :
- `/map` (prod) est protégée par **`<LandDataAccessGate>`** (rôles métier requis).
- `/test/map` (test) est protégée par **`<ProtectedRoute requiredRoles={['admin','super_admin']}>`** seulement.

Conséquence : les deux routes rendent le même composant `<Map />`, mais avec des contrôles d'accès différents. C'est cohérent (admin/super_admin ont accès partout), donc OK. **Pas un bug.**

#### 🟠 Lien `<a href>` au lieu de `<Link>`
Les deux liens utilisent `<a href="/test/...">` avec `target="_blank"`. Cela force un **rechargement complet** de l'app au lieu d'une navigation SPA. Effets :
- Perte de l'état React (cache TanStack Query, contexte test, etc. — mais re-créés via `TestEnvironmentProvider`).
- Délai d'ouverture (rebuild Vite, reload bundles).
- Acceptable car `target="_blank"` ouvre un nouvel onglet (impossible avec `<Link>` sans astuce).

**Pas un bug bloquant**, mais le `target="_blank"` est délibéré pour garder l'admin ouvert. ✅

#### 🟡 Doublon de liens (admin)
Les mêmes deux liens existent **aux deux endroits** :
- `AdminTestMode.tsx` (en-tête de la carte « Mode Test Global », visible **uniquement si `isTestModeActive`**)
- `TestModeGuide.tsx` (toujours visible dans le guide)

Comportement divergent :
- Dans `AdminTestMode`, les liens disparaissent quand le mode test est désactivé.
- Dans `TestModeGuide`, ils restent affichés en permanence → un admin peut cliquer alors que le mode test est OFF, atterrir sur `/test/map` qui rendra des graphiques **vides** (les données TEST-% ont été purgées ou jamais générées).

#### 🟡 `/test/map` trompeur quand mode test est OFF
La route `/test/map` rend `<Map />` qui appelle `useLandDataAnalytics(isTestRoute)`. Sur route `/test/*`, le hook filtre `parcel_number ilike 'TEST-%'`. Si aucune donnée TEST n'existe (cas actuel : 0 enregistrements), tous les graphiques affichent **0**. L'admin pense que les analytics sont cassés.

**Aucun garde-fou** : aucune bannière n'indique « Mode test OFF — générez des données via le bouton ci-contre ».

#### 🟡 Bannière `TestEnvironmentBanner`
Montée globalement dans `App.tsx`. Vérification : s'affiche bien sur `/test/*` indépendamment de `test_mode.enabled` (le provider détecte la route, pas la config). C'est **cohérent** : la bannière distingue test/prod par URL, pas par flag.

### Synthèse

| Sévérité | Constat |
|---|---|
| 🟢 OK | Routes définies, composants protégés (admin/super_admin), bannière test active |
| 🟡 UX | Pas de garde-fou si données TEST absentes — l'admin voit des dashboards à 0 sans explication |
| 🟡 Doublon | Liens en double dans `AdminTestMode` + `TestModeGuide`, comportements de visibilité divergents |
| 🟢 Sécurité | Aucune fuite : routes test bloquées au public et aux non-admins |

### Recommandations (à valider)

1. **Empty state explicite** sur `/test/*` quand 0 données TEST :
   - Détecter via `useTestDataStats` (déjà disponible en admin).
   - Afficher une bannière contextuelle « Aucune donnée test — [Générer maintenant] » au-dessus de `<Map />` si `isTestRoute && totalTestRecords === 0 && isAdmin`.
2. **Unifier l'affichage des liens** : retirer le doublon de `TestModeGuide.tsx` (garder uniquement dans `AdminTestMode.tsx`), OU rendre les deux blocs conditionnels à `isTestModeActive`.
3. **Cohérence a11y** : les deux liens utilisent un emoji comme icône — les remplacer par `lucide-react` (`BarChart3`, `Map`) pour le focus ring + lecteur d'écran.
4. **Audit URL** : aucune référence cassée, mais ajouter un test e2e simple « clic admin → onglet ouvert avec bannière test » serait utile à terme.

Aucune correction n'est appliquée sans validation explicite.

