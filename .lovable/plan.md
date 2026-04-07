

# Audit detaille — Mode Test (Admin > Systeme)

## A. Fuite de donnees test dans les analytics (tables FK)

Le filtre `TEST_FILTER_COLUMN` dans `useLandDataAnalytics.tsx` exclut les TEST-% uniquement pour les tables ayant une colonne directe prefixee. Les tables liees par FK ne sont **pas filtrees** :

| # | Table | Colonne FK | Filtre TEST-% ? | Impact |
|---|-------|------------|------------------|--------|
| 1 | `cadastral_building_permits` | `parcel_id` | NON | Permis test visibles en production |
| 2 | `cadastral_tax_history` | `parcel_id` | NON | Historique taxes test visible |
| 3 | `cadastral_mortgages` | `parcel_id` | NON | Hypotheques test visibles |
| 4 | `cadastral_ownership_history` | `parcel_id` | NON | Historique propriete test visible |
| 5 | `fraud_attempts` | `contribution_id` | NON | Fraudes test visibles |

Ces 5 tables sont enrichies ensuite via `enrich()` qui fait un lookup par `parcel_id`, mais l'enrichissement n'exclut pas — il ajoute des champs geo. Les donnees test passent dans les graphiques de production.

**Solution** : Apres le `fetchAll` et l'enrichissement, filtrer les resultats enrichis : exclure les rows dont le `parcel_number` (obtenu via enrichissement) matche `TEST-%`. Ou bien ajouter un filtre post-fetch sur ces tables.

## B. Cron de nettoyage automatique casse

| # | Probleme |
|---|----------|
| 6 | **Cron utilise anon key** — Le cron `cleanup-test-data-daily` appelle l'Edge Function `cleanup-test-data` avec le Bearer token anon. L'Edge Function verifie le role admin via `getClaims()` + `user_roles`. Un token anon n'a pas de `sub` valide, donc la verification echoue systematiquement avec 401/403. Le nettoyage automatique ne fonctionne **jamais**. |
| 7 | **Edge Function redondante** — La RPC `cleanup_all_test_data()` fait le meme travail cote SQL, avec verification de role integree. L'Edge Function est un doublon inutile. |
| 8 | **`test_data_retention_days` ignore** — Le parametre est affiche dans l'UI et sauvegarde en config, mais la RPC `cleanup_all_test_data()` supprime **tout** sans condition de date. L'Edge Function utilise ce parametre mais elle ne s'execute jamais (point 6). |

**Solution** : Remplacer le cron par un appel direct a la RPC SQL (via `net.http_post` vers une nouvelle RPC ou directement `SELECT cleanup_all_test_data()`). Ajouter un parametre de retention a la RPC. Supprimer l'Edge Function devenue inutile.

## C. Rollback fragile (`.in()` avec 7 020 elements)

| # | Probleme |
|---|----------|
| 9 | **`rollbackTestData` utilise `.in('parcel_number', parcelNumbers)`** avec un tableau de 7 020 elements. Supabase convertit `.in()` en parametres URL, ce qui depasse la limite d'URI (~8 KB). Le rollback echouera silencieusement sur les grosses generations. |

**Solution** : Remplacer le rollback client-side par un appel a la RPC `cleanup_all_test_data()` qui fonctionne cote serveur sans limite d'URI.

## D. Generateur — donnees manquantes ou incoherentes

| # | Probleme | Generateur |
|---|----------|------------|
| 10 | **`generateTaxHistory` — statuts non normalises** — Genere `'paid'` et `'unpaid'` mais `TaxesBlock.statusNorm()` attend aussi `'payé'`, `'en_attente'`, `'pending'`. Distribution deteinte. | `generateTaxHistory` |
| 11 | **`generateMortgages` — statuts non normalises** — Genere `'Active'` et `'Soldée'` (majuscules) mais `MortgagesBlock.statusNorm()` normalise avec `.toLowerCase()` — OK pour `includes()` mais le label affiche sera la version normalisee, pas l'originale. Incoherence mineure. | `generateMortgages` |
| 12 | **`generateBuildingPermits` — pas de `permit_type`** — Le bloc `BuildingPermitsBlock` deduit le type via une heuristique sur `permit_number`. Le generateur cree des numeros `TEST-PC-...` qui seront tous classes "Construction" (pas de "reg" dans le numero). Aucune regularisation generee. | `generateBuildingPermits` |
| 13 | **`generateInvoices` — `geographical_zone` pas enrichie uniformement** — La formule `Math.floor(i / (selectedParcels.length / PROVINCES.length))` peut produire des zones disproportionnees ou `undefined` si la division n'est pas exacte. | `generateInvoices` |
| 14 | **`generateContributions` — status force a `'pending'` puis update** — Insert avec `status: 'pending'`, puis update en batch vers le status final. Si l'update echoue silencieusement (pas de `.throwOnError()`), toutes les contributions restent `'pending'`. | `generateContributions` |

## E. UI/UX — problemes d'experience

| # | Probleme |
|---|----------|
| 15 | **Pas de temps estime** — La generation de 7 020 parcelles + entites prend 30-60 secondes. Aucune estimation de temps affichee. |
| 16 | **Pas de log d'historique** — L'admin ne voit pas l'historique des generations/nettoyages precedents. Les actions sont logguees dans `audit_logs` mais pas exposees dans l'UI. |
| 17 | **Progression non persistee** — Si l'admin quitte la page pendant la generation, la progression est perdue. Pas de reprise possible. |
| 18 | **Pas de generation selective** — L'admin ne peut pas choisir quelles tables generer (ex: "seulement les parcelles et contributions"). C'est tout ou rien. |
| 19 | **Guide mentionne le cron** — Le guide dit "necessite un cron configure dans Supabase" mais le cron est casse (point 6). Information trompeuse. |

## F. Securite

| # | Probleme |
|---|----------|
| 20 | **`cleanup_all_test_data()` — `SECURITY DEFINER` sans restrictions** — La RPC utilise `has_role(auth.uid(), 'admin')` ce qui est correct, mais elle est appelee via le client Supabase sans rate limiting. Un admin pourrait l'appeler en boucle. Risque faible. |
| 21 | **Edge Function expose le anon key dans la migration** — Le fichier SQL de migration contient le anon key en clair. Ce n'est pas un secret (c'est la publishable key), mais c'est une mauvaise pratique dans un fichier versionne. |

---

## Plan de corrections

### Priorite 1 — Filtrage des tables FK dans les analytics

**Fichier** : `src/hooks/useLandDataAnalytics.tsx`
- Apres l'enrichissement, ajouter un filtre post-fetch pour les 5 tables FK : exclure les rows dont le `parcel_number` enrichi ou le `province` trace vers un parcel `TEST-%`
- Ou plus simplement : dans `fetchAll`, pour les tables sans `TEST_FILTER_COLUMN`, faire un JOIN cote requete avec les parcels non-test

Approche recommandee : ajouter une fonction `excludeTestEnriched(records)` qui filtre les rows ayant un `parcel_id` lie a un parcel TEST-% (en utilisant le `byId` map deja construit).

### Priorite 2 — Corriger le cron de nettoyage

**Option A (recommandee)** : Remplacer le cron `net.http_post` par un appel SQL direct :
```sql
SELECT cron.schedule('cleanup-test-data-daily', '0 3 * * *', $$
  SELECT public.cleanup_all_test_data();
$$);
```
Cela necessite que le cron s'execute sous un role avec auth.uid() — il faudra modifier la RPC pour accepter un mode "cron" sans verification de role, ou utiliser `SET ROLE`.

**Option B** : Modifier la RPC pour ajouter un parametre `retention_days` et ne supprimer que les donnees plus anciennes que ce delai.

### Priorite 3 — Remplacer le rollback client par la RPC

**Fichier** : `src/components/admin/test-mode/useTestDataActions.ts`
- Dans `generateTestData`, en cas d'erreur aux etapes critiques (parcelles, contributions), appeler `supabase.rpc('cleanup_all_test_data')` au lieu de `rollbackTestData(parcelNumbers, suffix)`.

**Fichier** : `src/components/admin/test-mode/testDataGenerators.ts`
- Supprimer ou deprecier la fonction `rollbackTestData`.

### Priorite 4 — Corriger les generateurs

**Fichier** : `src/components/admin/test-mode/testDataGenerators.ts`
- `generateTaxHistory` : ajouter les variantes `'payé'`, `'en_attente'` dans le cycle de statuts
- `generateBuildingPermits` : ajouter `permit_number` avec "régul" pour ~30% des permis pour generer des regularisations
- `generateContributions` : ajouter `.throwOnError()` apres les updates de statut en batch

### Priorite 5 — Mettre a jour le guide

**Fichier** : `src/components/admin/test-mode/TestModeGuide.tsx`
- Corriger la mention du cron pour refleter l'etat reel
- Ajouter l'information sur le nombre approximatif de donnees generees par table

**Impact total** : ~50 lignes modifiees dans 4 fichiers + 1 migration SQL.

